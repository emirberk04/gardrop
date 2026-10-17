import type { Kategori } from '../db/types';

// Kalibrasyon için çizilmiş örnek kıyafetler: kullanıcının dolabı henüz boşken zevk sormak için.

export type OrnekParca = { kategori: Kategori; tur: string; renk: string; hex: string };

const SEKIL: Record<string, string> = {
  ust: 'M30 8h40l22 18-10 12-8-6v60H26V32l-8 6L8 26z',
  gomlek: 'M30 8h40l22 18-10 12-8-6v60H26V32l-8 6L8 26zM42 8l8 12 8-12',
  kazak: 'M28 8h44l24 22-10 50-8-2V92H22V78l-8 2L4 30z',
  dis: 'M26 4h48l24 22-6 66H74V40l-4 52H30l-4-52v52H8L2 26zM50 6v86',
  pantolon: 'M24 4h52l6 92H58L50 30l-8 66H18z',
  sort: 'M22 30h56l6 40H58l-8-22-8 22H16z',
  ayakkabi: 'M6 58l34-14 26 14 28 6v16H6z',
  sneaker: 'M6 56l30-14 22 10 36 10v18H6zM6 74h88',
  sandalet: 'M10 70h80v8H10zM30 56l20 14 20-14',
  sapka: 'M20 60c0-24 60-24 60 0zM8 60h84v8H8z',
};

function sekilBul(p: OrnekParca) {
  if (p.kategori === 'dis') return SEKIL.dis;
  if (p.kategori === 'alt') return /şort/.test(p.tur) ? SEKIL.sort : SEKIL.pantolon;
  if (p.kategori === 'ayakkabi') return /sandalet/.test(p.tur) ? SEKIL.sandalet : /sneaker|spor/.test(p.tur) ? SEKIL.sneaker : SEKIL.ayakkabi;
  if (/gömlek/.test(p.tur)) return SEKIL.gomlek;
  if (/kazak|triko|sweat|kapüşon/.test(p.tur)) return SEKIL.kazak;
  return SEKIL.ust;
}

function Cizim({ p }: { p: OrnekParca }) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label={`${p.renk} ${p.tur}`}>
      <path d={sekilBul(p)} fill={p.hex} stroke="rgb(0 0 0 / 0.25)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function OrnekKolaj({ parcalar }: { parcalar: OrnekParca[] }) {
  const bul = (k: Kategori) => parcalar.find((p) => p.kategori === k);
  const sol = [bul('dis'), bul('ust')].filter(Boolean) as OrnekParca[];
  const sag = [bul('alt'), bul('ayakkabi')].filter(Boolean) as OrnekParca[];
  return (
    <div className="kolaj ornek" style={{ ['--sol-satir' as string]: sol.length === 2 ? '1fr 1fr' : '1fr' }}>
      <div className="sol">{sol.map((p) => <Cizim key={p.tur} p={p} />)}</div>
      <div className="sag">{sag.map((p) => <Cizim key={p.tur} p={p} />)}</div>
    </div>
  );
}
