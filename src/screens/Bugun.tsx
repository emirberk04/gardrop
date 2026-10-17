import { useEffect, useMemo, useRef, useState } from 'react';
import { ayarGuncelle } from '../db/db';
import type { Ayarlar, Kiyafet, Ortam } from '../db/types';
import type { SkorluKombin } from '../engine/tipler';
import { Ikon } from '../components/Ikon';
import { Kolaj, SkorEtiketi } from '../components/Kolaj';
import { useToast } from '../components/Toast';
import { bugunkuGiymeyiGeriAl, gec, giyecegim, kaydetDegistir } from '../lib/eylemler';
import { havaAciklama, havaSimgesi, type HavaDurumu } from '../lib/hava';
import { useKombinKayitlari, useKombinler, useSonGunluk } from '../lib/kancalar';
import { bugunStr } from '../lib/util';

export const ORTAMLAR: { id: Ortam; ad: string }[] = [
  { id: 'gunluk', ad: 'Günlük' },
  { id: 'okul', ad: 'Okul' },
  { id: 'staj', ad: 'Staj' },
  { id: 'disari', ad: 'Dışarı' },
  { id: 'sik', ad: 'Şık' },
];

const DESTE = 12;

type Props = {
  kiyafetler: Kiyafet[] | undefined;
  ayarlar: Ayarlar;
  hava: { hava: HavaDurumu | null; hata: boolean; yukleniyor: boolean };
  ekle: () => void;
  beneGit: () => void;
  kombinlereGit: () => void;
};

