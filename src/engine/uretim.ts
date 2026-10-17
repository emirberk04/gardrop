import type { Ortam } from '../db/types';
import { GUN, clamp, gunOnce } from '../lib/util';
import { havaUyumu, hedefSicaklik, mevsimUygun, toplamSicaklik } from './havaUyumu';
import { renkUyumu } from './renkUyumu';
import type { Gerekce, MotorBaglami, Parca, SkorluKombin, UretimIstegi, UretimSonucu } from './tipler';
import { ciftAnahtari, kisiselZevk, kombinAnahtari } from './zevk';

export const ORTAM_FORMALITE: Record<Ortam, number> = { gunluk: 2, okul: 2, staj: 4, disari: 3, sik: 4.5 };

export const AGIRLIK = { renk: 0.3, formalite: 0.2, hava: 0.2, desen: 0.1, zevk: 0.2 };

export function skorEtiketi(skor: number): SkorluKombin['etiket'] {
  if (skor >= 80) return 'Çok şık';
  if (skor >= 66) return 'Şık';
  return 'Olur';
}

const giysiler = (ps: Parca[]) => ps.filter((p) => p.kategori !== 'aksesuar');

/** Sert eleme (bölüm 7.1). false dönen kombin hiç oluşmaz. */
export function sertElemedenGecer(ps: Parca[], b: MotorBaglami): boolean {
  const g = giysiler(ps);
  const f = g.map((p) => p.formalite);
  if (Math.max(...f) - Math.min(...f) > 1) return false;

  for (let i = 0; i < g.length; i++)
    for (let j = i + 1; j < g.length; j++)
      if (b.zevk.yasak.includes(ciftAnahtari(g[i].id, g[j].id))) return false;

  if (b.havaFiltresi && b.hava) {
    if (!g.every((p) => mevsimUygun(p, b.hava!.hissedilen))) return false;
    const hedef = hedefSicaklik(b.hava.hissedilen, b.hassasiyet);
    const t = toplamSicaklik(g);
    if (t < hedef.min - 1.5 || t > hedef.max + 1.5) return false;
  }
  return true;
}

function desenUyumu(ps: Parca[]) {
  const desenli = giysiler(ps).filter((p) => p.desen !== 'duz');
  if (desenli.length === 0) return { puan: 0.85, cakisma: false };
  if (desenli.length === 1) return { puan: 1, cakisma: false };
  return { puan: desenli.length === 2 ? 0.3 : 0.1, cakisma: true };
}

function formaliteUyumu(ps: Parca[], ortam: Ortam) {
  const f = giysiler(ps).map((p) => p.formalite);
  const fark = Math.max(...f) - Math.min(...f);
  const ort = f.reduce((a, b) => a + b, 0) / f.length;
  const ortamUyum = clamp(1 - Math.abs(ort - ORTAM_FORMALITE[ortam]) / 2.5, 0, 1);
  return 0.6 * (1 - fark * 0.35) + 0.4 * ortamUyum;
}

const kisaTur = (p: Parca) => p.tur;

export function skorla(ps: Parca[], b: MotorBaglami): SkorluKombin {
  const id = kombinAnahtari(ps.map((p) => p.id));
  const gerekceler: Gerekce[] = [];

  const renk = renkUyumu(ps);
  if (renk.aciklama) gerekceler.push({ tur: 'renk', metin: renk.aciklama });

  const form = formaliteUyumu(ps, b.ortam);

  let havaPuan = 0.7;
  let havaNotu = '';
  if (b.hava) {
    const h = havaUyumu(ps, b.hava, b.hassasiyet);
    havaPuan = h.puan;
    havaNotu = h.not;
    gerekceler.push({ tur: 'hava', metin: h.not.charAt(0).toLocaleUpperCase('tr') + h.not.slice(1) });
  }

  const desen = desenUyumu(ps);
  if (desen.cakisma) gerekceler.push({ tur: 'desen', metin: 'İki desen birlikte, biraz kalabalık' });
  else if (desen.puan === 1) gerekceler.push({ tur: 'desen', metin: 'Düz parçalarla tek desen, dengeli' });

  const zevk = kisiselZevk(b.zevk, ps);
  if (zevk.ham > 0.25) gerekceler.push({ tur: 'zevk', metin: 'Benzer kombinleri beğenmiştin' });

  // Yenilik bonusu: uzun süredir giyilmeyen ve yeni eklenen parçalar
  let yenilik = 0;
  let enUzun: { p: Parca; gun: number } | null = null;
  for (const p of giysiler(ps)) {
    const gun = gunOnce(p.sonGiyilme, b.simdi);
    if (gun == null) {
      if (b.simdi - p.eklendi < 7 * GUN) yenilik += 0.03;
      else yenilik += 0.025;
    } else if (gun >= 14) {
      yenilik += Math.min(0.035, gun / 1000);
      if (!enUzun || gun > enUzun.gun) enUzun = { p, gun };
    }
  }
  yenilik = Math.min(0.1, yenilik);
  if (enUzun) gerekceler.push({ tur: 'yenilik', metin: `Bu ${kisaTur(enUzun.p)} ${enUzun.gun} gündür giyilmedi` });

  // Tekrar cezası: son 7 günde aynı kombin ya da aynı üst
  let tekrar = 0;
  if (b.sonGiyilenler.some((g) => g.kombinId === id)) tekrar = 0.15;
  else {
    const ust = ps.find((p) => p.kategori === 'ust' || p.kategori === 'tek_parca');
    const gun = ust ? gunOnce(ust.sonGiyilme, b.simdi) : null;
    if (gun != null && gun < 2) tekrar = 0.1;
    else if (gun != null && gun < 7) tekrar = 0.05;
  }

  // Abartı cezası: iki parlak vurgu ya da iki desen öne çıkmasın (kabul ölçütü)
  const abarti = (renk.abarti ? 0.12 : 0) + (desen.cakisma ? 0.12 : 0);

  const ham =
    AGIRLIK.renk * renk.puan +
    AGIRLIK.formalite * form +
    AGIRLIK.hava * havaPuan +
    AGIRLIK.desen * desen.puan +
    AGIRLIK.zevk * zevk.puan +
    yenilik -
    tekrar -
    abarti;
  const skor = Math.round(clamp(ham, 0, 1) * 100);

  return { id, parcalar: ps.map((p) => p.id), skor, etiket: skorEtiketi(skor), gerekceler, havaNotu };
}

