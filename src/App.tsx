import { useEffect, useState } from 'react';
import { kaliciDepolamaIste } from './db/db';
import { Ikon, type IkonAdi } from './components/Ikon';
import { ToastSaglayici } from './components/Toast';
import { useAyarlar, useHava, useKiyafetler } from './lib/kancalar';
import { Ben } from './screens/Ben';
import { Bugun } from './screens/Bugun';
import { Dolap } from './screens/Dolap';
import { Ekle } from './screens/Ekle';
import { Kombinler } from './screens/Kombinler';

type Sekme = 'bugun' | 'dolap' | 'kombinler' | 'ben';

const SEKMELER: { id: Sekme | 'ekle'; ad: string; ikon: IkonAdi }[] = [
  { id: 'bugun', ad: 'Bugün', ikon: 'bugun' },
  { id: 'dolap', ad: 'Dolap', ikon: 'dolap' },
  { id: 'ekle', ad: 'Ekle', ikon: 'arti' },
  { id: 'kombinler', ad: 'Kombin', ikon: 'kombin' },
  { id: 'ben', ad: 'Ben', ikon: 'ben' },
];

export function App() {
  // Uygulama her zaman Bugün'e açılır (bölüm 4.1)
  const [sekme, setSekme] = useState<Sekme>('bugun');
  const [ekleAcik, setEkleAcik] = useState(false);
  const [odak, setOdak] = useState<string | null>(null);
  const kiyafetler = useKiyafetler();
  const ayarlar = useAyarlar();
  const hava = useHava(ayarlar);

  useEffect(() => {
    kaliciDepolamaIste();
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (ayarlar.tema === 'sistem') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', ayarlar.tema === 'koyu' ? 'dark' : 'light');
  }, [ayarlar.tema]);

  const git = (s: Sekme) => {
    setSekme(s);
    window.scrollTo({ top: 0 });
  };
  const kombinlereGit = (id: string | null) => {
    setOdak(id);
    git('kombinler');
  };

  return (
    <ToastSaglayici>
      <div className="uygulama">
        {sekme === 'bugun' && (
          <Bugun
            kiyafetler={kiyafetler}
            ayarlar={ayarlar}
            hava={hava}
            ekle={() => setEkleAcik(true)}
            beneGit={() => git('ben')}
            kombinlereGit={() => kombinlereGit(null)}
          />
        )}
        {sekme === 'dolap' && (
          <Dolap kiyafetler={kiyafetler} ayarlar={ayarlar} hava={hava.hava} ekle={() => setEkleAcik(true)} kombinlereGit={kombinlereGit} />
        )}
        {sekme === 'kombinler' && (
          <Kombinler kiyafetler={kiyafetler} ayarlar={ayarlar} hava={hava.hava} odak={odak} odagiKaldir={() => setOdak(null)} />
        )}
        {sekme === 'ben' && <Ben kiyafetler={kiyafetler} ayarlar={ayarlar} />}
      </div>

      <nav className="alt-cubuk" aria-label="Ana gezinme">
        <ul>
          {SEKMELER.map((s) => (
            <li key={s.id}>
              {s.id === 'ekle' ? (
                <button className="arti" onClick={() => setEkleAcik(true)} aria-label="Kıyafet ekle">
                  <Ikon ad="arti" />
                </button>
              ) : (
                <button aria-current={sekme === s.id ? 'page' : undefined} onClick={() => { if (s.id === 'kombinler') setOdak(null); git(s.id as Sekme); }}>
                  <Ikon ad={s.ikon} />
                  {s.ad}
                </button>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <Ekle
        acik={ekleAcik}
        kapat={() => {
          setEkleAcik(false);
          if (sekme === 'bugun') git('dolap');
        }}
      />
    </ToastSaglayici>
  );
}
