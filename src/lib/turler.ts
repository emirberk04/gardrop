import type { Desen, Kategori, Kesim, Mevsim, Seviye } from '../db/types';

export type TurTanimi = {
  ad: string;
  kategori: Kategori;
  formalite: Seviye;
  sicaklik: Seviye;
  mevsim: Mevsim[];
  suGecirmez?: boolean;
};

const DORT: Mevsim[] = ['ilkbahar', 'yaz', 'sonbahar', 'kis'];
const SICAK: Mevsim[] = ['ilkbahar', 'yaz'];
const GECIS: Mevsim[] = ['ilkbahar', 'sonbahar'];
const SOGUK: Mevsim[] = ['sonbahar', 'kis'];

// Tür seçilince diğer alanlar buradan önceden dolar. AI etiketleme yoksa bile onay tek dokunuş.
export const TURLER: TurTanimi[] = [
  { ad: 'tişört', kategori: 'ust', formalite: 1, sicaklik: 1, mevsim: SICAK },
  { ad: 'polo', kategori: 'ust', formalite: 2, sicaklik: 1, mevsim: SICAK },
  { ad: 'gömlek', kategori: 'ust', formalite: 3, sicaklik: 2, mevsim: DORT },
  { ad: 'keten gömlek', kategori: 'ust', formalite: 3, sicaklik: 1, mevsim: SICAK },
  { ad: 'oduncu gömlek', kategori: 'ust', formalite: 2, sicaklik: 3, mevsim: SOGUK },
  { ad: 'uzun kollu tişört', kategori: 'ust', formalite: 1, sicaklik: 2, mevsim: GECIS },
  { ad: 'sweatshirt', kategori: 'ust', formalite: 1, sicaklik: 3, mevsim: SOGUK },
  { ad: 'kapüşonlu', kategori: 'ust', formalite: 1, sicaklik: 3, mevsim: SOGUK },
  { ad: 'triko', kategori: 'ust', formalite: 3, sicaklik: 3, mevsim: SOGUK },
  { ad: 'kazak', kategori: 'ust', formalite: 2, sicaklik: 4, mevsim: SOGUK },
  { ad: 'balıkçı yaka', kategori: 'ust', formalite: 3, sicaklik: 4, mevsim: ['kis', 'sonbahar'] },
  { ad: 'hırka', kategori: 'ust', formalite: 2, sicaklik: 3, mevsim: GECIS },
  { ad: 'kot', kategori: 'alt', formalite: 2, sicaklik: 3, mevsim: DORT },
  { ad: 'chino', kategori: 'alt', formalite: 3, sicaklik: 2, mevsim: DORT },
  { ad: 'kumaş pantolon', kategori: 'alt', formalite: 4, sicaklik: 2, mevsim: DORT },
  { ad: 'keten pantolon', kategori: 'alt', formalite: 3, sicaklik: 1, mevsim: SICAK },
  { ad: 'kargo pantolon', kategori: 'alt', formalite: 1, sicaklik: 3, mevsim: DORT },
  { ad: 'eşofman altı', kategori: 'alt', formalite: 1, sicaklik: 3, mevsim: DORT },
  { ad: 'şort', kategori: 'alt', formalite: 1, sicaklik: 1, mevsim: ['yaz'] },
  { ad: 'etek', kategori: 'alt', formalite: 3, sicaklik: 1, mevsim: SICAK },
  { ad: 'ceket', kategori: 'dis', formalite: 4, sicaklik: 2, mevsim: DORT },
  { ad: 'blazer', kategori: 'dis', formalite: 5, sicaklik: 2, mevsim: DORT },
  { ad: 'kot ceket', kategori: 'dis', formalite: 2, sicaklik: 2, mevsim: GECIS },
  { ad: 'deri ceket', kategori: 'dis', formalite: 3, sicaklik: 3, mevsim: GECIS },
  { ad: 'overshirt', kategori: 'dis', formalite: 2, sicaklik: 2, mevsim: GECIS },
  { ad: 'bomber', kategori: 'dis', formalite: 2, sicaklik: 3, mevsim: GECIS },
  { ad: 'yağmurluk', kategori: 'dis', formalite: 2, sicaklik: 2, mevsim: GECIS, suGecirmez: true },
  { ad: 'trençkot', kategori: 'dis', formalite: 4, sicaklik: 3, mevsim: GECIS, suGecirmez: true },
  { ad: 'mont', kategori: 'dis', formalite: 2, sicaklik: 4, mevsim: SOGUK },
  { ad: 'şişme mont', kategori: 'dis', formalite: 1, sicaklik: 5, mevsim: ['kis'] },
  { ad: 'kaban', kategori: 'dis', formalite: 4, sicaklik: 5, mevsim: ['kis', 'sonbahar'] },
  { ad: 'spor ayakkabı', kategori: 'ayakkabi', formalite: 1, sicaklik: 2, mevsim: DORT },
  { ad: 'sneaker', kategori: 'ayakkabi', formalite: 2, sicaklik: 2, mevsim: DORT },
  { ad: 'loafer', kategori: 'ayakkabi', formalite: 4, sicaklik: 2, mevsim: DORT },
  { ad: 'klasik ayakkabı', kategori: 'ayakkabi', formalite: 5, sicaklik: 2, mevsim: DORT },
  { ad: 'bot', kategori: 'ayakkabi', formalite: 3, sicaklik: 4, mevsim: SOGUK, suGecirmez: true },
  { ad: 'süet ayakkabı', kategori: 'ayakkabi', formalite: 3, sicaklik: 2, mevsim: GECIS },
  { ad: 'sandalet', kategori: 'ayakkabi', formalite: 1, sicaklik: 1, mevsim: ['yaz'] },
  { ad: 'elbise', kategori: 'tek_parca', formalite: 3, sicaklik: 2, mevsim: SICAK },
  { ad: 'tulum', kategori: 'tek_parca', formalite: 2, sicaklik: 2, mevsim: SICAK },
  { ad: 'bere', kategori: 'aksesuar', formalite: 1, sicaklik: 4, mevsim: ['kis'] },
  { ad: 'şapka', kategori: 'aksesuar', formalite: 2, sicaklik: 1, mevsim: SICAK },
  { ad: 'atkı', kategori: 'aksesuar', formalite: 3, sicaklik: 4, mevsim: SOGUK },
  { ad: 'kemer', kategori: 'aksesuar', formalite: 3, sicaklik: 1, mevsim: DORT },
];

export const turBul = (ad: string) => TURLER.find((t) => t.ad === ad);

export const KATEGORI_ADI: Record<Kategori, string> = {
  ust: 'Üst',
  alt: 'Alt',
  dis: 'Dış',
  ayakkabi: 'Ayakkabı',
  aksesuar: 'Aksesuar',
  tek_parca: 'Tek parça',
};

export const DESEN_ADI: Record<Desen, string> = {
  duz: 'Düz',
  cizgili: 'Çizgili',
  ekose: 'Ekose',
  desenli: 'Desenli',
  baskili: 'Baskılı',
};

export const MEVSIM_KISA: Record<Mevsim, string> = {
  ilkbahar: 'İlk',
  yaz: 'Yaz',
  sonbahar: 'Son',
  kis: 'Kış',
};

export const KESIM_ADI: Record<Kesim, string> = { dar: 'Dar', normal: 'Normal', bol: 'Bol' };

export const buyukHarf = (s: string) => s.charAt(0).toLocaleUpperCase('tr') + s.slice(1);