/** Şablonlar: üst+alt+ayakkabı (± dış), tek parça+ayakkabı (± dış). */
export function adaylar(parcalar: Parca[]): Parca[][] {
  const aktif = parcalar.filter((p) => p.durum === 'aktif');
  const k = (kat: Parca['kategori']) => aktif.filter((p) => p.kategori === kat);
  const ust = k('ust'), alt = k('alt'), ayk = k('ayakkabi'), dis = k('dis'), tek = k('tek_parca');
  const disSecenek: (Parca | null)[] = [null, ...dis];
  const sonuc: Parca[][] = [];
  for (const a of ayk) {
    for (const d of disSecenek) {
      for (const u of ust) for (const al of alt) sonuc.push(d ? [d, u, al, a] : [u, al, a]);
      for (const t of tek) sonuc.push(d ? [d, t, a] : [t, a]);
    }
  }
  return sonuc;
}

/** MMR benzeri çeşitlilik: yüksek skorlu ama öncekilere çok benzeyen kombin geriye itilir. */
export function cesitlendir(
  liste: SkorluKombin[],
  harita: Map<string, Parca>,
  ilk = 12,
  ustSiniri = 3,
): SkorluKombin[] {
  const kalan = [...liste].sort((a, b) => b.skor - a.skor);
  const secilen: SkorluKombin[] = [];
  const ustSayisi = new Map<string, number>();
  const ustOf = (k: SkorluKombin) =>
    k.parcalar.find((id) => {
      const kat = harita.get(id)?.kategori;
      return kat === 'ust' || kat === 'tek_parca';
    }) ?? '';

  while (secilen.length < ilk && kalan.length) {
    let enIyi = -1;
    let enDeger = -Infinity;
    for (let i = 0; i < Math.min(kalan.length, 300); i++) {
      const k = kalan[i];
      if ((ustSayisi.get(ustOf(k)) ?? 0) >= ustSiniri) continue;
      let benzerlik = 0;
      for (const s of secilen) {
        const ortak = k.parcalar.filter((id) => s.parcalar.includes(id)).length;
        benzerlik = Math.max(benzerlik, ortak / Math.max(k.parcalar.length, s.parcalar.length));
      }
      const deger = k.skor - 18 * benzerlik;
      if (deger > enDeger) {
        enDeger = deger;
        enIyi = i;
      }
    }
    if (enIyi < 0) break;
    const [k] = kalan.splice(enIyi, 1);
    ustSayisi.set(ustOf(k), (ustSayisi.get(ustOf(k)) ?? 0) + 1);
    secilen.push(k);
  }
  return [...secilen, ...kalan];
}

/** Kombin çıkmadığında somut eksik bilgisi (bölüm 4.6). */
function eksikBul(parcalar: Parca[], b: MotorBaglami): string {
  const aktif = parcalar.filter((p) => p.durum === 'aktif');
  const var_ = (k: Parca['kategori']) => aktif.some((p) => p.kategori === k);
  const eksikler: string[] = [];
  if (!var_('tek_parca')) {
    if (!var_('ust')) eksikler.push('bir üst');
    if (!var_('alt')) eksikler.push('bir alt');
  }
  if (!var_('ayakkabi')) eksikler.push('bir ayakkabı');
  if (eksikler.length) return `Kombin üretmek için ${eksikler.join(', ')} lazım.`;

  if (b.havaFiltresi && b.hava) {
    const hedef = hedefSicaklik(b.hava.hissedilen, b.hassasiyet);
    const enKalin = Math.max(...adaylar(parcalar).map((ps) => toplamSicaklik(ps)));
    if (enKalin < hedef.min - 1.5) return 'Bugünün havasına uygun kombin çıkmadı. Eksik olan: kalın bir üst ya da mont.';
    return 'Bugünün havasına uygun kombin çıkmadı. Eksik olan: ince bir üst.';
  }
  return 'Parçaların formaliteleri birbirine uymuyor. Farklı tarzda bir alt ya da ayakkabı eklemeyi dene.';
}

export function uret({ parcalar, baglam, odak, limit }: UretimIstegi): UretimSonucu {
  const harita = new Map(parcalar.map((p) => [p.id, p]));
  let tum = adaylar(parcalar);
  if (odak) tum = tum.filter((ps) => ps.some((p) => p.id === odak));
  const gecen = tum.filter((ps) => sertElemedenGecer(ps, baglam));
  const skorlu = gecen.map((ps) => skorla(ps, baglam));
  const sirali = cesitlendir(skorlu, harita);
  return {
    kombinler: limit ? sirali.slice(0, limit) : sirali,
    toplamAday: tum.length,
    eksik: sirali.length === 0 ? eksikBul(parcalar, baglam) : null,
  };
}
