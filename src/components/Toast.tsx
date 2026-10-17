import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const Ctx = createContext<(metin: string) => void>(() => {});

export function ToastSaglayici({ children }: { children: ReactNode }) {
  const [metin, setMetin] = useState<string | null>(null);
  const zaman = useRef<number>(0);
  const goster = useCallback((m: string) => {
    setMetin(m);
    clearTimeout(zaman.current);
    zaman.current = window.setTimeout(() => setMetin(null), 2400);
  }, []);
  return (
    <Ctx.Provider value={goster}>
      {children}
      <div aria-live="polite" className="gorunmez">{metin}</div>
      {metin && <div className="toast" role="status">{metin}</div>}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
