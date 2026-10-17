import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../db/db';
import type { Kiyafet } from '../db/types';
import { EtiketFormu, type Etiketler } from '../components/EtiketFormu';
import { Ikon } from '../components/Ikon';
import { Panel } from '../components/Panel';
import { useToast } from '../components/Toast';
import { etiketle, kuyrugaEkle, kuyruktanCikar, sonEkleneniAyarla, useKuyruk, type KuyrukOgesi } from '../lib/ekleKuyrugu';
import { renkAdlandir } from '../lib/renk';
import { turBul } from '../lib/turler';
import { yeniId } from '../lib/util';

const IPUCLARI = [
  'Pencere önünde, doğrudan güneş değil yumuşak gün ışığı.',
  'Kıyafet düz zeminde, buruşuksuz serili.',
  'Parça kadrajın ortasında, kenarlara taşmadan.',
  'Tüm parçaları aynı yükseklikten çek.',
];

function baslangicEtiketleri(o: KuyrukOgesi): Etiketler {
  const ana = o.renkler[0];
  const ad = ana ? renkAdlandir(ana.lab) : { ad: '', notr: true };
  const e = o.etiket;
  const tur = e ? turBul(e.tur) : undefined;
  return {
    kategori: e?.kategori ?? 'ust',
    tur: e?.tur ?? '',
    renkAdi: ad.ad,
    notr: ad.notr,
    renkler: o.renkler,
    desen: e?.desen ?? 'duz',
    formalite: e?.formalite ?? tur?.formalite ?? 2,
    sicaklik: e?.sicaklik ?? tur?.sicaklik ?? 2,
    mevsim: e?.mevsim ?? tur?.mevsim ?? [],
    kesim: e?.kesim ?? 'normal',
    suGecirmez: e?.suGecirmez ?? tur?.suGecirmez ?? false,
  };
}

