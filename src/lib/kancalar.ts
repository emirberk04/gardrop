import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ayarGuncelle, ayarlariAl, db, VARSAYILAN_AYARLAR, zevkAl, BOS_ZEVK } from '../db/db';
import type { Ayarlar, Kiyafet, Ortam } from '../db/types';
import { kombinUret, ozet } from '../engine/motor';
import type { UretimSonucu } from '../engine/tipler';
import { havaGetir, type HavaDurumu } from './hava';
import { GUN, bugunStr } from './util';

export function useKiyafetler() {
  return useLiveQuery(() => db.kiyafetler.orderBy('eklendi').reverse().toArray(), []);
}

export function useAyarlar(): Ayarlar {
  return useLiveQuery(ayarlariAl, []) ?? VARSAYILAN_AYARLAR;
}

export function useZevk() {
  return useLiveQuery(zevkAl, []) ?? BOS_ZEVK;
}

export function useKombinKayitlari() {
  return useLiveQuery(() => db.kombinler.toArray(), []) ?? [];
}

export function useSonGunluk() {
  return (
    useLiveQuery(
      () => db.gunluk.where('tarih').aboveOrEqual(bugunStr(new Date(Date.now() - 7 * GUN))).toArray(),
      [],
    ) ?? []
  );
}

/** Hava: Open-Meteo'dan al, başarısızsa son bilinen havayı göster (bölüm 4.6). */
export function useHava(ayarlar: Ayarlar) {
  const [durum, setDurum] = useState<{ hava: HavaDurumu | null; hata: boolean; yukleniyor: boolean }>({
    hava: null,
    hata: false,
    yukleniyor: true,
  });
  const { enlem, boylam } = ayarlar.sehir;
  const sonHava = useRef(ayarlar.sonHava);
  sonHava.current = ayarlar.sonHava;

  useEffect(() => {
    let iptal = false;
    const eski = sonHava.current;
    if (eski) {
      setDurum({ hava: { ...eski, eski: true }, hata: false, yukleniyor: true });
    }
    havaGetir({ ad: '', enlem, boylam })
      .then((h) => {
        if (iptal) return;
        setDurum({ hava: { ...h, eski: false }, hata: false, yukleniyor: false });
        ayarGuncelle({ sonHava: h });
      })
      .catch(() => {
        if (iptal) return;
        const e = sonHava.current;
        setDurum({ hava: e ? { ...e, eski: true } : null, hata: true, yukleniyor: false });
      });
    return () => {
      iptal = true;
    };
  }, [enlem, boylam]);

  return durum;
}

type KombinSecenek = {
  kiyafetler: Kiyafet[] | undefined;
  ayarlar: Ayarlar;
  hava: HavaDurumu | null;
  havaFiltresi?: boolean;
  ortam?: Ortam;
  odak?: string;
  limit?: number;
};

/** Kombin motorunu worker'da çalıştırır; veri değişince yeniden hesaplar. */
export function useKombinler({ kiyafetler, ayarlar, hava, havaFiltresi, ortam, odak, limit }: KombinSecenek) {
  const zevk = useZevk();
  const gunluk = useSonGunluk();
  const [sonuc, setSonuc] = useState<UretimSonucu | null>(null);
  const parcalar = useMemo(() => kiyafetler?.map(ozet), [kiyafetler]);
  const filtre = havaFiltresi ?? ayarlar.havaFiltresi;
  const h = hava?.hava ?? null;

  useEffect(() => {
    if (!parcalar) return;
    let iptal = false;
    const sonGiyilenler = gunluk.map((g) => ({ kombinId: g.kombinId, tarih: new Date(g.tarih).getTime() }));
    kombinUret({
      parcalar,
      baglam: {
        hava: h,
        havaFiltresi: filtre,
        hassasiyet: ayarlar.hassasiyet,
        ortam: ortam ?? ayarlar.ortam,
        zevk,
        sonGiyilenler,
        simdi: Date.now(),
      },
      odak,
      limit,
    }).then((s) => !iptal && setSonuc(s));
    return () => {
      iptal = true;
    };
    // h nesnesi her render'da yeni olabilir, değerleri üzerinden izle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcalar, h?.hissedilen, h?.yagmur, h?.ruzgar, filtre, ayarlar.hassasiyet, ortam, ayarlar.ortam, zevk, gunluk, odak, limit]);

  return sonuc;
}
