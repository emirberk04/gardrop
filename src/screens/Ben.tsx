import { useEffect, useMemo, useRef, useState } from 'react';
import { ayarGuncelle, BOS_ZEVK, db } from '../db/db';
import type { Ayarlar, Kiyafet, Tema } from '../db/types';
import { Ikon } from '../components/Ikon';
import { Panel } from '../components/Panel';
import { arkaPlanSil, kucult, parcaUrl } from '../lib/gorsel';
import { Kalibrasyon } from './Kalibrasyon';
import { useToast } from '../components/Toast';
import { yedekIndir, yedekYukle } from '../lib/eylemler';
import { sehirAra, type SehirSonucu } from '../lib/hava';
import { buyukHarf } from '../lib/turler';
import { GUN, gunOnce } from '../lib/util';

const TEMALAR: { id: Tema; ad: string }[] = [
  { id: 'sistem', ad: 'Sistem' },
  { id: 'acik', ad: 'Açık' },
  { id: 'koyu', ad: 'Koyu' },
];

type PeriyodikKayit = ServiceWorkerRegistration & {
  periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void>; unregister: (tag: string) => Promise<void> };
};

const HASSASIYET = ['Çok üşürüm', 'Üşürüm', 'Normal', 'Sıcak tutarım', 'Çok sıcak tutarım'];

