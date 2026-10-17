import { useMemo, useRef, useState } from 'react';
import type { Ayarlar, Kiyafet, Ortam } from '../db/types';
import { skorla } from '../engine/uretim';
import { ozet } from '../engine/motor';
import type { SkorluKombin } from '../engine/tipler';
import { Kolaj, SkorEtiketi } from '../components/Kolaj';
import { Panel } from '../components/Panel';
import { useToast } from '../components/Toast';
import { birDahaGosterme, giyecegim, kaydetDegistir } from '../lib/eylemler';
import type { HavaDurumu } from '../lib/hava';
import { useKombinKayitlari, useKombinler, useSonGunluk, useZevk } from '../lib/kancalar';
import { buyukHarf } from '../lib/turler';
import { ORTAMLAR } from './Bugun';

type Siralama = 'sik' | 'uzun' | 'yeni' | 'cok';
const SIRALAMALAR: { id: Siralama; ad: string }[] = [
  { id: 'sik', ad: 'En şık' },
  { id: 'uzun', ad: 'Uzun süredir giymediğin' },
  { id: 'yeni', ad: 'Yeni eklenenler' },
  { id: 'cok', ad: 'Bende en çok giyilen' },
];

type Props = {
  kiyafetler: Kiyafet[] | undefined;
  ayarlar: Ayarlar;
  hava: HavaDurumu | null;
  odak: string | null;
  odagiKaldir: () => void;
};

