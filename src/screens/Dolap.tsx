import { useMemo, useState } from 'react';
import { db } from '../db/db';
import type { Kategori, Kiyafet } from '../db/types';
import { EtiketFormu, type Etiketler } from '../components/EtiketFormu';
import { Ikon } from '../components/Ikon';
import { ParcaResmi } from '../components/Kolaj';
import { Panel } from '../components/Panel';
import { useToast } from '../components/Toast';
import { sonEkleneniAyarla, useSonEklenen } from '../lib/ekleKuyrugu';
import { arsivle } from '../lib/eylemler';
import type { HavaDurumu } from '../lib/hava';
import { useKombinler } from '../lib/kancalar';
import { buyukHarf } from '../lib/turler';
import { gunOnce } from '../lib/util';
import type { Ayarlar } from '../db/types';

type Filtre = 'hepsi' | 'ust' | 'alt' | 'dis' | 'ayakkabi' | 'diger' | 'giyilmeyen' | 'arsiv';
const FILTRELER: { id: Filtre; ad: string }[] = [
  { id: 'hepsi', ad: 'Hepsi' },
  { id: 'ust', ad: 'Üst' },
  { id: 'alt', ad: 'Alt' },
  { id: 'dis', ad: 'Dış' },
  { id: 'ayakkabi', ad: 'Ayakkabı' },
  { id: 'diger', ad: 'Diğer' },
  { id: 'giyilmeyen', ad: 'Giyilmeyenler' },
  { id: 'arsiv', ad: 'Arşiv' },
];

export const GIYILMEDI_GUN = 30;

export function giyilmediMi(k: Kiyafet) {
  const g = gunOnce(k.sonGiyilme ?? k.eklendi);
  return g != null && g >= GIYILMEDI_GUN;
}

function sonGiyilmeMetni(k: Kiyafet) {
  const g = gunOnce(k.sonGiyilme);
  if (g == null) return 'Hiç giyilmedi';
  if (g === 0) return 'Bugün';
  return `${g} gün`;
}

type Props = {
  kiyafetler: Kiyafet[] | undefined;
  ayarlar: Ayarlar;
  hava: HavaDurumu | null;
  ekle: () => void;
  kombinlereGit: (odak: string) => void;
};

