import type { Lab, Renk } from '../db/types';

// sRGB → CIELAB (D65)
export function rgbToLab(r: number, g: number, b: number): Lab {
  const lin = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function hexToLab(hex: string): Lab {
  return rgbToLab(...hexToRgb(hex));
}

export function deltaE(a: Lab, b: Lab) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** LCh: açıklık, doygunluk (chroma), ton açısı (derece). */
export function lch(lab: Lab) {
  const C = Math.hypot(lab[1], lab[2]);
  let h = (Math.atan2(lab[2], lab[1]) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L: lab[0], C, h };
}

export function tonFarki(h1: number, h2: number) {
  const d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
}

type Adlandirma = { ad: string; hex: string; notr: boolean };

// Türkçe renk adları. Nötrler bölüm 7.3'teki listeden.
export const RENK_ADLARI: Adlandirma[] = [
  { ad: 'siyah', hex: '#1c1c1e', notr: true },
  { ad: 'antrasit', hex: '#3a3d41', notr: true },
  { ad: 'gri', hex: '#8a8d91', notr: true },
  { ad: 'açık gri', hex: '#c7c9cc', notr: true },
  { ad: 'beyaz', hex: '#f4f4f2', notr: true },
  { ad: 'krem', hex: '#ede4d0', notr: true },
  { ad: 'bej', hex: '#cdb895', notr: true },
  { ad: 'taş', hex: '#a99c86', notr: true },
  { ad: 'kahve', hex: '#5c4130', notr: true },
  { ad: 'camel', hex: '#b0804f', notr: true },
  { ad: 'haki', hex: '#6f6b45', notr: true },
  { ad: 'lacivert', hex: '#1f2a44', notr: true },
  { ad: 'mavi', hex: '#2f5fa8', notr: false },
  { ad: 'açık mavi', hex: '#8fb4dc', notr: false },
  { ad: 'denim', hex: '#4a6385', notr: true },
  { ad: 'turkuaz', hex: '#2aa3a3', notr: false },
  { ad: 'yeşil', hex: '#2f7a3f', notr: false },
  { ad: 'zeytin', hex: '#556b2f', notr: false },
  { ad: 'mint', hex: '#a8d8c0', notr: false },
  { ad: 'sarı', hex: '#e6c229', notr: false },
  { ad: 'hardal', hex: '#c49a26', notr: false },
  { ad: 'turuncu', hex: '#e07a2e', notr: false },
  { ad: 'kiremit', hex: '#a8502f', notr: false },
  { ad: 'kırmızı', hex: '#c2262e', notr: false },
  { ad: 'bordo', hex: '#6b1f2a', notr: false },
  { ad: 'pembe', hex: '#e79ab4', notr: false },
  { ad: 'mor', hex: '#6a3d8f', notr: false },
  { ad: 'lila', hex: '#b9a3d6', notr: false },
];

const ADLAR_LAB = RENK_ADLARI.map((r) => ({ ...r, lab: hexToLab(r.hex) }));

export function renkAdlandir(lab: Lab): { ad: string; notr: boolean } {
  let en = ADLAR_LAB[0];
  let enD = Infinity;
  for (const r of ADLAR_LAB) {
    const d = deltaE(lab, r.lab);
    if (d < enD) {
      enD = d;
      en = r;
    }
  }
  return { ad: en.ad, notr: en.notr };
}

export function renkAdindanHex(ad: string) {
  return RENK_ADLARI.find((r) => r.ad === ad)?.hex ?? '#888888';
}

/**
 * Saydam olmayan piksellerden k-means ile baskın 1-3 renk.
 * `veri` RGBA dizisi (canvas getImageData).
 */
export function baskinRenkler(veri: Uint8ClampedArray, k = 3): Renk[] {
  const noktalar: Lab[] = [];
  const rgb: [number, number, number][] = [];
  const adim = Math.max(1, Math.floor(veri.length / 4 / 4000)); // ~4000 örnek yeter
  for (let i = 0; i < veri.length; i += 4 * adim) {
    if (veri[i + 3] < 200) continue;
    rgb.push([veri[i], veri[i + 1], veri[i + 2]]);
    noktalar.push(rgbToLab(veri[i], veri[i + 1], veri[i + 2]));
  }
  if (noktalar.length === 0) return [];

  // Belirleyici başlangıç: açıklığa göre sıralayıp eşit aralıklı seç
  const sirali = noktalar.map((_, i) => i).sort((a, b) => noktalar[a][0] - noktalar[b][0]);
  let merkezler: Lab[] = Array.from({ length: k }, (_, j) => {
    const idx = sirali[Math.floor(((j + 0.5) / k) * sirali.length)];
    return [...noktalar[idx]] as Lab;
  });
  const atama = new Int32Array(noktalar.length);

  for (let tur = 0; tur < 12; tur++) {
    for (let i = 0; i < noktalar.length; i++) {
      let en = 0, enD = Infinity;
      for (let j = 0; j < k; j++) {
        const d = deltaE(noktalar[i], merkezler[j]);
        if (d < enD) { enD = d; en = j; }
      }
      atama[i] = en;
    }
    const top = merkezler.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < noktalar.length; i++) {
      const t = top[atama[i]];
      t[0] += noktalar[i][0]; t[1] += noktalar[i][1]; t[2] += noktalar[i][2]; t[3]++;
    }
    merkezler = top.map((t, j) => (t[3] ? [t[0] / t[3], t[1] / t[3], t[2] / t[3]] : merkezler[j]) as Lab);
  }

  const kumeler = merkezler.map((lab, j) => {
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < noktalar.length; i++) {
      if (atama[i] !== j) continue;
      r += rgb[i][0]; g += rgb[i][1]; b += rgb[i][2]; n++;
    }
    return { lab, n, hex: n ? rgbToHex(r / n, g / n, b / n) : '#000000' };
  });

  // Birbirine çok yakın kümeleri birleştir, küçükleri at
  const sonuc: Renk[] = [];
  for (const kume of kumeler.sort((a, b) => b.n - a.n)) {
    const pay = kume.n / noktalar.length;
    if (pay < 0.08) continue;
    const yakin = sonuc.find((s) => deltaE(s.lab, kume.lab) < 10);
    if (yakin) yakin.pay += pay;
    else sonuc.push({ hex: kume.hex, lab: kume.lab.map((v) => Math.round(v * 10) / 10) as Lab, pay });
  }
  return sonuc.map((s) => ({ ...s, pay: Math.round(s.pay * 100) / 100 }));
}