export function Ekle({ acik, kapat }: { acik: boolean; kapat: () => void }) {
  const kuyruk = useKuyruk();
  const toast = useToast();
  const kamera = useRef<HTMLInputElement>(null);
  const galeri = useRef<HTMLInputElement>(null);
  const [seciliId, setSeciliId] = useState<string | null>(null);
  const [etiketler, setEtiketler] = useState<Etiketler | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Hazır olan ilk parçayı onaya getir
  const secili = useMemo(
    () => kuyruk.find((o) => o.id === seciliId) ?? kuyruk.find((o) => o.durum === 'hazir') ?? kuyruk[0] ?? null,
    [kuyruk, seciliId],
  );
  useEffect(() => {
    setEtiketler(secili?.durum === 'hazir' ? baslangicEtiketleri(secili) : null);
    // sadece seçili parça değişince ya da hazır olunca sıfırla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secili?.id, secili?.durum, secili?.etiket]);

  const dosyaSecildi = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dosyalar = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (dosyalar.length) kuyrugaEkle(dosyalar);
  };

  const kaydet = async () => {
    if (!secili?.foto || !secili.kesit || !etiketler) return;
    if (!etiketler.tur) return toast('Önce türü seç.');
    setKaydediliyor(true);
    const k: Kiyafet = {
      id: yeniId(),
      foto: secili.foto,
      kesit: secili.kesit,
      eklendi: Date.now(),
      ...etiketler,
      giyilmeSayisi: 0,
      sonGiyilme: null,
      durum: 'aktif',
      elleDuzeltildi: false,
    };
    await db.kiyafetler.add(k);
    sonEkleneniAyarla(k.id);
    kuyruktanCikar(secili.id);
    setSeciliId(null);
    setKaydediliyor(false);
    const kalan = kuyruk.length - 1;
    toast(kalan > 0 ? `Kaydedildi. Sırada ${kalan} parça var.` : 'Dolaba eklendi.');
  };

  const at = () => {
    if (!secili) return;
    kuyruktanCikar(secili.id);
    setSeciliId(null);
  };

  const onizlemeUrl = useMemo(() => (secili?.kesit ?? secili?.foto ? URL.createObjectURL((secili.kesit ?? secili.foto)!) : null), [secili?.kesit, secili?.foto]);
  useEffect(() => () => { if (onizlemeUrl) URL.revokeObjectURL(onizlemeUrl); }, [onizlemeUrl]);

  return (
    <Panel
      acik={acik}
      kapat={kapat}
      tamBoy
      baslik="Yeni parça"
      alt={
        secili ? (
          <>
            <button className="btn ana tam" disabled={!etiketler || kaydediliyor} onClick={kaydet}>
              {kuyruk.length > 1 ? 'Kaydet ve sıradaki parça' : 'Kaydet'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button className="btn" onClick={() => kamera.current?.click()}>
                <Ikon ad="kamera" /> Sıradakini çek
              </button>
              <button className="btn hayalet tehlike" onClick={at}>Bu fotoğrafı at</button>
            </div>
          </>
        ) : undefined
      }
    >
      <input ref={kamera} type="file" accept="image/*" capture="environment" hidden onChange={dosyaSecildi} />
      <input ref={galeri} type="file" accept="image/*" multiple hidden onChange={dosyaSecildi} />

      {!secili && (
        <div className="yigin">
          <div className="kutu">
            <h3 className="bolum-basligi" style={{ marginBottom: 8 }}>Çekim ipuçları</h3>
            <ul className="ipuclari">{IPUCLARI.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
          <button className="btn ana tam" onClick={() => kamera.current?.click()}>
            <Ikon ad="kamera" /> Fotoğraf çek
          </button>
          <button className="btn tam" onClick={() => galeri.current?.click()}>
            <Ikon ad="galeri" /> Galeriden seç (seri ekleme)
          </button>
          <p className="kucuk soluk" style={{ margin: 0 }}>
            Arka plan cihazında silinir. İlk seferde model iner (bir kerelik), sonra çevrimdışı çalışır.
            Orijinal fotoğraflar telefonundan çıkmaz.
          </p>
        </div>
      )}

      {secili && (
        <>
          {kuyruk.length > 1 && (
            <div className="kuyruk" aria-label="Sıradaki parçalar">
              {kuyruk.map((o) => <KuyrukKutusu key={o.id} o={o} secili={o.id === secili.id} sec={() => setSeciliId(o.id)} />)}
            </div>
          )}
          <div className="onizleme">
            {onizlemeUrl ? <img src={onizlemeUrl} alt="Yeni parça" /> : <div className="donen" />}
          </div>
          {secili.durum === 'isleniyor' ? (
            <p className="soluk" style={{ textAlign: 'center', display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
              <span className="donen" /> {secili.adim}…
            </p>
          ) : (
            <>
              {!secili.saydam && (
                <div className="uyari" style={{ marginBottom: 8 }}>
                  Arka plan silinemedi. Parça yine kaydedilir; istersen düz zeminde yeniden çek.
                </div>
              )}
              {secili.etiketHatasi && (
                <div className="uyari" style={{ marginBottom: 8 }}>
                  <span>Otomatik etiketleme yapılamadı, türü elle seç.</span>
                  <button className="baglanti" onClick={() => etiketle(secili.id)}>Yeniden dene</button>
                </div>
              )}
              {etiketler && <EtiketFormu deger={etiketler} degistir={setEtiketler} />}
            </>
          )}
        </>
      )}
    </Panel>
  );
}

function KuyrukKutusu({ o, secili, sec }: { o: KuyrukOgesi; secili: boolean; sec: () => void }) {
  const blob = o.kesit ?? o.foto;
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  return (
    <button className="oge" aria-current={secili} onClick={sec} aria-label={o.durum === 'isleniyor' ? 'İşleniyor' : 'Onay bekliyor'}>
      {url && <img src={url} alt="" />}
      {o.durum === 'isleniyor' && <span className="donen" />}
    </button>
  );
}