export function Ben({ kiyafetler, ayarlar }: { kiyafetler: Kiyafet[] | undefined; ayarlar: Ayarlar }) {
  const toast = useToast();
  const [sorgu, setSorgu] = useState('');
  const [sonuclar, setSonuclar] = useState<SehirSonucu[]>([]);
  const [kalici, setKalici] = useState<boolean | null>(null);
  const dosya = useRef<HTMLInputElement>(null);
  const siluetGirdi = useRef<HTMLInputElement>(null);
  const [siluetIsleniyor, setSiluetIsleniyor] = useState(false);
  const [kalibrasyonAcik, setKalibrasyonAcik] = useState(false);
  const [periyodikDestek, setPeriyodikDestek] = useState<boolean | null>(null);

  useEffect(() => {
    navigator.serviceWorker?.getRegistration().then((r) => setPeriyodikDestek(!!r && 'periodicSync' in r));
  }, []);

  const siluetSecildi = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setSiluetIsleniyor(true);
    const kesit = await arkaPlanSil(await kucult(f, 1200));
    setSiluetIsleniyor(false);
    if (!kesit) return toast('Arka plan silinemedi. Düz bir duvar önünde, boydan bir fotoğraf dene.');
    await ayarGuncelle({ siluet: kesit, gorunum: 'siluet' });
    toast('Silüet kaydedildi. Kombin kartında "Üzerimde"yi seç.');
  };

  const bildirimDegistir = async () => {
    if (ayarlar.bildirim) {
      await ayarGuncelle({ bildirim: false });
      const r = await navigator.serviceWorker?.getRegistration();
      await (r as PeriyodikKayit | undefined)?.periodicSync?.unregister('sabah-kombin').catch(() => {});
      return toast('Sabah bildirimi kapatıldı.');
    }
    if (!('Notification' in window)) return toast('Bu tarayıcı bildirim desteklemiyor.');
    if ((await Notification.requestPermission()) !== 'granted') return toast('Bildirim izni verilmedi.');
    await ayarGuncelle({ bildirim: true });
    const r = (await navigator.serviceWorker?.getRegistration()) as PeriyodikKayit | undefined;
    try {
      if (!r?.periodicSync) throw new Error();
      await r.periodicSync.register('sabah-kombin', { minInterval: 6 * 60 * 60 * 1000 });
      setPeriyodikDestek(true);
      toast('Sabah bildirimi açık.');
    } catch {
      setPeriyodikDestek(false);
      toast('Bu cihaz arka planda bildirim zamanlayamıyor.');
    }
  };

  const denemeBildirimi = async () => {
    const r = await navigator.serviceWorker?.getRegistration();
    if (!r?.active) return toast('Önce uygulamayı ana ekrana ekleyip oradan aç.');
    r.active.postMessage({ tip: 'sabah-deneme' });
  };

  useEffect(() => {
    navigator.storage?.persisted?.().then(setKalici).catch(() => setKalici(null));
  }, []);

  useEffect(() => {
    const q = sorgu.trim();
    if (q.length < 2) return setSonuclar([]);
    const t = setTimeout(() => sehirAra(q).then(setSonuclar).catch(() => setSonuclar([])), 300);
    return () => clearTimeout(t);
  }, [sorgu]);

  const sehirSec = async (s: { ad: string; enlem: number; boylam: number }) => {
    await ayarGuncelle({ sehir: { ad: s.ad, enlem: s.enlem, boylam: s.boylam }, sonHava: undefined });
    setSorgu('');
    setSonuclar([]);
    toast(`Şehir: ${s.ad}`);
  };

  const konumKullan = () => {
    if (!navigator.geolocation) return toast('Konum desteklenmiyor. Şehri elle seçebilirsin.');
    navigator.geolocation.getCurrentPosition(
      (p) => sehirSec({ ad: 'Konumum', enlem: p.coords.latitude, boylam: p.coords.longitude }),
      () => toast('Konum izni verilmedi. Şehri elle seçebilirsin.'),
      { timeout: 10000 },
    );
  };

  const istatistik = useMemo(() => {
    const aktif = kiyafetler?.filter((k) => k.durum === 'aktif') ?? [];
    const son30 = aktif.filter((k) => k.sonGiyilme != null && Date.now() - k.sonGiyilme < 30 * GUN).length;
    const enCok = [...aktif].sort((a, b) => b.giyilmeSayisi - a.giyilmeSayisi).filter((k) => k.giyilmeSayisi > 0).slice(0, 5);
    return { toplam: aktif.length, son30, enCok };
  }, [kiyafetler]);

  const yedekGun = gunOnce(ayarlar.sonYedek ?? null);

  return (
    <main className="yigin" style={{ gap: 20 }}>
      <h1 className="ekran-basligi">Ben</h1>

      <section className="kutu">
        <h2 className="bolum-basligi">Şehir</h2>
        <p className="soluk" style={{ margin: '4px 0 12px' }}>Şu an: <strong style={{ color: 'var(--ink)' }}>{ayarlar.sehir.ad}</strong></p>
        <input className="metin-girdi" placeholder="Şehir ara (Ankara, İstanbul…)" value={sorgu} onChange={(e) => setSorgu(e.target.value)} aria-label="Şehir ara" />
        {sonuclar.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0 }}>
            {sonuclar.map((s) => (
              <li key={`${s.enlem},${s.boylam}`}>
                <button className="btn hayalet tam" style={{ justifyContent: 'flex-start' }} onClick={() => sehirSec(s)}>
                  {s.ad} <span className="soluk kucuk">{s.bolge}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="btn tam" style={{ marginTop: 8 }} onClick={konumKullan}><Ikon ad="konum" /> Konumumu kullan</button>
      </section>

      <section className="kutu">
        <h2 className="bolum-basligi">Soğuğa / sıcağa hassasiyet</h2>
        <p className="soluk" style={{ margin: '4px 0 0' }}>{HASSASIYET[ayarlar.hassasiyet + 2]}</p>
        <div className="kaydirici" style={{ maxWidth: '100%' }}>
          <span>Üşüyen</span>
          <input type="range" min={-2} max={2} step={1} value={ayarlar.hassasiyet} onChange={(e) => ayarGuncelle({ hassasiyet: Number(e.target.value) })} aria-label="Hassasiyet" aria-valuetext={HASSASIYET[ayarlar.hassasiyet + 2]} />
          <span>Sıcak tutan</span>
        </div>
      </section>

      <section className="kutu">
        <h2 className="bolum-basligi" style={{ marginBottom: 12 }}>Tema</h2>
        <div className="sekmeler" role="group" aria-label="Tema">
          {TEMALAR.map((t) => (
            <button key={t.id} aria-pressed={ayarlar.tema === t.id} onClick={() => ayarGuncelle({ tema: t.id })}>{t.ad}</button>
          ))}
        </div>
      </section>

      <section className="kutu">
        <h2 className="bolum-basligi">Silüetim</h2>
        <p className="soluk" style={{ margin: '4px 0 12px', fontSize: 14 }}>
          Boydan bir fotoğrafın arka planı silinip saklanır; kombinleri üzerinde görürsün. Gerçek deneme değil, oran ve renk hissi verir. Fotoğraf cihazdan çıkmaz.
        </p>
        {ayarlar.siluet && (
          <div className="onizleme" style={{ height: 240 }}>
            <img src={parcaUrl('__siluet', ayarlar.siluet)} alt="Silüetin" />
          </div>
        )}
        <input ref={siluetGirdi} type="file" accept="image/*" hidden onChange={siluetSecildi} />
        <div style={{ display: 'grid', gridTemplateColumns: ayarlar.siluet ? '1fr 1fr' : '1fr', gap: 8 }}>
          <button className="btn" disabled={siluetIsleniyor} onClick={() => siluetGirdi.current?.click()}>
            {siluetIsleniyor ? <><span className="donen" /> İşleniyor</> : ayarlar.siluet ? 'Değiştir' : 'Boydan fotoğraf ekle'}
          </button>
          {ayarlar.siluet && (
            <button className="btn hayalet tehlike" onClick={() => ayarGuncelle({ siluet: undefined, gorunum: 'kolaj' })}>Kaldır</button>
          )}
        </div>
      </section>

      <section className="kutu">
        <div className="liste-satir">
          <h2 className="bolum-basligi" id="b-bildirim">Sabah bildirimi</h2>
          <button type="button" role="switch" className="anahtar" aria-labelledby="b-bildirim" aria-checked={ayarlar.bildirim} onClick={bildirimDegistir} />
        </div>
        <p className="soluk" style={{ margin: '4px 0 0', fontSize: 14 }}>
          "Bugün hava soğuk, kombinin hazır." Sabah 6-11 arası, günde bir kez.
          {periyodikDestek === false && ' Bu cihaz arka planda zamanlanmış bildirimi desteklemiyor (iPhone ve masaüstü Safari gibi); uygulamayı açınca kombinin zaten hazır.'}
          {periyodikDestek && ' Android Chrome\'da ana ekrana eklenmiş uygulamada çalışır; saati tarayıcı belirler.'}
        </p>
        {ayarlar.bildirim && <button className="baglanti" style={{ marginTop: 8 }} onClick={denemeBildirimi}>Deneme bildirimi gönder</button>}
      </section>

      <section className="kutu">
        <h2 className="bolum-basligi">İstatistik</h2>
        <div className="liste-satir"><span>Dolaptaki parça</span><strong className="num">{istatistik.toplam}</strong></div>
        <div className="liste-satir"><span>Son 30 günde giyilen</span><strong className="num">{istatistik.son30} / {istatistik.toplam}</strong></div>
        <div className="bar" aria-hidden="true"><span style={{ width: `${istatistik.toplam ? (istatistik.son30 / istatistik.toplam) * 100 : 0}%` }} /></div>
        {istatistik.enCok.length > 0 && (
          <>
            <h3 className="kucuk soluk" style={{ margin: '16px 0 4px', fontFamily: 'var(--f-body)' }}>En çok giyilen 5 parça</h3>
            {istatistik.enCok.map((k) => (
              <div key={k.id} className="liste-satir">
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="renk-noktasi" style={{ background: k.renkler[0]?.hex }} /> {buyukHarf(`${k.renkAdi} ${k.tur}`)}
                </span>
                <span className="num soluk">{k.giyilmeSayisi} kez</span>
              </div>
            ))}
          </>
        )}
      </section>

      <section className="kutu">
        <h2 className="bolum-basligi">Yedekle / Geri yükle</h2>
        <p className="soluk" style={{ margin: '4px 0 12px', fontSize: 14 }}>
          Tüm parçalar, kombinler, günlük ve zevk profili tek dosyada.
          {yedekGun == null ? ' Henüz yedek almadın.' : ` Son yedek: ${yedekGun === 0 ? 'bugün' : `${yedekGun} gün önce`}.`}
          {yedekGun != null && yedekGun > 30 && <strong style={{ color: 'var(--thread)' }}> Yeni yedek zamanı.</strong>}
        </p>
        {kalici === false && (
          <div className="uyari" style={{ marginBottom: 12 }}>
            Tarayıcı veriyi kalıcı saklamayı henüz onaylamadı. iPhone'da uygulamayı ana ekrana ekle ve düzenli yedek al.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="btn ana" onClick={async () => { await yedekIndir(); toast('Yedek indirildi.'); }}>Yedekle</button>
          <button className="btn" onClick={() => dosya.current?.click()}>Geri yükle</button>
        </div>
        <input
          ref={dosya}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            if (!confirm('Geri yükleme şu anki tüm verinin yerine geçer. Devam edilsin mi?')) return;
            try {
              await yedekYukle(f);
              toast('Yedek geri yüklendi.');
            } catch (err) {
              toast(err instanceof Error ? err.message : 'Yedek okunamadı.');
            }
          }}
        />
      </section>

      <section className="kutu">
        <h2 className="bolum-basligi">Otomatik etiketleme</h2>
        <p className="soluk" style={{ margin: '4px 0 12px', fontSize: 14 }}>
          Ara sunucu adresi (worker/ klasörü). Boş bırakırsan tür ve etiketleri sen seçersin, renkler yine otomatik çıkar.
        </p>
        <input
          className="metin-girdi"
          type="url"
          inputMode="url"
          placeholder="https://gardirop-etiket.ornek.workers.dev"
          defaultValue={ayarlar.etiketSunucusu}
          onBlur={(e) => ayarGuncelle({ etiketSunucusu: e.target.value.trim() })}
          aria-label="Etiket sunucusu adresi"
        />
      </section>

      <section className="kutu">
        <h2 className="bolum-basligi">Zevk profili</h2>
        <p className="soluk" style={{ margin: '4px 0 12px', fontSize: 14 }}>
          Giyeceğim, Kaydet ve Geç dokunuşlarından sessizce öğrenir. Yanlış öğrendiyse sıfırla; "Bir daha gösterme" listesi de temizlenir.
        </p>
        <button className="btn tam" style={{ marginBottom: 8 }} onClick={() => setKalibrasyonAcik(true)}>Zevk kalibrasyonunu tekrarla</button>
        <button
          className="btn tehlike tam"
          onClick={async () => {
            if (!confirm('Zevk profili sıfırlansın mı?')) return;
            await db.zevk.put({ ...BOS_ZEVK, guncellendi: Date.now() });
            toast('Zevk profili sıfırlandı.');
          }}
        >
          Zevk profilini sıfırla
        </button>
      </section>

      <p className="kucuk soluk" style={{ textAlign: 'center' }}>Gardırop v{__SURUM__} · Veriler bu cihazda</p>

      <Panel acik={kalibrasyonAcik} kapat={() => setKalibrasyonAcik(false)} baslik="Zevk kalibrasyonu">
        <Kalibrasyon karsilama={false} bitti={() => { setKalibrasyonAcik(false); toast('Zevk profili güncellendi.'); }} />
      </Panel>
    </main>
  );
}
