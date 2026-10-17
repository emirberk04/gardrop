import type { Ayarlar, Hava } from '../db/types';

export type HavaDurumu = {
  hava: Hava; // kombin motoru için gün içi temsil
  sicaklik: number; // şu anki gerçek sıcaklık (gösterim)
  kod: number; // WMO hava kodu
  zaman: number;
  eski: boolean; // önbellekten mi geldi
};

/** Open-Meteo: ücretsiz, anahtarsız (bölüm 7.4). */
export async function havaGetir(sehir: Ayarlar['sehir']): Promise<Omit<HavaDurumu, 'eski'>> {
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.searchParams.set('latitude', String(sehir.enlem));
  u.searchParams.set('longitude', String(sehir.boylam));
  u.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m');
  u.searchParams.set('daily', 'apparent_temperature_max,apparent_temperature_min,precipitation_probability_max');
  u.searchParams.set('timezone', 'auto');
  u.searchParams.set('forecast_days', '1');
  const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('Hava alınamadı');
  const j = await r.json();
  const simdi = j.current.apparent_temperature as number;
  const maks = j.daily.apparent_temperature_max[0] as number;
  const min = j.daily.apparent_temperature_min[0] as number;
  // Gün boyu dışarıdayken hissedilen: şu an ile günün ortalamasının karışımı
  const hissedilen = Math.round(0.5 * simdi + 0.5 * ((maks + min) / 2));
  return {
    hava: {
      hissedilen,
      yagmur: (j.daily.precipitation_probability_max[0] as number) ?? 0,
      ruzgar: Math.round(j.current.wind_speed_10m as number),
    },
    sicaklik: Math.round(j.current.temperature_2m as number),
    kod: j.current.weather_code as number,
    zaman: Date.now(),
  };
}

export type SehirSonucu = { ad: string; bolge: string; enlem: number; boylam: number };

export async function sehirAra(ad: string): Promise<SehirSonucu[]> {
  const u = new URL('https://geocoding-api.open-meteo.com/v1/search');
  u.searchParams.set('name', ad);
  u.searchParams.set('count', '6');
  u.searchParams.set('language', 'tr');
  const r = await fetch(u);
  if (!r.ok) return [];
  const j = await r.json();
  return (j.results ?? []).map((s: any) => ({
    ad: s.name,
    bolge: [s.admin1, s.country].filter(Boolean).join(', '),
    enlem: s.latitude,
    boylam: s.longitude,
  }));
}

export function havaSimgesi(kod: number) {
  if (kod === 0) return '☀';
  if (kod <= 2) return '⛅';
  if (kod === 3 || kod === 45 || kod === 48) return '☁';
  if (kod >= 71 && kod <= 77) return '❄';
  if (kod >= 95) return '⛈';
  return '☂';
}

export function havaAciklama(kod: number) {
  if (kod === 0) return 'açık';
  if (kod <= 2) return 'parçalı bulutlu';
  if (kod === 3) return 'bulutlu';
  if (kod === 45 || kod === 48) return 'sisli';
  if (kod >= 51 && kod <= 57) return 'çisenti';
  if (kod >= 61 && kod <= 67) return 'yağmurlu';
  if (kod >= 71 && kod <= 77) return 'karlı';
  if (kod >= 80 && kod <= 82) return 'sağanak';
  if (kod >= 85 && kod <= 86) return 'kar sağanağı';
  if (kod >= 95) return 'fırtına';
  return '';
}
