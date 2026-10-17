import { deltaE, lch, tonFarki } from '../lib/renk';
import type { Parca } from './tipler';

export type RenkSonucu = { puan: number; abarti: boolean; aciklama: string };

const anaRenk = (p: Parca) => p.renkler[0];

/** Bölüm 7.3: nötr ağırlıklı + en fazla 1 vurgu en şık ve güvenli. */
export function renkUyumu(parcalar: Parca[]): RenkSonucu {
  const giysiler = parcalar.filter((p) => p.kategori !== 'aksesuar' && anaRenk(p));
  if (giysiler.length < 2) return { puan: 0.7, abarti: false, aciklama: '' };

  const vurgular = giysiler.filter((p) => !p.notr);
  const parlak = vurgular.filter((p) => lch(anaRenk(p).lab).C > 40);
  const adlar = [...new Set(giysiler.map((p) => p.renkAdi))];

  let puan: number;
  let aciklama: string;

  if (vurgular.length === 0) {
    puan = 0.9;
    aciklama = `${adlarListesi(adlar)} nötr uyum`;
  } else if (vurgular.length === 1) {
    puan = 0.95;
    aciklama = `Nötrler üzerine tek vurgu: ${vurgular[0].renkAdi}`;
  } else {
    const tonlar = vurgular.map((p) => lch(anaRenk(p).lab));
    let enBuyukFark = 0;
    for (let i = 0; i < tonlar.length; i++)
      for (let j = i + 1; j < tonlar.length; j++)
        enBuyukFark = Math.max(enBuyukFark, tonFarki(tonlar[i].h, tonlar[j].h));
    if (enBuyukFark < 20) {
      puan = 0.85;
      aciklama = 'Tek renk ailesi, farklı tonlar';
    } else if (enBuyukFark < 50) {
      puan = 0.72;
      aciklama = 'Birbirine yakın renkler';
    } else if (enBuyukFark > 150) {
      puan = 0.6;
      aciklama = 'Karşıt renkler';
    } else {
      puan = 0.45;
      aciklama = 'Renkler birbirinden uzak';
    }
    if (parlak.length >= 2) {
      puan = Math.min(puan, 0.3);
      aciklama = 'İki parlak renk birlikte';
    }
  }

  // Kötü "neredeyse eşleşme": iki farklı mavi gibi, aynı olmayan çok yakın tonlar
  const buyukler = giysiler.filter((p) => p.kategori !== 'ayakkabi');
  for (let i = 0; i < buyukler.length; i++) {
    for (let j = i + 1; j < buyukler.length; j++) {
      const a = anaRenk(buyukler[i]).lab, b = anaRenk(buyukler[j]).lab;
      const d = deltaE(a, b);
      const ca = lch(a), cb = lch(b);
      if (d > 5 && d < 16 && ca.C > 12 && cb.C > 12 && tonFarki(ca.h, cb.h) < 25) {
        puan = Math.min(puan, 0.4);
        aciklama = 'Birbirine çok yakın ama aynı olmayan tonlar';
      }
    }
  }

  // Açık-koyu dengesi bonusu
  const ust = giysiler.find((p) => p.kategori === 'ust' || p.kategori === 'tek_parca');
  const alt = giysiler.find((p) => p.kategori === 'alt');
  if (ust && alt && Math.abs(anaRenk(ust).lab[0] - anaRenk(alt).lab[0]) > 25) {
    puan = Math.min(1, puan + 0.07);
  }

  return { puan, abarti: parlak.length >= 2, aciklama };
}

function adlarListesi(adlar: string[]) {
  const b = adlar.map((a, i) => (i === 0 ? a.charAt(0).toLocaleUpperCase('tr') + a.slice(1) : a));
  if (b.length <= 1) return b[0] ?? '';
  return b.slice(0, -1).join(', ') + ' ve ' + b[b.length - 1];
}
