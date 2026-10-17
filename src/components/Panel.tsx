import { useEffect, useRef, type ReactNode } from 'react';
import { Ikon } from './Ikon';

type Props = {
  acik: boolean;
  kapat: () => void;
  baslik?: ReactNode;
  children: ReactNode;
  alt?: ReactNode;
  tamBoy?: boolean;
};

/** Alttan açılan panel: tam ekran modal yok, aşağı çekerek kapanır (bölüm 5.4). */
export function Panel({ acik, kapat, baslik, children, alt, tamBoy }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const surukle = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    if (!acik) return;
    const tus = (e: KeyboardEvent) => e.key === 'Escape' && kapat();
    window.addEventListener('keydown', tus);
    const onceki = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', tus);
      document.body.style.overflow = onceki;
    };
  }, [acik, kapat]);

  if (!acik) return null;

  const basla = (e: React.PointerEvent) => {
    surukle.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const hareket = (e: React.PointerEvent) => {
    if (!surukle.current || !ref.current) return;
    const dy = Math.max(0, e.clientY - surukle.current.y);
    surukle.current.dy = dy;
    ref.current.style.transition = 'none';
    ref.current.style.transform = `translateY(${dy}px)`;
  };
  const bitir = () => {
    if (!surukle.current || !ref.current) return;
    const { dy } = surukle.current;
    surukle.current = null;
    ref.current.style.transition = 'transform var(--t-sheet) ease-out';
    if (dy > 110) kapat();
    else ref.current.style.transform = '';
  };
  const tutma = { onPointerDown: basla, onPointerMove: hareket, onPointerUp: bitir, onPointerCancel: bitir };

  return (
    <>
      <div className="perde" onClick={kapat} />
      <div ref={ref} className={`panel${tamBoy ? ' tam-boy' : ''}`} role="dialog" aria-modal="true">
        <div className="panel-tutamak" {...tutma} />
        <div className="panel-baslik" {...tutma}>
          <h2 className="bolum-basligi">{baslik}</h2>
          <button className="ikon-btn" onClick={kapat} aria-label="Kapat" onPointerDown={(e) => e.stopPropagation()}>
            <Ikon ad="kapat" />
          </button>
        </div>
        <div className="panel-icerik">{children}</div>
        {alt && <div className="panel-alt">{alt}</div>}
      </div>
    </>
  );
}
