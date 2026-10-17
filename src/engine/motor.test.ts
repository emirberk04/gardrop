import { describe, expect, it } from 'vitest';
import { BOS_ZEVK } from '../db/db';
import type { Desen, Kategori, Seviye } from '../db/types';
import { hexToLab, renkAdlandir } from '../lib/renk';
import { hedefSicaklik } from './havaUyumu';
import type { MotorBaglami, Parca } from './tipler';
import { uret } from './uretim';
import { kalibrasyonUygula, sinyalUygula } from './zevk';

let n = 0;
function parca(kategori: Kategori, tur: string, hex: string, o: Partial<Parca> = {}): Parca {
  const lab = hexToLab(hex);
  const ad = renkAdlandir(lab);
  return {
    id: `p${++n}`,
    eklendi: Date.now() - 30 * 864e5,
    kategori,
    tur,
    renkler: [{ hex, lab, pay: 1 }],
    renkAdi: ad.ad,
    notr: ad.notr,
    desen: 'duz' as Desen,
    formalite: 2 as Seviye,
    sicaklik: 2 as Seviye,
    mevsim: [],
    kesim: 'normal',
    suGecirmez: false,
    giyilmeSayisi: 0,
    sonGiyilme: Date.now() - 3 * 864e5,
    durum: 'aktif',
    elleDuzeltildi: false,
    ...o,
  };
}

const baglam = (o: Partial<MotorBaglami> = {}): MotorBaglami => ({
  hava: { hissedilen: 18, yagmur: 10, ruzgar: 10 },
  havaFiltresi: true,
  hassasiyet: 0,
  ortam: 'gunluk',
  zevk: BOS_ZEVK,
  sonGiyilenler: [],
  simdi: Date.now(),
  ...o,
});

describe('hedef sıcaklık', () => {
  it('soğudukça artar, üşüyen için yukarı kayar', () => {
    expect(hedefSicaklik(5).merkez).toBeGreaterThan(hedefSicaklik(15).merkez);
    expect(hedefSicaklik(15).merkez).toBeGreaterThan(hedefSicaklik(27).merkez);
    expect(hedefSicaklik(15, -2).merkez).toBeGreaterThan(hedefSicaklik(15, 0).merkez);
  });
});