export function Dolap({ kiyafetler, ayarlar, hava, ekle, kombinlereGit }: Props) {
  const [filtre, setFiltre] = useState<Filtre>('hepsi');
  const [ara, setAra] = useState('');
  const [aramaAcik, setAramaAcik] = useState(false);
  const [detay, setDetay] = useState<Kiyafet | null>(null);
  const sonEklenen = useSonEklenen();

  const aktif = useMemo(() => kiyafetler?.filter((k) => k.durum === 'aktif') ?? [], [kiyafetler]);
  const yeniParca = sonEklenen ? aktif.find((k) => k.id === sonEklenen) : undefined;
  const yeniKombinler = useKombinler({ kiyafetler: yeniParca ? kiyafetler : undefined, ayarlar, hava, havaFiltresi: false, odak: sonEklenen ?? undefined });

  const liste = useMemo(() => {
    if (!kiyafetler) return [];
    const q = ara.trim().toLocaleLowerCase('tr');
    return kiyafetler.filter((k) => {
      if (filtre === 'arsiv') { if (k.durum !== 'arsiv') return false; }
      else if (k.durum !== 'aktif') return false;
      if (filtre === 'giyilmeyen' && !giyilmediMi(k)) return false;
      if (['ust', 'alt', 'dis', 'ayakkabi'].includes(filtre) && k.kategori !== (filtre as Kategori)) return false;
      if (filtre === 'diger' && !['tek_parca', 'aksesuar'].includes(k.kategori)) return false;
      if (q && !`${k.tur} ${k.renkAdi}`.toLocaleLowerCase('tr').includes(q)) return false;
      return true;
    }).sort((a, b) => (filtre === 'giyilmeyen' ? (a.sonGiyilme ?? a.eklendi) - (b.sonGiyilme ?? b.eklendi) : 0));
  }, [kiyafetler, filtre, ara]);

  if (kiyafetler && kiyafetler.length === 0) {
    return (
      <main>
        <h1 className="ekran-basligi">Dolabım</h1>
        <BosDolap ekle={ekle} />
      </main>
    );
  }

  return (
    <main>
      <div className="ust-satir" style={{ marginBottom: 12 }}>
        <h1 className="ekran-basligi">
          Dolabım <span className="soluk num" style={{ fontSize: 18 }}>· {aktif.length} parça</span>
        </h1>
        <button className="ikon-btn" aria-label="Ara" aria-expanded={aramaAcik} onClick={() => setAramaAcik(!aramaAcik)}>
          <Ikon ad="ara" />
        </button>
      </div>
      {aramaAcik && (
        <input className="metin-girdi" style={{ marginBottom: 12 }} placeholder="Gömlek, lacivert…" value={ara} onChange={(e) => setAra(e.target.value)} autoFocus aria-label="Dolapta ara" />
      )}

      {yeniParca && yeniKombinler && yeniKombinler.kombinler.length > 0 && (
        <button className="bildirim" onClick={() => { kombinlereGit(yeniParca.id); sonEkleneniAyarla(null); }}>
          <span className="rozet">Yeni</span>
          <span style={{ flex: 1 }}>
            Yeni {yeniParca.tur} ile <span className="num">{yeniKombinler.kombinler.length}</span> kombin hazır
          </span>
          <Ikon ad="sag" />
        </button>
      )}

      <div className="chipler" style={{ marginBottom: 16 }}>
        {FILTRELER.map((f) => (
          <button key={f.id} className="chip" aria-pressed={filtre === f.id} onClick={() => setFiltre(f.id)}>{f.ad}</button>
        ))}
      </div>

      {liste.length === 0 ? (
        <p className="soluk" style={{ textAlign: 'center', padding: 24 }}>
          {filtre === 'giyilmeyen' ? `${GIYILMEDI_GUN} günden uzun süredir giymediğin parça yok. Güzel.` : 'Bu filtrede parça yok.'}
        </p>
      ) : (
        <div className="izgara">
          {liste.map((k) => <KiyafetKarti key={k.id} k={k} ac={() => setDetay(k)} />)}
        </div>
      )}

      <ParcaDetay k={detay ? kiyafetler?.find((x) => x.id === detay.id) ?? null : null} kapat={() => setDetay(null)} kombinlereGit={kombinlereGit} />
    </main>
  );
}

function KiyafetKarti({ k, ac }: { k: Kiyafet; ac: () => void }) {
  const eski = giyilmediMi(k);
  const yeni = k.sonGiyilme == null && (gunOnce(k.eklendi) ?? 99) < 3;
  return (
    <button className={`kiyafet-kart${k.durum === 'arsiv' ? ' arsiv' : ''}`} onClick={ac} aria-label={`${k.renkAdi} ${k.tur}, ${sonGiyilmeMetni(k)}`}>
      <div className="kare">
        <ParcaResmi k={k} />
        {yeni && <span className="rozet">Yeni</span>}
      </div>
      <div className="ad">{buyukHarf(k.tur)}</div>
      <div className="meta">
        <span className="renk-noktasi" style={{ background: k.renkler[0]?.hex }} />
        <span className="num" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sonGiyilmeMetni(k)}</span>
        {eski && <span className="thread-nokta" title="30 günden uzun süredir giyilmedi" />}
      </div>
    </button>
  );
}