export function Bugun({ kiyafetler, ayarlar, hava, ekle, beneGit, kombinlereGit }: Props) {
  const toast = useToast();
  const sonuc = useKombinler({ kiyafetler, ayarlar, hava: hava.hava, limit: 60 });
  const kayitlar = useKombinKayitlari();
  const gunluk = useSonGunluk();
  const harita = useMemo(() => new Map(kiyafetler?.map((k) => [k.id, k])), [kiyafetler]);
  const bugun = bugunStr();
  const bugunGiyilen = gunluk.find((g) => g.tarih === bugun);

  // Deste, bağlam değişmedikçe sabit kalır: her dokunuşta zevk profili güncellenir ama kartlar yer değiştirmez.
  const [deste, setDeste] = useState<SkorluKombin[] | null>(null);
  const [sira, setSira] = useState(0);
  const anahtarRef = useRef('');
  const anahtar = [
    ayarlar.ortam,
    hava.hava?.hava.hissedilen,
    hava.hava?.hava.yagmur,
    ayarlar.hassasiyet,
    kiyafetler?.filter((k) => k.durum === 'aktif').map((k) => k.id + k.formalite + k.sicaklik + k.renkAdi).join(','),
  ].join('|');

  useEffect(() => {
    if (!sonuc) return;
    if (anahtarRef.current === anahtar && deste) return;
    anahtarRef.current = anahtar;
    const bugunGecilen = new Set(
      kayitlar.filter((k) => (k.durum === 'reddedildi' && bugunStr(new Date(k.guncellendi)) === bugun) || k.durum === 'asla').map((k) => k.id),
    );
    setDeste(sonuc.kombinler.filter((k) => !bugunGecilen.has(k.id)).slice(0, DESTE));
    setSira(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sonuc, anahtar]);

  const tarih = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
  const aktif = kiyafetler?.filter((k) => k.durum === 'aktif') ?? [];
  const simdiki = deste?.[sira];
  const parcalar = (k: { parcalar: string[] }) => k.parcalar.map((id) => harita.get(id)).filter((x): x is Kiyafet => !!x);
  const kayitliMi = (id: string) => kayitlar.some((k) => k.id === id && k.durum === 'kayitli');

  const ilerle = () => setSira((s) => s + 1);
  const eylem = {
    gec: async (k: SkorluKombin) => { await gec(k); ilerle(); },
    kaydet: async (k: SkorluKombin) => {
      const kaydedildi = await kaydetDegistir(k);
      toast(kaydedildi ? 'Kaydedildi' : 'Kayıttan çıkarıldı');
      if (kaydedildi) ilerle();
    },
    giy: async (k: SkorluKombin) => { await giyecegim(k, hava.hava?.hava ?? null); toast('İyi günler! Bugünün kombini kaydedildi.'); },
  };

  return (
    <main>
      <header style={{ marginBottom: 12 }}>
        <div className="tarih">{tarih.charAt(0).toLocaleUpperCase('tr') + tarih.slice(1)}</div>
        <HavaSatiri ayarlar={ayarlar} hava={hava} beneGit={beneGit} />
      </header>

      <div className="chipler" style={{ marginBottom: 12 }} role="group" aria-label="Ortam">
        {ORTAMLAR.map((o) => (
          <button key={o.id} className="chip kucuk-chip" aria-pressed={ayarlar.ortam === o.id} onClick={() => ayarGuncelle({ ortam: o.id })}>
            {o.ad}
          </button>
        ))}
      </div>

      {kiyafetler && aktif.length === 0 ? (
        <div className="bos">
          <button className="buyuk-arti" onClick={ekle} aria-label="İlk parçanı ekle"><Ikon ad="arti" /></button>
          <h2 className="bolum-basligi">İlk parçanı ekle</h2>
          <p className="soluk" style={{ margin: 0 }}>Bir üst, bir alt ve bir ayakkabı eklediğinde ilk kombinlerin burada olur.</p>
        </div>
      ) : bugunGiyilen && harita.size ? (
        <BugunGiyilen kombinId={bugunGiyilen.kombinId} harita={harita} />
      ) : sonuc?.eksik ? (
        <div className="kutu" style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 12px' }}>{sonuc.eksik}</p>
          {aktif.length < 6 && <p className="kucuk soluk" style={{ margin: '0 0 12px' }}>Kombin üretmek için en az bir üst, bir alt ve bir ayakkabı lazım.</p>}
          <button className="btn ana" onClick={ekle}><Ikon ad="arti" /> Parça ekle</button>
        </div>
      ) : !deste ? (
        <div className="bos"><span className="donen" /></div>
      ) : simdiki ? (
        <>
          <h2 className="bolum-basligi">Bugün için <span className="num">{deste.length}</span> kombin</h2>
          <KaydirmaKarti
            key={simdiki.id}
            kombin={simdiki}
            parcalar={parcalar(simdiki)}
            sag={() => eylem.kaydet(simdiki)}
            sol={() => eylem.gec(simdiki)}
          />
          <div className="noktalar" aria-hidden="true">
            {deste.map((k, i) => <span key={k.id} className={i === sira ? 'aktif' : ''} />)}
          </div>
          <div className="eylemler">
            <button className="btn" onClick={() => eylem.gec(simdiki)}><Ikon ad="gec" /> Geç</button>
            <AtimButonu className="btn" onClick={() => eylem.kaydet(simdiki)} aria-pressed={kayitliMi(simdiki.id)}>
              <Ikon ad="kalp" dolu={kayitliMi(simdiki.id)} /> Kaydet
            </AtimButonu>
            <AtimButonu className="btn ana" onClick={() => eylem.giy(simdiki)}><Ikon ad="onay" /> Giyeceğim</AtimButonu>
          </div>
        </>
      ) : (
        <div className="kutu" style={{ textAlign: 'center' }}>
          <h2 className="bolum-basligi" style={{ marginBottom: 8 }}>Bugünlük bu kadar</h2>
          <p className="soluk" style={{ margin: '0 0 16px' }}>Tüm önerilere baktın. Daha fazlası Kombinler'de.</p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => setSira(0)}>Baştan göster</button>
            <button className="btn ana" onClick={kombinlereGit}>Tüm kombinler</button>
          </div>
        </div>
      )}
    </main>
  );
}

function HavaSatiri({ ayarlar, hava, beneGit }: Pick<Props, 'ayarlar' | 'hava' | 'beneGit'>) {
  const h = hava.hava;
  if (!h) {
    if (hava.yukleniyor) return <div className="hava-satiri soluk">Hava alınıyor…</div>;
    return (
      <div className="hava-satiri">
        <span>Hava alınamadı.</span> <button className="baglanti" onClick={beneGit}>Şehri elle seç</button>
      </div>
    );
  }
  return (
    <div className="hava-satiri">
      <span className="simge" aria-hidden="true">{havaSimgesi(h.kod)}</span>
      <span>
        {ayarlar.sehir.ad} · <span className="num">{h.sicaklik}°</span>
        <span className="soluk"> · {havaAciklama(h.kod)}{h.hava.yagmur >= 10 ? <> · yağmur <span className="num">%{h.hava.yagmur}</span></> : null}</span>
      </span>
      {h.eski && !hava.yukleniyor && (
        <span className="kucuk soluk">(son bilinen) <button className="baglanti kucuk" onClick={beneGit}>Şehri seç</button></span>
      )}
    </div>
  );
}

function AtimButonu(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [atim, setAtim] = useState(0);
  return (
    <button
      {...props}
      key={atim}
      className={`${props.className ?? ''}${atim ? ' atim' : ''}`}
      onClick={(e) => { setAtim((a) => a + 1); props.onClick?.(e); }}
    />
  );
}

function KaydirmaKarti({ kombin, parcalar, sag, sol }: { kombin: SkorluKombin; parcalar: Kiyafet[]; sag: () => void; sol: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const sagIpucu = useRef<HTMLDivElement>(null);
  const solIpucu = useRef<HTMLDivElement>(null);
  const baslangic = useRef<{ x: number; y: number; dx: number; yatay: boolean | null } | null>(null);
  const [neden, setNeden] = useState(false);

  const uygula = (dx: number, gecis: boolean) => {
    const el = ref.current;
    if (!el) return;
    el.classList.toggle('yay', gecis);
    el.style.transform = dx ? `translateX(${dx}px) rotate(${dx / 30}deg)` : '';
    if (sagIpucu.current) sagIpucu.current.style.opacity = String(Math.max(0, Math.min(1, dx / 90)));
    if (solIpucu.current) solIpucu.current.style.opacity = String(Math.max(0, Math.min(1, -dx / 90)));
  };

  const asagi = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    baslangic.current = { x: e.clientX, y: e.clientY, dx: 0, yatay: null };
  };
  const hareket = (e: React.PointerEvent) => {
    const b = baslangic.current;
    if (!b) return;
    const dx = e.clientX - b.x, dy = e.clientY - b.y;
    if (b.yatay == null && Math.hypot(dx, dy) > 8) {
      b.yatay = Math.abs(dx) > Math.abs(dy);
      if (b.yatay) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (!b.yatay) return;
    b.dx = dx;
    uygula(dx, false);
  };
  const birak = () => {
    const b = baslangic.current;
    baslangic.current = null;
    if (!b?.yatay) return;
    if (Math.abs(b.dx) > 90) {
      const yon = Math.sign(b.dx);
      uygula(yon * window.innerWidth, true);
      if (ref.current) ref.current.style.opacity = '0';
      setTimeout(() => (yon > 0 ? sag() : sol()), 180);
    } else uygula(0, true);
  };

  return (
    <div className="deste">
      <div ref={sagIpucu} className="kaydir-ipucu sag">♡ Kaydet</div>
      <div ref={solIpucu} className="kaydir-ipucu sol">Geç ✕</div>
      <div
        ref={ref}
        className="kombin-kart"
        onPointerDown={asagi}
        onPointerMove={hareket}
        onPointerUp={birak}
        onPointerCancel={birak}
        aria-roledescription="kaydırılabilir kart"
        aria-label={`Kombin: ${parcalar.map((p) => `${p.renkAdi} ${p.tur}`).join(', ')}. ${kombin.etiket}.`}
      >
        <Kolaj parcalar={parcalar} />
        <div className="kart-alt">
          <div className="satir">
            <SkorEtiketi etiket={kombin.etiket} />
            {kombin.havaNotu && <span className="soluk" style={{ fontSize: 14 }}>{kombin.havaNotu}</span>}
            <button className="baglanti" style={{ marginLeft: 'auto' }} aria-expanded={neden} onClick={() => setNeden(!neden)}>
              Neden?
            </button>
          </div>
          {neden && (
            <ul className="neden">
              {kombin.gerekceler.map((g) => <li key={g.metin}>{g.metin}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function BugunGiyilen({ kombinId, harita }: { kombinId: string; harita: Map<string, Kiyafet> }) {
  const parcalar = kombinId.split('+').map((id) => harita.get(id)).filter((x): x is Kiyafet => !!x);
  return (
    <div className="yigin">
      <h2 className="bolum-basligi">Bugünün kombini</h2>
      <div className="kombin-kart">
        <Kolaj parcalar={parcalar} />
        <div className="kart-alt">
          <div className="satir">
            <span className="skor cok-sik">✓ Giyiyorsun</span>
            <span className="soluk" style={{ fontSize: 14 }}>{parcalar.map((p) => p.tur).join(' · ')}</span>
          </div>
        </div>
      </div>
      <button className="btn tam" onClick={() => bugunkuGiymeyiGeriAl()}>Değiştir</button>
    </div>
  );
}
