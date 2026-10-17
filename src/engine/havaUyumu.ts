import type { Hava, Mevsim } from '../db/types';
import { clamp } from '../lib/util';
import type { Parca } from './tipler';

/**
 * Bölüm 7.4 tablosunun sürekli hali: hissedilen sıcaklığa göre hedef toplam sıcaklık puanı.
 * Hassasiyet: -2 (üşüyen) hedefi yukarı, +2 (sıcak tutan) aşağı kaydırır.
 */
const NOKTALAR: [number, number][] = [
  [30, 1.5], [22.5, 2.5], [16.5, 4], [10.5, 6], [3.5, 8.5], [-5, 10],
];

export function hedefSicaklik(hissedilen: number, hassasiyet = 0) {
  let merkez: number;
  if (hissedilen >= NOKTALAR[0][0]) merkez = NOKTALAR[0][1];
  else if (hissedilen <= NOKTALAR[NOKTALAR.length - 1][0]) merkez = NOKTALAR[NOKTALAR.length - 1][1];
  else {
    let i = 0;
    while (hissedilen < NOKTALAR[i + 1][0]) i++;
    const [t0, v0] = NOKTALAR[i], [t1, v1] = NOKTALAR[i + 1];
    merkez = v0 + ((hissedilen - t0) / (t1 - t0)) * (v1 - v0);
  }
  merkez -= hassasiyet * 0.75;
  return { min: merkez - 1, max: merkez + 1, merkez };
}

/** Katmanların toplam sıcaklığı: üst ve dış tam, alt yarım sayılır. */
export function toplamSicaklik(parcalar: Parca[]) {
  let t = 0;
  for (const p of parcalar) {
    if (p.kategori === 'ust' || p.kategori === 'dis') t += p.sicaklik;
    else if (p.kategori === 'tek_parca') t += p.sicaklik * 1.2;
    else if (p.kategori === 'alt') t += p.sicaklik * 0.5;
  }
  return t;
}

export function uygunMevsimler(hissedilen: number): Mevsim[] {
  if (hissedilen >= 24) return ['yaz', 'ilkbahar'];
  if (hissedilen >= 16) return ['ilkbahar', 'sonbahar', 'yaz'];
  if (hissedilen >= 8) return ['ilkbahar', 'sonbahar', 'kis'];
  return ['kis', 'sonbahar'];
}

export function mevsimUygun(p: Parca, hissedilen: number) {
  if (p.mevsim.length === 0) return true;
  const u = uygunMevsimler(hissedilen);
  return p.mevsim.some((m) => u.includes(m));
}

export type HavaSonucu = { puan: number; toplam: number; not: string; disGerekli: boolean };

export function havaUyumu(parcalar: Parca[], hava: Hava, hassasiyet: number): HavaSonucu {
  const hedef = hedefSicaklik(hava.hissedilen, hassasiyet);
  const toplam = toplamSicaklik(parcalar);
  const sapma = toplam < hedef.min ? hedef.min - toplam : toplam > hedef.max ? toplam - hedef.max : 0;
  let puan = 1 - sapma * 0.3;

  const ayakkabi = parcalar.find((p) => p.kategori === 'ayakkabi');
  const dis = parcalar.find((p) => p.kategori === 'dis');
  if (hava.yagmur > 50) {
    if (ayakkabi?.suGecirmez) puan += 0.08;
    else if (ayakkabi && /süet|kanvas|sandalet/.test(ayakkabi.tur)) puan -= 0.15;
    if (dis?.suGecirmez) puan += 0.08;
  }
  if (hava.ruzgar > 30 && dis) puan += 0.04;

  const derece = `${Math.round(hava.hissedilen)}°`;
  let not = `${derece} için uygun`;
  if (sapma > 0) not = toplam < hedef.min ? `${derece} için biraz ince` : `${derece} için biraz kalın`;
  else if (dis && hedef.merkez >= 4.5) not = `${derece} için ${dis.tur} gerekli`;
  if (hava.yagmur > 50 && (ayakkabi?.suGecirmez || dis?.suGecirmez)) not += ', yağmura hazır';

  return { puan: clamp(puan, 0, 1), toplam, not, disGerekli: hedef.merkez >= 5 };
}
