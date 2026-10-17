import { useSyncExternalStore } from 'react';
import { ayarlariAl } from '../db/db';
import type { Renk } from '../db/types';
import { aiEtiketle, type AiEtiket } from './etiket';
import { arkaPlanSil, kucult, renkCikar } from './gorsel';
import { yeniId } from './util';

// Seri ekleme: fotoğraflar arka planda işlenir, sen sıradakini çekmeye devam edersin (bölüm 4.3).

export type KuyrukOgesi = {
  id: string;
  durum: 'isleniyor' | 'hazir';
  adim: string;
  foto?: Blob;
  kesit?: Blob;
  saydam: boolean;
  renkler: Renk[];
  etiket: AiEtiket | null;
  etiketHatasi: boolean;
};

let ogeler: KuyrukOgesi[] = [];
const dinleyiciler = new Set<() => void>();
const yay = () => dinleyiciler.forEach((d) => d());

function guncelle(id: string, d: Partial<KuyrukOgesi>) {
  ogeler = ogeler.map((o) => (o.id === id ? { ...o, ...d } : o));
  yay();
}

// Arka plan silme modeli ağır; parçaları sırayla işle.
let zincir: Promise<void> = Promise.resolve();

export function kuyrugaEkle(dosyalar: File[]) {
  for (const dosya of dosyalar) {
    const id = yeniId();
    ogeler = [
      ...ogeler,
      { id, durum: 'isleniyor', adim: 'Küçültülüyor', saydam: false, renkler: [], etiket: null, etiketHatasi: false },
    ];
    zincir = zincir.then(() => isle(id, dosya));
  }
  yay();
}

async function isle(id: string, dosya: File) {
  try {
    const foto = await kucult(dosya);
    guncelle(id, { foto, adim: 'Arka plan siliniyor' });
    const silinmis = await arkaPlanSil(foto);
    const kesit = silinmis ?? foto;
    guncelle(id, { kesit, saydam: !!silinmis, adim: 'Renkler çıkarılıyor' });
    const renkler = await renkCikar(kesit, !!silinmis);
    guncelle(id, { renkler, adim: 'Etiketleniyor' });
    await etiketle(id);
  } catch (e) {
    console.error(e);
    guncelle(id, { durum: 'hazir', etiketHatasi: true });
  }
}

export async function etiketle(id: string) {
  const o = ogeler.find((x) => x.id === id);
  if (!o?.kesit) return;
  const { etiketSunucusu } = await ayarlariAl();
  try {
    const etiket = await aiEtiketle(etiketSunucusu, o.kesit);
    guncelle(id, { etiket, etiketHatasi: false, durum: 'hazir', adim: '' });
  } catch {
    // Etiketleme başarısız: parça yine kaydedilir, alanlar elle doldurulur
    guncelle(id, { etiketHatasi: true, durum: 'hazir', adim: '' });
  }
}

export function kuyruktanCikar(id: string) {
  ogeler = ogeler.filter((o) => o.id !== id);
  yay();
}

function abone(d: () => void) {
  dinleyiciler.add(d);
  return () => dinleyiciler.delete(d);
}

export function useKuyruk() {
  return useSyncExternalStore(abone, () => ogeler);
}

// Yeni parça eklenince Dolap'ta gösterilen bildirim için
let sonEklenen: string | null = null;
const sonDinleyici = new Set<() => void>();
export function sonEkleneniAyarla(id: string | null) {
  sonEklenen = id;
  sonDinleyici.forEach((d) => d());
}
export function useSonEklenen() {
  return useSyncExternalStore(
    (d) => {
      sonDinleyici.add(d);
      return () => sonDinleyici.delete(d);
    },
    () => sonEklenen,
  );
}
