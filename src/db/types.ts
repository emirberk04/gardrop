// Veri modeli: docs/TASARIM.md bölüm 6.

export type Kategori = 'ust' | 'alt' | 'dis' | 'ayakkabi' | 'aksesuar' | 'tek_parca';
export type Desen = 'duz' | 'cizgili' | 'ekose' | 'desenli' | 'baskili';
export type Mevsim = 'ilkbahar' | 'yaz' | 'sonbahar' | 'kis';
export type Kesim = 'dar' | 'normal' | 'bol';
export type Seviye = 1 | 2 | 3 | 4 | 5;
export type Lab = [number, number, number];

export type Renk = { hex: string; lab: Lab; pay: number };

export type Kiyafet = {
  id: string;
  foto: Blob; // orijinal (küçültülmüş, WebP)
  kesit: Blob; // arka planı silinmiş hali
  eklendi: number;
  kategori: Kategori;
  tur: string;
  renkler: Renk[]; // baskın 1-3
  renkAdi: string;
  notr: boolean;
  desen: Desen;
  formalite: Seviye; // 1 çok günlük, 5 çok şık
  sicaklik: Seviye; // kalınlık: 1 çok ince, 5 çok kalın
  mevsim: Mevsim[];
  kesim: Kesim;
  suGecirmez: boolean;
  giyilmeSayisi: number;
  sonGiyilme: number | null;
  durum: 'aktif' | 'arsiv';
  elleDuzeltildi: boolean;
};

export type KombinDurum = 'oneri' | 'kayitli' | 'giyildi' | 'reddedildi' | 'asla';

export type Kombin = {
  id: string; // parça id'lerinin sıralı birleşimi, aynı kombin tek kayıt olur
  parcalar: string[];
  skor: number;
  durum: KombinDurum;
  olusturuldu: number;
  guncellendi: number;
};

export type Hava = { hissedilen: number; yagmur: number; ruzgar: number };

export type GiymeKaydi = {
  tarih: string; // YYYY-MM-DD
  kombinId: string;
  hava: Hava;
};

export type ZevkProfili = {
  id: 'ben';
  renkCifti: Record<string, number>;
  turCifti: Record<string, number>;
  parcaCifti: Record<string, number>;
  formaliteTercihi: number;
  yasak: string[]; // "Bir daha gösterme": birlikte çıkmayacak parça çiftleri (kalıcı)
  guncellendi: number;
};

export type Ortam = 'gunluk' | 'okul' | 'staj' | 'disari' | 'sik';
export type Tema = 'sistem' | 'acik' | 'koyu';

export type Ayarlar = {
  id: 'ben';
  sehir: { ad: string; enlem: number; boylam: number };
  hassasiyet: number; // -2 üşüyen … +2 sıcak tutan
  tema: Tema;
  ortam: Ortam;
  havaFiltresi: boolean;
  etiketSunucusu: string; // boşsa AI etiketleme kapalı
  kalibrasyonYapildi: boolean;
  sonYedek?: number;
  yedekErtelendi?: number; // aylık yedek hatırlatması "Sonra" dendiği zaman
  siluet?: Blob; // boydan, arka planı silinmiş fotoğraf (bölüm 7.5, aşama 2)
  gorunum: 'kolaj' | 'siluet';
  bildirim: boolean; // sabah kombin bildirimi
  sonBildirim?: string; // YYYY-MM-DD
  sonHava?: { zaman: number; hava: Hava; kod: number; sicaklik: number };
};
