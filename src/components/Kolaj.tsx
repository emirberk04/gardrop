import type { Kiyafet } from '../db/types';
import { parcaUrl } from '../lib/gorsel';

export function ParcaResmi({ k, className }: { k: Kiyafet; className?: string }) {
  // Arka planı silinmiş kesit orijinalden farklı bir dosyadır
  const saydam = k.kesit.size !== k.foto.size;
  return (
    <img
      src={parcaUrl(k.id, k.kesit)}
      alt={`${k.renkAdi} ${k.tur}`}
      className={[saydam ? 'kesit' : '', className].filter(Boolean).join(' ')}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}

/** Düz yerleşim (flat-lay) kolaj: üstte ceket/üst, yanda alt, altta ayakkabı (bölüm 7.5). */
export function Kolaj({ parcalar, kucuk }: { parcalar: Kiyafet[]; kucuk?: boolean }) {
  const bul = (k: Kiyafet['kategori']) => parcalar.find((p) => p.kategori === k);
  const dis = bul('dis');
  const ust = bul('ust') ?? bul('tek_parca');
  const alt = bul('alt');
  const ayk = bul('ayakkabi');
  const aks = bul('aksesuar');

  const sol = [dis, ust].filter(Boolean) as Kiyafet[];
  // Aksesuar sağ sütunun en üstünde küçük bir satır olur
  const sag = [aks, alt, ayk].filter(Boolean) as Kiyafet[];
  const sagSatir = sag.map((p) => (p.kategori === 'aksesuar' ? '0.6fr' : p.kategori === 'alt' ? '1.5fr' : '1fr')).join(' ');

  return (
    <div className={`kolaj${kucuk ? ' kucuk-kolaj' : ''}`} style={{ ['--sol-satir' as string]: sol.length === 2 ? '1fr 1.2fr' : '1fr' }}>
      <div className="sol">
        {sol.map((p) => <ParcaResmi key={p.id} k={p} />)}
      </div>
      <div className="sag" style={{ gridTemplateRows: sagSatir }}>
        {sag.map((p) => <ParcaResmi key={p.id} k={p} />)}
      </div>
    </div>
  );
}

export function SkorEtiketi({ etiket }: { etiket: 'Çok şık' | 'Şık' | 'Olur' }) {
  const sinif = etiket === 'Çok şık' ? 'cok-sik' : etiket === 'Olur' ? 'olur' : '';
  return <span className={`skor ${sinif}`}>{etiket}</span>;
}

// Silüet üzerinde gösterim (bölüm 7.5, aşama 2): gerçek deneme değil, oran ve renk hissi.
// Konumlar kırpılmış boydan fotoğrafın yüzdeleri: baş ~%0-13, gövde ~%15-50, bacak ~%47-93, ayak ~%92-100.
type Yer = { top: number; height: number; left: number; width: number; z: number };
const YERLER: Record<Kiyafet['kategori'], Yer> = {
  ust: { top: 14, height: 37, left: 12, width: 76, z: 3 },
  tek_parca: { top: 14, height: 62, left: 10, width: 80, z: 3 },
  dis: { top: 13, height: 43, left: 4, width: 92, z: 4 },
  alt: { top: 46, height: 48, left: 20, width: 60, z: 2 },
  ayakkabi: { top: 90, height: 10, left: 18, width: 64, z: 2 },
  aksesuar: { top: 0, height: 12, left: 30, width: 40, z: 5 },
};

function aksesuarYeri(k: Kiyafet): Yer {
  if (/atkı/.test(k.tur)) return { top: 12, height: 12, left: 28, width: 44, z: 5 };
  if (/kemer/.test(k.tur)) return { top: 45, height: 5, left: 25, width: 50, z: 5 };
  return YERLER.aksesuar;
}

export function Uzerimde({ siluet, parcalar }: { siluet: Blob; parcalar: Kiyafet[] }) {
  return (
    <div className="uzerimde">
      <div className="govde">
        <img className="siluet" src={parcaUrl('__siluet', siluet)} alt="Silüetin" draggable={false} />
        {parcalar.map((p) => {
          const y = p.kategori === 'aksesuar' ? aksesuarYeri(p) : YERLER[p.kategori];
          return (
            <img
              key={p.id}
              className="katman"
              src={parcaUrl(p.id, p.kesit)}
              alt={`${p.renkAdi} ${p.tur}`}
              draggable={false}
              style={{
                top: `${y.top}%`, height: `${y.height}%`, left: `${y.left}%`, width: `${y.width}%`, zIndex: y.z,
                // Kırpılmış kesit gövde bölgesine yayılır: oran hissi için gerdirilir
                objectFit: ['ust', 'alt', 'dis', 'tek_parca'].includes(p.kategori) ? 'fill' : 'contain',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Kolaj ya da silüet; silüet kaydedilmişse kart üzerinde geçiş düğmesi gösterir. */
export function KombinGorseli({
  parcalar,
  siluet,
  gorunum,
  degistir,
}: {
  parcalar: Kiyafet[];
  siluet?: Blob;
  gorunum: 'kolaj' | 'siluet';
  degistir: (g: 'kolaj' | 'siluet') => void;
}) {
  const sil = !!siluet && gorunum === 'siluet';
  return (
    <div style={{ position: 'relative' }}>
      {sil ? <Uzerimde siluet={siluet!} parcalar={parcalar} /> : <Kolaj parcalar={parcalar} />}
      {siluet && (
        <div className="sekmeler gorunum-sec" role="group" aria-label="Görünüm">
          <button aria-pressed={!sil} onClick={() => degistir('kolaj')}>Kolaj</button>
          <button aria-pressed={sil} onClick={() => degistir('siluet')}>Üzerimde</button>
        </div>
      )}
    </div>
  );
}
