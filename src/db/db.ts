import Dexie, { type EntityTable } from 'dexie';
import type { Ayarlar, GiymeKaydi, Kiyafet, Kombin, ZevkProfili } from './types';

export const db = new Dexie('gardirop') as Dexie & {
  kiyafetler: EntityTable<Kiyafet, 'id'>;
  kombinler: EntityTable<Kombin, 'id'>;
  gunluk: EntityTable<GiymeKaydi & { id?: number }, 'id'>;
  zevk: EntityTable<ZevkProfili, 'id'>;
  ayarlar: EntityTable<Ayarlar, 'id'>;
};

db.version(1).stores({
  kiyafetler: 'id, kategori, durum, eklendi, sonGiyilme',
  kombinler: 'id, durum, skor, olusturuldu, *parcalar',
  gunluk: '++id, tarih, kombinId',
  zevk: 'id',
  ayarlar: 'id',
});

export const VARSAYILAN_AYARLAR: Ayarlar = {
  id: 'ben',
  sehir: { ad: 'Konya', enlem: 37.8746, boylam: 32.4932 },
  hassasiyet: 0,
  tema: 'sistem',
  ortam: 'gunluk',
  havaFiltresi: true,
  etiketSunucusu: '',
  kalibrasyonYapildi: false,
};

export const BOS_ZEVK: ZevkProfili = {
  id: 'ben',
  renkCifti: {},
  turCifti: {},
  parcaCifti: {},
  formaliteTercihi: 0,
  yasak: [],
  guncellendi: 0,
};

export async function ayarlariAl(): Promise<Ayarlar> {
  return { ...VARSAYILAN_AYARLAR, ...(await db.ayarlar.get('ben')) };
}

export async function ayarGuncelle(degisiklik: Partial<Omit<Ayarlar, 'id'>>) {
  const simdiki = await ayarlariAl();
  await db.ayarlar.put({ ...simdiki, ...degisiklik });
}

export async function zevkAl(): Promise<ZevkProfili> {
  return { ...BOS_ZEVK, ...(await db.zevk.get('ben')) };
}

/** Tarayıcının veriyi kendiliğinden silmesini engelle (bölüm 3.5). */
export async function kaliciDepolamaIste() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // desteklenmiyorsa sessizce geç
  }
}
