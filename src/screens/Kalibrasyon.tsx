import { useState } from 'react';
import { ayarGuncelle, db, zevkAl } from '../db/db';
import type { Seviye } from '../db/types';
import type { Parca } from '../engine/tipler';
import { kalibrasyonUygula } from '../engine/zevk';
import { OrnekKolaj, type OrnekParca } from '../components/OrnekKolaj';
import { hexToLab, RENK_ADLARI, renkAdindanHex } from '../lib/renk';
import { buyukHarf, turBul } from '../lib/turler';

// Bölüm 3.3: tek seferlik, 30 saniyelik zevk kalibrasyonu. 8 kart, "Bana uyar" / "Uymaz".
const p = (kategori: OrnekParca['kategori'], tur: string, renk: string): OrnekParca => ({ kategori, tur, renk, hex: renkAdindanHex(renk) });

export const ORNEKLER: OrnekParca[][] = [
  [p('ust', 'gömlek', 'beyaz'), p('alt', 'chino', 'lacivert'), p('ayakkabi', 'loafer', 'kahve')],
  [p('ust', 'tişört', 'siyah'), p('alt', 'kot', 'siyah'), p('ayakkabi', 'sneaker', 'beyaz')],
  [p('ust', 'triko', 'bordo'), p('alt', 'chino', 'bej'), p('ayakkabi', 'bot', 'kahve')],
  [p('ust', 'sweatshirt', 'yeşil'), p('alt', 'kot', 'denim'), p('ayakkabi', 'sneaker', 'beyaz')],
  [p('dis', 'blazer', 'taş'), p('ust', 'gömlek', 'açık mavi'), p('alt', 'kumaş pantolon', 'lacivert'), p('ayakkabi', 'loafer', 'siyah')],
  [p('ust', 'kapüşonlu', 'turuncu'), p('alt', 'kargo pantolon', 'mavi'), p('ayakkabi', 'spor ayakkabı', 'kırmızı')],
  [p('dis', 'mont', 'haki'), p('ust', 'kazak', 'gri'), p('alt', 'kot', 'siyah'), p('ayakkabi', 'bot', 'siyah')],
  [p('ust', 'polo', 'pembe'), p('alt', 'şort', 'beyaz'), p('ayakkabi', 'sandalet', 'kahve')],
];

function parcaya(o: OrnekParca, i: number): Parca {
  const t = turBul(o.tur);
  return {
    id: `ornek${i}`,
    eklendi: 0,
    kategori: o.kategori,
    tur: o.tur,
    renkler: [{ hex: o.hex, lab: hexToLab(o.hex), pay: 1 }],
    renkAdi: o.renk,
    notr: RENK_ADLARI.find((r) => r.ad === o.renk)?.notr ?? false,
    desen: 'duz',
    formalite: (t?.formalite ?? 2) as Seviye,
    sicaklik: (t?.sicaklik ?? 2) as Seviye,
    mevsim: t?.mevsim ?? [],
    kesim: 'normal',
    suGecirmez: false,
    giyilmeSayisi: 0,
    sonGiyilme: null,
    durum: 'aktif',
    elleDuzeltildi: false,
  };
}

export function Kalibrasyon({ karsilama, bitti }: { karsilama: boolean; bitti: () => void }) {
  const [basladi, setBasladi] = useState(!karsilama);
  const [cevaplar, setCevaplar] = useState<boolean[]>([]);
  const sira = cevaplar.length;

  const kaydet = async (son: boolean[]) => {
    const profil = kalibrasyonUygula(
      await zevkAl(),
      son.map((uyar, i) => ({ parcalar: ORNEKLER[i].map(parcaya), uyar })),
    );
    await db.zevk.put(profil);
  };

  const tamamla = async () => {
    await ayarGuncelle({ kalibrasyonYapildi: true });
    bitti();
  };

  const cevapla = async (uyar: boolean) => {
    const yeni = [...cevaplar, uyar];
    setCevaplar(yeni);
    if (yeni.length === ORNEKLER.length) await kaydet(yeni);
  };

  const atla = async () => {
    await ayarGuncelle({ kalibrasyonYapildi: true });
    bitti();
  };

  if (!basladi) {
    return (
      <div className="karsilama">
        <img src="/icon.svg" alt="" width={72} height={72} style={{ borderRadius: 18 }} />
        <h1 className="ekran-basligi">Gardırop</h1>
        <p className="soluk" style={{ margin: 0 }}>
          Dolabın telefonunda. Her sabah havaya uygun, en şık kombinler önünde; sen sadece seçersin.
        </p>
        <ol className="ipuclari" style={{ alignSelf: 'stretch' }}>
          <li>Önce 8 örnek kombine "uyar / uymaz" de (30 saniye).</li>
          <li>Sonra kıyafetlerini çek, etiketleri onayla.</li>
          <li>Bugün ekranı her gün senin için kombin hazırlar.</li>
        </ol>
        <div style={{ flex: 1 }} />
        <button className="btn ana tam" onClick={() => setBasladi(true)}>Başlayalım</button>
        <button className="btn hayalet tam" onClick={atla}>Atla</button>
      </div>
    );
  }

  if (sira >= ORNEKLER.length) {
    return (
      <div className="karsilama">
        <h1 className="ekran-basligi">Hazır</h1>
        <p className="soluk" style={{ margin: 0 }}>
          {cevaplar.filter(Boolean).length} kombini beğendin. Zevkini kullandıkça öğrenmeye devam edeceğim; kalibrasyon bir daha sorulmaz.
        </p>
        <div style={{ flex: 1 }} />
        <button className="btn ana tam" onClick={tamamla}>Devam</button>
      </div>
    );
  }

  const ornek = ORNEKLER[sira];
  return (
    <div className="karsilama kalibrasyon">
      <div className="ust-satir" style={{ alignSelf: 'stretch', marginBottom: 0 }}>
        <span className="soluk kucuk num">{sira + 1} / {ORNEKLER.length}</span>
        {karsilama && <button className="baglanti" onClick={atla}>Atla</button>}
      </div>
      <div className="bar" style={{ alignSelf: 'stretch' }}><span style={{ width: `${(sira / ORNEKLER.length) * 100}%` }} /></div>
      <h2 className="bolum-basligi">Bu kombin sana uyar mı?</h2>
      <div className="kombin-kart" style={{ alignSelf: 'stretch' }}>
        <OrnekKolaj parcalar={ornek} />
        <div className="kart-alt soluk" style={{ fontSize: 14 }}>
          {ornek.map((o) => buyukHarf(`${o.renk} ${o.tur}`)).join(' · ')}
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, alignSelf: 'stretch' }}>
        <button className="btn" onClick={() => cevapla(false)}>Uymaz</button>
        <button className="btn ana" onClick={() => cevapla(true)}>Bana uyar</button>
      </div>
    </div>
  );
}
