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
  const sag = alt ? [alt, ayk].filter(Boolean) as Kiyafet[] : [ayk].filter(Boolean) as Kiyafet[];

  return (
    <div className={`kolaj${kucuk ? ' kucuk-kolaj' : ''}`} style={{ ['--sol-satir' as string]: sol.length === 2 ? '1fr 1.2fr' : '1fr' }}>
      <div className="sol">
        {sol.map((p) => <ParcaResmi key={p.id} k={p} />)}
      </div>
      <div className="sag" style={sag.length === 1 ? { gridTemplateRows: '1fr' } : undefined}>
        {sag.map((p) => <ParcaResmi key={p.id} k={p} />)}
      </div>
      {aks && <ParcaResmi k={aks} className="aksesuar" />}
    </div>
  );
}

export function SkorEtiketi({ etiket }: { etiket: 'Çok şık' | 'Şık' | 'Olur' }) {
  const sinif = etiket === 'Çok şık' ? 'cok-sik' : etiket === 'Olur' ? 'olur' : '';
  return <span className={`skor ${sinif}`}>{etiket}</span>;
}
