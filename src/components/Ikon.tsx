const yollar = {
  bugun: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  dolap: 'M12 5a2 2 0 1 1 2 2c-1 0-2 .7-2 1.6V9l8.3 6.2c.9.7.4 2-.7 2H4.4c-1.1 0-1.6-1.3-.7-2L12 9',
  arti: 'M12 5v14M5 12h14',
  kombin: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  ben: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5',
  gec: 'M6 6l12 12M18 6L6 18',
  kalp: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  onay: 'M5 12.5l4.5 4.5L19 7.5',
  kapat: 'M6 6l12 12M18 6L6 18',
  ara: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  kamera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  galeri: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 1 0 0-.01',
  konum: 'M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  sag: 'M9 6l6 6-6 6',
} as const;

export type IkonAdi = keyof typeof yollar;

export function Ikon({ ad, dolu = false }: { ad: IkonAdi; dolu?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={dolu ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={yollar[ad]} />
    </svg>
  );
}
