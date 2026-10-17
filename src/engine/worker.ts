/// <reference lib="webworker" />
import { uret } from './uretim';
import type { UretimIstegi } from './tipler';

self.onmessage = (e: MessageEvent<{ no: number; istek: UretimIstegi }>) => {
  const { no, istek } = e.data;
  try {
    self.postMessage({ no, sonuc: uret(istek) });
  } catch (hata) {
    self.postMessage({ no, hata: String(hata) });
  }
};
