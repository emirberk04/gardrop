import { baskinRenkler } from './renk';
import type { Renk } from '../db/types';

const MAKS = 600;

function blobToBitmap(blob: Blob) {
  return createImageBitmap(blob, { imageOrientation: 'from-image' });
}

function canvasToBlob(canvas: HTMLCanvasElement, tur = 'image/webp', kalite = 0.82) {
  return new Promise<Blob>((coz, red) =>
    canvas.toBlob((b) => (b ? coz(b) : red(new Error('Görsel kodlanamadı'))), tur, kalite),
  );
}

/** En uzun kenarı 600px olacak şekilde küçült, WebP'ye çevir. */
export async function kucult(dosya: Blob, maks = MAKS): Promise<Blob> {
  const bmp = await blobToBitmap(dosya);
  const oran = Math.min(1, maks / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * oran);
  c.height = Math.round(bmp.height * oran);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  return canvasToBlob(c);
}

/**
 * Arka planı cihazda sil (@imgly/background-removal). Model ilk kullanımda iner,
 * sonra önbellekten çalışır. Başarısız olursa null döner, çağıran orijinali kullanır.
 */
export async function arkaPlanSil(foto: Blob): Promise<Blob | null> {
  try {
    const { removeBackground } = await import('@imgly/background-removal');
    const sonuc = await removeBackground(foto, {
      model: 'isnet_quint8',
      output: { format: 'image/png' },
    });
    return await kirpVeKucult(sonuc);
  } catch (e) {
    console.warn('Arka plan silinemedi', e);
    return null;
  }
}

/** Saydam kenarları kırp, 600px'e küçült, WebP (saydamlıklı) kaydet. */
async function kirpVeKucult(blob: Blob): Promise<Blob> {
  const bmp = await blobToBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 <= x0 || y1 <= y0) return blob;
  const pay = 8;
  x0 = Math.max(0, x0 - pay); y0 = Math.max(0, y0 - pay);
  x1 = Math.min(width - 1, x1 + pay); y1 = Math.min(height - 1, y1 + pay);
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const oran = Math.min(1, MAKS / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.round(w * oran);
  out.height = Math.round(h * oran);
  out.getContext('2d')!.drawImage(c, x0, y0, w, h, 0, 0, out.width, out.height);
  return canvasToBlob(out, 'image/webp', 0.85);
}

/**
 * Kesitten baskın renkleri çıkar. Saydamlık yoksa (arka plan silinemediyse)
 * merkezdeki bölgeye bakılır, kenarlardaki zemin rengini almamak için.
 */
export async function renkCikar(kesit: Blob, saydam: boolean): Promise<Renk[]> {
  const bmp = await blobToBitmap(kesit);
  const boy = 120;
  const oran = boy / Math.max(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * oran));
  c.height = Math.max(1, Math.round(bmp.height * oran));
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  if (saydam) return baskinRenkler(ctx.getImageData(0, 0, c.width, c.height).data);
  const x = Math.floor(c.width * 0.25), y = Math.floor(c.height * 0.25);
  return baskinRenkler(ctx.getImageData(x, y, Math.ceil(c.width / 2), Math.ceil(c.height / 2)).data);
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((coz, red) => {
    const r = new FileReader();
    r.onload = () => coz(r.result as string);
    r.onerror = () => red(r.error);
    r.readAsDataURL(blob);
  });
}

export async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

// Aynı parça için tekrar tekrar object URL üretmemek için önbellek.
const urlOnbellek = new Map<string, { blob: Blob; url: string }>();

export function parcaUrl(anahtar: string, blob: Blob): string {
  const var_ = urlOnbellek.get(anahtar);
  if (var_ && var_.blob.size === blob.size && var_.blob.type === blob.type) return var_.url;
  if (var_) URL.revokeObjectURL(var_.url);
  const url = URL.createObjectURL(blob);
  urlOnbellek.set(anahtar, { blob, url });
  return url;
}