export function Kombinler({ kiyafetler, ayarlar, hava, odak, odagiKaldir }: Props) {
  const [sekme, setSekme] = useState<'hepsi' | 'kayitli'>('hepsi');
  const [havaFiltresi, setHavaFiltresi] = useState(true);
  const [ortam, setOrtam] = useState<Ortam>(ayarlar.ortam);
  const [siralama, setSiralama] = useState<Siralama>('sik');
  const [secili, setSecili] = useState<SkorluKombin | null>(null);
  const [gosterilen, setGosterilen] = useState(30);

  const sonuc = useKombinler({ kiyafetler, ayarlar, hava, havaFiltresi, ortam, odak: odak ?? undefined });
  const kayitlar = useKombinKayitlari();
  const zevk = useZevk();
  const gunluk = useSonGunluk();
  const harita = useMemo(() => new Map(kiyafetler?.map((k) => [k.id, k])), [kiyafetler]);
  const odakParca = odak ? harita.get(odak) : undefined;

  const kaydedilenler = useMemo(() => {
    const parcalar = kiyafetler?.map(ozet) ?? [];
    const ph = new Map(parcalar.map((p) => [p.id, p]));
    return kayitlar
      .filter((k) => k.durum === 'kayitli')
      .map((k) => {
        const ps = k.parcalar.map((id) => ph.get(id)).filter((x) => !!x);
        if (ps.length !== k.parcalar.length) return null;
        return skorla(ps, {
          hava: hava?.hava ?? null,
          havaFiltresi: false,
          hassasiyet: ayarlar.hassasiyet,
          ortam,
          zevk,
          sonGiyilenler: gunluk.map((g) => ({ kombinId: g.kombinId, tarih: new Date(g.tarih).getTime() })),
          simdi: Date.now(),
        });
      })
      .filter((x): x is SkorluKombin => !!x);
  }, [kayitlar, kiyafetler, hava, ayarlar.hassasiyet, ortam, zevk, gunluk]);

  const liste = useMemo(() => {
    const kaynak = sekme === 'kayitli' ? kaydedilenler : sonuc?.kombinler ?? [];
    const ps = (k: SkorluKombin) => k.parcalar.map((id) => harita.get(id)).filter((x): x is Kiyafet => !!x);
    const anahtar: Record<Siralama, (k: SkorluKombin) => number> = {
      sik: (k) => k.skor,
      uzun: (k) => {
        const sonlar = ps(k).map((p) => Date.now() - (p.sonGiyilme ?? p.eklendi));
        return sonlar.reduce((a, b) => a + b, 0) / Math.max(1, sonlar.length);
      },
      yeni: (k) => Math.max(...ps(k).map((p) => p.eklendi)),
      cok: (k) => ps(k).reduce((a, p) => a + p.giyilmeSayisi, 0),
    };
    if (siralama === 'sik' && sekme === 'hepsi') return kaynak; // motor çeşitliliği zaten sıraladı
    return [...kaynak].sort((a, b) => anahtar[siralama](b) - anahtar[siralama](a));
  }, [sekme, kaydedilenler, sonuc, siralama, harita]);

  const parcalar = (k: SkorluKombin) => k.parcalar.map((id) => harita.get(id)).filter((x): x is Kiyafet => !!x);

  return (
    <main>
      <div className="ust-satir">
        <h1 className="ekran-basligi">Kombinler</h1>
        <div className="sekmeler" role="group" aria-label="Görünüm">
          <button aria-pressed={sekme === 'hepsi'} onClick={() => setSekme('hepsi')}>Hepsi</button>
          <button aria-pressed={sekme === 'kayitli'} onClick={() => setSekme('kayitli')}>Kaydedilenler</button>
        </div>
      </div>

      {sekme === 'hepsi' && (
        <div className="chipler" style={{ marginBottom: 12 }}>
          {odakParca && (
            <button className="chip" aria-pressed onClick={odagiKaldir} aria-label={`${odakParca.tur} filtresini kaldır`}>
              {buyukHarf(odakParca.tur)} ile ✕
            </button>
          )}
          <button className="chip" aria-pressed={havaFiltresi} onClick={() => setHavaFiltresi(!havaFiltresi)}>
            Hava {havaFiltresi ? '✓' : ''}
          </button>
          {ORTAMLAR.map((o) => (
            <button key={o.id} className="chip" aria-pressed={ortam === o.id} onClick={() => setOrtam(o.id)}>{o.ad}</button>
          ))}
        </div>
      )}

      <div className="ust-satir" style={{ marginBottom: 12 }}>
        <span className="soluk kucuk num">
          {sekme === 'hepsi' ? `${sonuc?.kombinler.length ?? 0} kombin` : `${kaydedilenler.length} kayıtlı`}
        </span>
        <label className="kucuk soluk" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Sırala:
          <select className="sec" value={siralama} onChange={(e) => setSiralama(e.target.value as Siralama)}>
            {SIRALAMALAR.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </select>
        </label>
      </div>

      {liste.length === 0 ? (
        <p className="soluk" style={{ textAlign: 'center', padding: 24 }}>
          {sekme === 'kayitli' ? 'Henüz kalp koyduğun kombin yok. Bugün ekranında ♡ Kaydet ile ekle.' : sonuc?.eksik ?? 'Kombin bulunamadı.'}
        </p>
      ) : (
        <div className="kombin-izgara">
          {liste.slice(0, gosterilen).map((k) => (
            <MiniKombin key={k.id} k={k} parcalar={parcalar(k)} ac={() => setSecili(k)} />
          ))}
        </div>
      )}
      {liste.length > gosterilen && (
        <button className="btn tam" style={{ marginTop: 16 }} onClick={() => setGosterilen((g) => g + 30)}>Daha fazla göster</button>
      )}

      <KombinPanel k={secili} parcalar={secili ? parcalar(secili) : []} kapat={() => setSecili(null)} hava={hava} kayitli={!!secili && kayitlar.some((x) => x.id === secili.id && x.durum === 'kayitli')} />
    </main>
  );
}

function MiniKombin({ k, parcalar, ac }: { k: SkorluKombin; parcalar: Kiyafet[]; ac: () => void }) {
  // Uzun basınca da aynı eylem paneli açılır
  const zaman = useRef<number>(0);
  return (
    <button
      className="kombin-mini"
      onClick={ac}
      onPointerDown={() => { zaman.current = window.setTimeout(ac, 450); }}
      onPointerUp={() => clearTimeout(zaman.current)}
      onPointerLeave={() => clearTimeout(zaman.current)}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={`${parcalar.map((p) => p.tur).join(', ')}: ${k.etiket}`}
    >
      <Kolaj parcalar={parcalar} kucuk />
      <div className="alt">
        <SkorEtiketi etiket={k.etiket} />
      </div>
    </button>
  );
}

function KombinPanel({ k, parcalar, kapat, hava, kayitli }: { k: SkorluKombin | null; parcalar: Kiyafet[]; kapat: () => void; hava: HavaDurumu | null; kayitli: boolean }) {
  const toast = useToast();
  if (!k) return null;
  return (
    <Panel
      acik
      kapat={kapat}
      baslik={<SkorEtiketi etiket={k.etiket} />}
      alt={
        <>
          <button className="btn ana tam" onClick={async () => { await giyecegim(k, hava?.hava ?? null); toast('Giydim olarak kaydedildi.'); kapat(); }}>
            ✓ Giydim
          </button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="btn" onClick={async () => { const s = await kaydetDegistir(k); toast(s ? 'Kaydedildi' : 'Kayıttan çıkarıldı'); }}>
              {kayitli ? '♥ Kayıtlı' : '♡ Kaydet'}
            </button>
            <button className="btn hayalet tehlike" onClick={async () => { await birDahaGosterme(k); toast('Bu ikili bir daha gösterilmeyecek.'); kapat(); }}>
              Bir daha gösterme
            </button>
          </div>
        </>
      }
    >
      <div className="kombin-kart" style={{ marginBottom: 12 }}>
        <Kolaj parcalar={parcalar} />
      </div>
      <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{parcalar.map((p) => buyukHarf(`${p.renkAdi} ${p.tur}`)).join(' · ')}</p>
      <ul className="neden">{k.gerekceler.map((g) => <li key={g.metin}>{g.metin}</li>)}</ul>
    </Panel>
  );
}