describe('kombin üretimi', () => {
  it('formalite farkı 1den büyük kombin oluşmaz', () => {
    const ps = [
      parca('ust', 'gömlek', '#f4f4f2', { formalite: 5 }),
      parca('alt', 'kot', '#1f2a44', { formalite: 2, sicaklik: 3 }),
      parca('ayakkabi', 'spor ayakkabı', '#f4f4f2', { formalite: 1 }),
    ];
    const s = uret({ parcalar: ps, baglam: baglam({ havaFiltresi: false }) });
    expect(s.kombinler).toHaveLength(0);
    expect(s.eksik).toBeTruthy();
  });

  it('eksik kategoriyi söyler', () => {
    const s = uret({ parcalar: [parca('ust', 'tişört', '#f4f4f2')], baglam: baglam() });
    expect(s.eksik).toContain('bir alt');
    expect(s.eksik).toContain('bir ayakkabı');
  });

  it('nötr + tek vurgu, iki parlak renkten önde', () => {
    const ps = [
      parca('ust', 'tişört', '#c2262e'), // kırmızı
      parca('ust', 'tişört', '#f4f4f2'), // beyaz
      parca('alt', 'kot', '#2aa3a3'), // turkuaz
      parca('alt', 'kot', '#1f2a44'), // lacivert
      parca('ayakkabi', 'sneaker', '#f4f4f2'),
    ];
    const s = uret({ parcalar: ps, baglam: baglam({ havaFiltresi: false }) });
    const ilk = s.kombinler[0];
    const parlakIkili = s.kombinler.find((k) => k.parcalar.includes(ps[0].id) && k.parcalar.includes(ps[2].id))!;
    expect(ilk.parcalar).not.toEqual(parlakIkili.parcalar);
    expect(parlakIkili).toBe(s.kombinler[s.kombinler.length - 1]);
  });

  it('iki desen birlikte öne çıkmaz', () => {
    const ps = [
      parca('ust', 'gömlek', '#f4f4f2', { desen: 'ekose' }),
      parca('ust', 'gömlek', '#1f2a44'),
      parca('alt', 'kot', '#4a6385', { desen: 'cizgili' }),
      parca('alt', 'chino', '#cdb895'),
      parca('ayakkabi', 'sneaker', '#f4f4f2'),
    ];
    const s = uret({ parcalar: ps, baglam: baglam({ havaFiltresi: false }) });
    const ikiDesen = s.kombinler.findIndex((k) => k.parcalar.includes(ps[0].id) && k.parcalar.includes(ps[2].id));
    expect(ikiDesen).toBe(s.kombinler.length - 1);
  });

  it('"Bir daha gösterme" çifti tekrar gelmez', () => {
    const ust = parca('ust', 'tişört', '#f4f4f2');
    const alt = parca('alt', 'kot', '#1f2a44');
    const ps = [ust, alt, parca('alt', 'chino', '#cdb895'), parca('ayakkabi', 'sneaker', '#f4f4f2')];
    const once = uret({ parcalar: ps, baglam: baglam({ havaFiltresi: false }) });
    const asla = once.kombinler.find((k) => k.parcalar.includes(ust.id) && k.parcalar.includes(alt.id))!;
    const zevk = sinyalUygula(BOS_ZEVK, ps.filter((p) => asla.parcalar.includes(p.id)), 'asla');
    const sonra = uret({ parcalar: ps, baglam: baglam({ havaFiltresi: false, zevk }) });
    expect(sonra.kombinler.some((k) => k.parcalar.includes(ust.id) && k.parcalar.includes(alt.id))).toBe(false);
    expect(sonra.kombinler.length).toBeGreaterThan(0);
  });

  it('soğukta mont, sıcakta montsuz', () => {
    const ps = [
      parca('ust', 'tişört', '#f4f4f2', { sicaklik: 1 }),
      parca('ust', 'kazak', '#8a8d91', { sicaklik: 4 }),
      parca('alt', 'kot', '#1f2a44', { sicaklik: 3 }),
      parca('ayakkabi', 'bot', '#5c4130'),
      parca('dis', 'mont', '#1c1c1e', { sicaklik: 4 }),
    ];
    const mont = ps[4].id;
    const soguk = uret({ parcalar: ps, baglam: baglam({ hava: { hissedilen: 4, yagmur: 0, ruzgar: 5 } }) });
    expect(soguk.kombinler.length).toBeGreaterThan(0);
    expect(soguk.kombinler.every((k) => k.parcalar.includes(mont))).toBe(true);
    const sicak = uret({ parcalar: ps, baglam: baglam({ hava: { hissedilen: 28, yagmur: 0, ruzgar: 5 } }) });
    expect(sicak.kombinler.length).toBeGreaterThan(0);
    expect(sicak.kombinler.some((k) => k.parcalar.includes(mont))).toBe(false);
  });

  it('yağmurda su geçirmez ayakkabı öne geçer', () => {
    const ps = [
      parca('ust', 'kazak', '#8a8d91', { sicaklik: 4 }),
      parca('alt', 'kot', '#4a6385', { sicaklik: 3 }),
      parca('ayakkabi', 'sneaker', '#f4f4f2'),
      parca('ayakkabi', 'bot', '#5c4130', { suGecirmez: true, formalite: 3 }),
      parca('dis', 'mont', '#1f2a44', { sicaklik: 4 }),
    ];
    const s = uret({ parcalar: ps, baglam: baglam({ hava: { hissedilen: 2, yagmur: 70, ruzgar: 20 } }) });
    expect(s.kombinler[0].parcalar).toContain(ps[3].id);
  });

  it('odak: sadece yeni parçayı içeren kombinler', () => {
    const ps = [
      parca('ust', 'tişört', '#f4f4f2'),
      parca('ust', 'tişört', '#8a8d91'),
      parca('alt', 'kot', '#1f2a44', { sicaklik: 3 }),
      parca('ayakkabi', 'sneaker', '#f4f4f2'),
    ];
    const s = uret({ parcalar: ps, baglam: baglam({ havaFiltresi: false }), odak: ps[1].id });
    expect(s.kombinler.length).toBe(1);
    expect(s.kombinler[0].parcalar).toContain(ps[1].id);
  });

  it('arşivdeki parça yeni kombinlerde çıkmaz', () => {
    const ps = [
      parca('ust', 'tişört', '#f4f4f2', { durum: 'arsiv' }),
      parca('alt', 'kot', '#1f2a44'),
      parca('ayakkabi', 'sneaker', '#f4f4f2'),
    ];
    expect(uret({ parcalar: ps, baglam: baglam({ havaFiltresi: false }) }).kombinler).toHaveLength(0);
  });

  it('1920 adayı 300 ms altında skorlar ve ilk 12de aynı üst en fazla 3 kez', () => {
    const renkler = ['#f4f4f2', '#1f2a44', '#8a8d91', '#cdb895', '#1c1c1e', '#5c4130', '#2f5fa8', '#6f6b45', '#c2262e', '#a8d8c0'];
    const ps: Parca[] = [];
    for (let i = 0; i < 10; i++) ps.push(parca('ust', i % 2 ? 'gömlek' : 'tişört', renkler[i], { formalite: (2 + (i % 2)) as Seviye }));
    for (let i = 0; i < 8; i++) ps.push(parca('alt', 'kot', renkler[(i + 3) % 10], { sicaklik: 3, formalite: 2 }));
    for (let i = 0; i < 6; i++) ps.push(parca('ayakkabi', 'sneaker', renkler[i], { formalite: (2 + (i % 2)) as Seviye }));
    for (let i = 0; i < 4; i++) ps.push(parca('dis', 'ceket', renkler[i + 4], { formalite: 3 }));
    const t0 = performance.now();
    const s = uret({ parcalar: ps, baglam: baglam({ havaFiltresi: false }) });
    const sure = performance.now() - t0;
    expect(s.toplamAday).toBe(10 * 8 * 6 * 5);
    expect(sure).toBeLessThan(300);
    const sayim = new Map<string, number>();
    for (const k of s.kombinler.slice(0, 12)) {
      const u = k.parcalar.find((id) => ps.find((p) => p.id === id)!.kategori === 'ust')!;
      sayim.set(u, (sayim.get(u) ?? 0) + 1);
    }
    expect(Math.max(...sayim.values())).toBeLessThanOrEqual(3);
  });
});

