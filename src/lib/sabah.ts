import { ayarGuncelle, ayarlariAl, db, zevkAl } from '../db/db';
import { ozet } from '../engine/ozet';
import { uret } from '../engine/uretim';
import { buyukHarf } from './turler';
import { havaAciklama, havaGetir } from './hava';
import { GUN, bugunStr } from './util';

/**
 * Sabah bildirimi içeriği (bölüm 10, v1.0): "Bugün hava soğuk, kombinin hazır".
 * Service worker içinde de çalışır; DOM kullanmaz.
 */
export async function sabahOzeti(): Promise<{ baslik: string; govde: string } | null> {
  const ayarlar = await ayarlariAl();
  let h = ayarlar.sonHava;
  try {
    h = await havaGetir(ayarlar.sehir);
    await ayarGuncelle({ sonHava: h });
  } catch {
    // çevrimdışı: son bilinen hava
  }
  const kiyafetler = await db.kiyafetler.where('durum').equals('aktif').toArray();
  if (kiyafetler.length === 0) return null;
  const gunluk = await db.gunluk.where('tarih').aboveOrEqual(bugunStr(new Date(Date.now() - 7 * GUN))).toArray();
  const sonuc = uret({
    parcalar: kiyafetler.map(ozet),
    baglam: {
      hava: h?.hava ?? null,
      havaFiltresi: ayarlar.havaFiltresi,
      hassasiyet: ayarlar.hassasiyet,
      ortam: ayarlar.ortam,
      zevk: await zevkAl(),
      sonGiyilenler: gunluk.map((g) => ({ kombinId: g.kombinId, tarih: new Date(g.tarih).getTime() })),
      simdi: Date.now(),
    },
    limit: 1,
  });

  const his = h?.hava.hissedilen;
  const durum =
    his == null ? 'Günaydın' : his < 10 ? 'Bugün hava soğuk' : his >= 26 ? 'Bugün hava sıcak' : 'Bugün hava ılık';
  const yagmur = h && h.hava.yagmur >= 50 ? ', yağmur bekleniyor' : '';
  const baslik = h
    ? `${ayarlar.sehir.ad} · ${h.sicaklik}° ${havaAciklama(h.kod)}`
    : 'Bugün ne giysem?';
  const k = sonuc.kombinler[0];
  if (!k) return { baslik, govde: `${durum}${yagmur}. ${sonuc.eksik ?? 'Kombinlerine bak.'}` };
  const harita = new Map(kiyafetler.map((x) => [x.id, x]));
  const parcalar = k.parcalar.map((id) => harita.get(id)).filter((x) => !!x).map((x) => `${x.renkAdi} ${x.tur}`);
  return { baslik, govde: `${durum}${yagmur}, kombinin hazır: ${buyukHarf(parcalar.join(', '))}.` };
}
