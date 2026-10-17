import type { Desen, Kategori, Kesim, Mevsim, Seviye } from '../db/types';
import { blobToDataUrl } from './gorsel';

export type AiEtiket = {
  kategori: Kategori;
  tur: string;
  desen: Desen;
  formalite: Seviye;
  sicaklik: Seviye;
  mevsim: Mevsim[];
  kesim: Kesim;
  suGecirmez: boolean;
};

/**
 * Kesit görseli ara sunucuya gönder (worker/). API anahtarı uygulamada değil sunucuda.
 * Sunucu ayarlanmamışsa null döner, alanlar tür kataloğundan dolar.
 */
export async function aiEtiketle(sunucu: string, kesit: Blob): Promise<AiEtiket | null> {
  if (!sunucu) return null;
  const gorsel = await blobToDataUrl(kesit);
  const r = await fetch(sunucu.replace(/\/$/, '') + '/etiketle', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ gorsel }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error('Etiketleme başarısız');
  return (await r.json()) as AiEtiket;
}