describe('aksesuar', () => {
  it('soğukta bere eklenir, sıcakta eklenmez', () => {
    const ps = [
      parca('ust', 'kazak', '#8a8d91', { sicaklik: 4 }),
      parca('alt', 'kot', '#1f2a44', { sicaklik: 3 }),
      parca('ayakkabi', 'bot', '#5c4130'),
      parca('dis', 'mont', '#1c1c1e', { sicaklik: 4 }),
      parca('aksesuar', 'bere', '#1c1c1e', { sicaklik: 4, mevsim: ['kis'] }),
    ];
    const bere = ps[4].id;
    const soguk = uret({ parcalar: ps, baglam: baglam({ hava: { hissedilen: 3, yagmur: 0, ruzgar: 5 } }) });
    expect(soguk.kombinler[0].parcalar).toContain(bere);
    const ilik = uret({ parcalar: ps, baglam: baglam({ hava: { hissedilen: 12, yagmur: 0, ruzgar: 5 } }) });
    expect(ilik.kombinler.some((k) => k.parcalar.includes(bere))).toBe(false);
  });
});

describe('zevk profili', () => {
  it('hareketli ortalama ile öğrenir, Kaydet skoru yükseltir', () => {
    const ps = [
      parca('ust', 'tişört', '#f4f4f2'),
      parca('ust', 'tişört', '#8a8d91'),
      parca('alt', 'kot', '#1f2a44', { sicaklik: 3 }),
      parca('ayakkabi', 'sneaker', '#f4f4f2'),
    ];
    const b = baglam({ havaFiltresi: false });
    const once = uret({ parcalar: ps, baglam: b }).kombinler.find((k) => k.parcalar.includes(ps[1].id))!;
    let zevk = BOS_ZEVK;
    for (let i = 0; i < 5; i++) zevk = sinyalUygula(zevk, [ps[1], ps[2], ps[3]], 'giyecegim');
    const sonra = uret({ parcalar: ps, baglam: { ...b, zevk } }).kombinler.find((k) => k.parcalar.includes(ps[1].id))!;
    expect(sonra.skor).toBeGreaterThan(once.skor);
    expect(zevk.parcaCifti[[ps[1].id, ps[2].id].sort().join('|')]).toBeLessThan(3);
  });
});

describe('kalibrasyon', () => {
  it('beğenilen renk ve tür çiftleri başlangıç ağırlığı alır, parça çiftine dokunmaz', () => {
    const begen = [parca('ust', 'gömlek', '#f4f4f2'), parca('alt', 'chino', '#1f2a44')];
    const begenme = [parca('ust', 'kapüşonlu', '#e07a2e'), parca('alt', 'kargo pantolon', '#2f5fa8')];
    const z = kalibrasyonUygula(BOS_ZEVK, [
      { parcalar: begen, uyar: true },
      { parcalar: begenme, uyar: false },
    ]);
    expect(z.turCifti['chino|gömlek']).toBeGreaterThan(0);
    expect(z.turCifti['kapüşonlu|kargo pantolon']).toBeLessThan(0);
    expect(Object.keys(z.parcaCifti)).toHaveLength(0);
    expect(z.formaliteTercihi).toBe(2);
  });
});
