import 'fake-indexeddb/auto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { db } from '../db/db';
import type { Kiyafet } from '../db/types';
import { hexToLab } from './renk';
import { sabahOzeti } from './sabah';

const b = new Blob(['x']);
const k = (id: string, kategori: Kiyafet['kategori'], tur: string, hex: string, renkAdi: string, sicaklik: 1 | 2 | 3 | 4 | 5): Kiyafet => ({
  id, foto: b, kesit: b, eklendi: Date.now(), kategori, tur, renkler: [{ hex, lab: hexToLab(hex), pay: 1 }], renkAdi, notr: true,
  desen: 'duz', formalite: 2, sicaklik, mevsim: [], kesim: 'normal', suGecirmez: false, giyilmeSayisi: 0, sonGiyilme: null,
  durum: 'aktif', elleDuzeltildi: false,
});

describe('sabah bildirimi', () => {
  beforeAll(async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({
      current: { temperature_2m: 4, apparent_temperature: 1, weather_code: 3, wind_speed_10m: 10 },
      daily: { apparent_temperature_max: [6], apparent_temperature_min: [0], precipitation_probability_max: [10] },
    })));
    await db.kiyafetler.bulkAdd([
      k('a', 'ust', 'kazak', '#8a8d91', 'gri', 4),
      k('b', 'alt', 'kot', '#4a6385', 'denim', 3),
      k('c', 'ayakkabi', 'bot', '#5c4130', 'kahve', 4),
      k('d', 'dis', 'mont', '#1f2a44', 'lacivert', 4),
    ]);
  });
  afterAll(() => vi.unstubAllGlobals());

  it('soğuk havada kombini Ankara için özetler', async () => {
    const o = await sabahOzeti();
    expect(o?.baslik).toBe('Ankara · 4° bulutlu');
    expect(o?.govde).toMatch(/^Bugün hava soğuk, kombinin hazır: /);
    expect(o?.govde).toContain('mont');
  });
});
