import type { Kiyafet } from '../db/types';
import type { Parca, UretimIstegi, UretimSonucu } from './tipler';

// Kombin motoru Web Worker'da çalışır, arayüz donmaz (bölüm 7).
let worker: Worker | null = null;
let sayac = 0;
const bekleyen = new Map<number, { coz: (s: UretimSonucu) => void; red: (e: Error) => void }>();

function al() {
  if (!worker) {
    worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { no, sonuc, hata } = e.data;
      const b = bekleyen.get(no);
      if (!b) return;
      bekleyen.delete(no);
      if (hata) b.red(new Error(hata));
      else b.coz(sonuc);
    };
  }
  return worker;
}

export function kombinUret(istek: UretimIstegi): Promise<UretimSonucu> {
  const no = ++sayac;
  return new Promise((coz, red) => {
    bekleyen.set(no, { coz, red });
    al().postMessage({ no, istek });
  });
}

export function ozet(k: Kiyafet): Parca {
  const { foto: _f, kesit: _k, ...geri } = k;
  return geri;
}
