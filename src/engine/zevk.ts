import type { ZevkProfili } from '../db/types';
import type { Parca } from './tipler';

/** Bölüm 3.2: dokunuşların zevk profiline etkisi. */
export const SINYAL = { giyecegim: 3, kaydet: 2, bakti: 0.5, gec: -1, asla: -5 } as const;
export type SinyalTuru = keyof typeof SINYAL;

export const ciftAnahtari = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
export const kombinAnahtari = (ids: string[]) => [...ids].sort().join('+');

export function ciftler(parcalar: Parca[]): [Parca, Parca][] {
  const g = parcalar.filter((p) => p.kategori !== 'aksesuar');
  const sonuc: [Parca, Parca][] = [];
  for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) sonuc.push([g[i], g[j]]);
  return sonuc;
}

/** "Bir daha gösterme" ile yasaklanacak çekirdek çift: üst+alt ya da tek parça+ayakkabı. */
export function cekirdekCift(parcalar: Parca[]): string | null {
  const ust = parcalar.find((p) => p.kategori === 'ust' || p.kategori === 'tek_parca');
  const ikinci =
    ust?.kategori === 'tek_parca'
      ? parcalar.find((p) => p.kategori === 'ayakkabi')
      : parcalar.find((p) => p.kategori === 'alt');
  return ust && ikinci ? ciftAnahtari(ust.id, ikinci.id) : null;
}

const ema = (eski: number | undefined, sinyal: number) => (eski ?? 0) * 0.9 + sinyal * 0.1;

/** Hareketli ortalama: yeni = eski × 0.9 + sinyal × 0.1. Tek kötü gün profili bozmaz. */
export function sinyalUygula(profil: ZevkProfili, parcalar: Parca[], tur: SinyalTuru, simdi = Date.now()): ZevkProfili {
  const s = SINYAL[tur];
  const p: ZevkProfili = {
    ...profil,
    renkCifti: { ...profil.renkCifti },
    turCifti: { ...profil.turCifti },
    parcaCifti: { ...profil.parcaCifti },
    yasak: [...profil.yasak],
    guncellendi: simdi,
  };
  for (const [a, b] of ciftler(parcalar)) {
    const pk = ciftAnahtari(a.id, b.id);
    p.parcaCifti[pk] = tur === 'asla' ? SINYAL.asla : ema(p.parcaCifti[pk], s);
    const tk = ciftAnahtari(a.tur, b.tur);
    p.turCifti[tk] = ema(p.turCifti[tk], s);
    if (a.renkAdi && b.renkAdi) {
      const rk = ciftAnahtari(a.renkAdi, b.renkAdi);
      p.renkCifti[rk] = ema(p.renkCifti[rk], s);
    }
  }
  if (tur === 'asla') {
    const c = cekirdekCift(parcalar);
    if (c && !p.yasak.includes(c)) p.yasak.push(c);
  }
  if (s > 0) {
    const g = parcalar.filter((x) => x.kategori !== 'aksesuar');
    const ort = g.reduce((t, x) => t + x.formalite, 0) / Math.max(1, g.length);
    p.formaliteTercihi = profil.formaliteTercihi ? profil.formaliteTercihi * 0.9 + ort * 0.1 : ort;
  }
  return p;
}

/**
 * Kişisel zevk 0-1. Somut parça çifti en güçlü, sonra tür ve renk örüntüleri.
 * Böylece yeni bir parça, benzerlerinin geçmişinden hazır puan alır.
 */
export function kisiselZevk(profil: ZevkProfili, parcalar: Parca[]) {
  const cs = ciftler(parcalar);
  if (cs.length === 0) return { puan: 0.5, ham: 0 };
  let top = 0;
  for (const [a, b] of cs) {
    const pc = profil.parcaCifti[ciftAnahtari(a.id, b.id)] ?? 0;
    const tc = profil.turCifti[ciftAnahtari(a.tur, b.tur)] ?? 0;
    const rc = a.renkAdi && b.renkAdi ? profil.renkCifti[ciftAnahtari(a.renkAdi, b.renkAdi)] ?? 0 : 0;
    top += 0.5 * pc + 0.3 * tc + 0.2 * rc;
  }
  const ham = top / cs.length;
  return { puan: 0.5 + Math.tanh(ham) * 0.5, ham };
}