function BosDolap({ ekle }: { ekle: () => void }) {
  return (
    <div className="bos">
      <button className="buyuk-arti" onClick={ekle} aria-label="İlk parçanı ekle"><Ikon ad="arti" /></button>
      <h2 className="bolum-basligi">İlk parçanı ekle</h2>
      <ul className="ipuclari">
        <li>Yumuşak gün ışığında, pencere önünde çek.</li>
        <li>Kıyafeti düz zemine buruşuksuz ser.</li>
        <li>Parçayı kadrajın ortasına al, her seferinde aynı yükseklikten çek.</li>
      </ul>
    </div>
  );
}

function ParcaDetay({ k, kapat, kombinlereGit }: { k: Kiyafet | null; kapat: () => void; kombinlereGit: (id: string) => void }) {
  const toast = useToast();
  const [taslak, setTaslak] = useState<Etiketler | null>(null);
  const [duzenleniyor, setDuzenleniyor] = useState(false);

  if (!k) return null;
  const e: Etiketler = taslak ?? k;

  const kaydet = async () => {
    if (!taslak) return;
    // Etiket düzeltilince skorlar yeniden hesaplanır, geri bildirim geçmişi silinmez
    await db.kiyafetler.update(k.id, { ...taslak, elleDuzeltildi: true });
    setTaslak(null);
    setDuzenleniyor(false);
    toast('Etiketler güncellendi.');
  };

  const kapatVeSifirla = () => {
    setTaslak(null);
    setDuzenleniyor(false);
    kapat();
  };

  return (
    <Panel
      acik
      kapat={kapatVeSifirla}
      baslik={buyukHarf(`${k.renkAdi} ${k.tur}`)}
      alt={
        duzenleniyor ? (
          <button className="btn ana tam" disabled={!taslak} onClick={kaydet}>Değişiklikleri kaydet</button>
        ) : (
          <>
            <button className="btn ana tam" onClick={() => { kapatVeSifirla(); kombinlereGit(k.id); }} disabled={k.durum !== 'aktif'}>
              Bu parçayla kombinler
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn" onClick={() => setDuzenleniyor(true)}>Düzenle</button>
              {k.durum === 'aktif' ? (
                <button className="btn hayalet tehlike" onClick={async () => { await arsivle(k.id); toast('Arşive taşındı. Geçmiş kayıtlar korunur.'); kapatVeSifirla(); }}>
                  Arşivle
                </button>
              ) : (
                <button className="btn" onClick={async () => { await arsivle(k.id, false); toast('Dolaba geri alındı.'); }}>Dolaba geri al</button>
              )}
            </div>
          </>
        )
      }
    >
      <div className="onizleme" style={{ height: 260 }}>
        <ParcaResmi k={k} />
      </div>
      {duzenleniyor ? (
        <EtiketFormu deger={e} degistir={setTaslak} />
      ) : (
        <div>
          <Satir ad="Renk" deger={<><span className="renk-noktasi" style={{ background: k.renkler[0]?.hex }} /> {buyukHarf(k.renkAdi)}{k.notr ? ' · nötr' : ''}</>} />
          <Satir ad="Giyilme" deger={<span className="num">{k.giyilmeSayisi} kez</span>} />
          <Satir ad="Son giyilme" deger={<span className="num">{sonGiyilmeMetni(k)}{k.sonGiyilme != null && gunOnce(k.sonGiyilme)! > 0 ? ' önce' : ''}</span>} />
          <Satir ad="Ortam / Kalınlık" deger={<span className="num">{k.formalite}/5 · {k.sicaklik}/5</span>} />
          {k.renkler.length > 1 && (
            <Satir ad="Diğer renkler" deger={<span style={{ display: 'flex', gap: 6 }}>{k.renkler.slice(1).map((r) => <span key={r.hex} className="renk-noktasi" style={{ background: r.hex }} />)}</span>} />
          )}
        </div>
      )}
    </Panel>
  );
}

function Satir({ ad, deger }: { ad: string; deger: React.ReactNode }) {
  return (
    <div className="alan">
      <span className="etiket">{ad}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{deger}</span>
    </div>
  );
}
