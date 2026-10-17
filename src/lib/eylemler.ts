import { ayarlariAl, db, zevkAl } from '../db/db';
import type { Hava, Kiyafet, Kombin, KombinDurum } from '../db/types';
import { ozet } from '../engine/motor';
import { sinyalUygula, type SinyalTuru } from '../engine/zevk';
import { bugunStr } from './util';

async function parcalariAl(ids: string[]) {
  return (await db.kiyafetler.bulkGet(ids)).filter((k): k is Kiyafet => !!k);
}

async function kombinYaz(ids: string[], kombinId: string, skor: number, durum: (eski?: KombinDurum) => KombinDurum) {
  const simdi = Date.now();
  const eski = await db.kombinler.get(kombinId);
  const kayit: Kombin = {
    id: kombinId,
    parcalar: ids,
    skor,
    durum: durum(eski?.durum),
    olusturuldu: eski?.olusturuldu ?? simdi,
    guncellendi: simdi,
  };
  await db.kombinler.put(kayit);
}

async function ogren(ids: string[], tur: SinyalTuru) {
  const parcalar = (await parcalariAl(ids)).map(ozet);
  await db.zevk.put(sinyalUygula(await zevkAl(), parcalar, tur));
}

type KombinGirdi = { id: string; parcalar: string[]; skor: number };

/** ✓ Giyeceğim: en güçlü olumlu sinyal (+3), giyme günlüğüne yazılır. */
export async function giyecegim(k: KombinGirdi, hava: Hava | null) {
  await db.transaction('rw', [db.kiyafetler, db.kombinler, db.gunluk, db.zevk, db.ayarlar], async () => {
    const tarih = bugunStr();
    const simdi = Date.now();
    await db.gunluk.add({ tarih, kombinId: k.id, hava: hava ?? { hissedilen: NaN, yagmur: 0, ruzgar: 0 } });
    for (const p of await parcalariAl(k.parcalar)) {
      await db.kiyafetler.update(p.id, { giyilmeSayisi: p.giyilmeSayisi + 1, sonGiyilme: simdi });
    }
    await kombinYaz(k.parcalar, k.id, k.skor, (e) => (e === 'kayitli' ? 'kayitli' : 'giyildi'));
    await ogren(k.parcalar, 'giyecegim');
  });
}

/** Bugünün giyme kaydını geri al ("Değiştir"). Geri bildirim geçmişi silinmez. */
export async function bugunkuGiymeyiGeriAl() {
  const kayitlar = await db.gunluk.where('tarih').equals(bugunStr()).toArray();
  await db.transaction('rw', [db.kiyafetler, db.gunluk], async () => {
    for (const g of kayitlar) {
      for (const id of g.kombinId.split('+')) {
        const p = await db.kiyafetler.get(id);
        if (p) await db.kiyafetler.update(id, { giyilmeSayisi: Math.max(0, p.giyilmeSayisi - 1) });
      }
      if (g.id != null) await db.gunluk.delete(g.id);
    }
  });
}

/** ♡ Kaydet (+2). Tekrar basılırsa kayıttan çıkar. */
export async function kaydetDegistir(k: KombinGirdi) {
  const eski = await db.kombinler.get(k.id);
  if (eski?.durum === 'kayitli') {
    await kombinYaz(k.parcalar, k.id, k.skor, () => 'oneri');
    return false;
  }
  await kombinYaz(k.parcalar, k.id, k.skor, () => 'kayitli');
  await ogren(k.parcalar, 'kaydet');
  return true;
}

/** ✕ Geç (−1): bu sefer değil. Bugün bir daha gösterilmez. */
export async function gec(k: KombinGirdi) {
  await kombinYaz(k.parcalar, k.id, k.skor, (e) => (e === 'kayitli' || e === 'giyildi' ? e : 'reddedildi'));
  await ogren(k.parcalar, 'gec');
}

/** Bir daha gösterme (−5, kalıcı): çekirdek çift yasaklanır. */
export async function birDahaGosterme(k: KombinGirdi) {
  await kombinYaz(k.parcalar, k.id, k.skor, () => 'asla');
  await ogren(k.parcalar, 'asla');
}

/** Silme yerine arşiv: geçmiş kayıtlar bozulmaz, yeni kombinlerde çıkmaz (bölüm 3.5). */
export async function arsivle(id: string, arsiv = true) {
  await db.kiyafetler.update(id, { durum: arsiv ? 'arsiv' : 'aktif' });
}

// ---- Yedekleme (bölüm 9) ----

type YedekParca = Omit<Kiyafet, 'foto' | 'kesit'> & { foto: string; kesit: string };

async function blobToB64(b: Blob) {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return `data:${b.type};base64,${btoa(s)}`;
}

function b64ToBlob(url: string) {
  const [bas, veri] = url.split(',');
  const tur = bas.match(/data:(.*?);/)?.[1] ?? 'application/octet-stream';
  const bin = atob(veri);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: tur });
}

export async function yedekOlustur(): Promise<Blob> {
  const kiyafetler: YedekParca[] = [];
  for (const k of await db.kiyafetler.toArray()) {
    kiyafetler.push({ ...k, foto: await blobToB64(k.foto), kesit: await blobToB64(k.kesit) });
  }
  const yedek = {
    uygulama: 'gardirop',
    surum: 1,
    tarih: new Date().toISOString(),
    kiyafetler,
    kombinler: await db.kombinler.toArray(),
    gunluk: await db.gunluk.toArray(),
    zevk: await db.zevk.toArray(),
    ayarlar: await db.ayarlar.toArray(),
  };
  return new Blob([JSON.stringify(yedek)], { type: 'application/json' });
}

export async function yedekIndir() {
  const blob = await yedekOlustur();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gardirop-yedek-${bugunStr()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  const ayar = await ayarlariAl();
  await db.ayarlar.put({ ...ayar, sonYedek: Date.now() });
}

export async function yedekYukle(dosya: File) {
  const y = JSON.parse(await dosya.text());
  if (y.uygulama !== 'gardirop') throw new Error('Bu dosya bir Gardırop yedeği değil.');
  await db.transaction('rw', [db.kiyafetler, db.kombinler, db.gunluk, db.zevk, db.ayarlar], async () => {
    await Promise.all([db.kiyafetler.clear(), db.kombinler.clear(), db.gunluk.clear(), db.zevk.clear(), db.ayarlar.clear()]);
    await db.kiyafetler.bulkPut(
      (y.kiyafetler as YedekParca[]).map((k) => ({ ...k, foto: b64ToBlob(k.foto), kesit: b64ToBlob(k.kesit) })),
    );
    await db.kombinler.bulkPut(y.kombinler);
    await db.gunluk.bulkPut(y.gunluk);
    await db.zevk.bulkPut(y.zevk);
    await db.ayarlar.bulkPut(y.ayarlar);
  });
}
