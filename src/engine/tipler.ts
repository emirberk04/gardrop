import type { Hava, Kiyafet, Ortam, ZevkProfili } from '../db/types';

/** Motor için fotoğrafsız parça özeti (worker'a blob taşımamak için). */
export type Parca = Omit<Kiyafet, 'foto' | 'kesit'>;

export type MotorBaglami = {
  hava: Hava | null; // null: hava bilinmiyor
  havaFiltresi: boolean;
  hassasiyet: number; // -2 üşüyen … +2 sıcak tutan
  ortam: Ortam;
  zevk: ZevkProfili;
  sonGiyilenler: { kombinId: string; tarih: number }[]; // son 7 gün
  simdi: number;
};

export type Gerekce = { tur: 'renk' | 'hava' | 'yenilik' | 'desen' | 'formalite' | 'zevk'; metin: string };

export type SkorluKombin = {
  id: string;
  parcalar: string[];
  skor: number; // 0-100
  etiket: 'Çok şık' | 'Şık' | 'Olur';
  gerekceler: Gerekce[];
  havaNotu: string;
};

export type UretimSonucu = {
  kombinler: SkorluKombin[];
  toplamAday: number;
  eksik: string | null; // kombin çıkmadıysa somut eksik bilgisi
};

export type UretimIstegi = {
  parcalar: Parca[];
  baglam: MotorBaglami;
  odak?: string; // sadece bu parçayı içeren kombinler (yeni parça eklenince)
  limit?: number;
};
