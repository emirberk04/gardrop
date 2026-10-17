import type { Desen, Kategori, Kesim, Kiyafet, Mevsim, Seviye } from '../db/types';
import { hexToLab, RENK_ADLARI } from '../lib/renk';
import { DESEN_ADI, KATEGORI_ADI, KESIM_ADI, MEVSIM_KISA, TURLER, buyukHarf, turBul } from '../lib/turler';

export type Etiketler = Pick<
  Kiyafet,
  'kategori' | 'tur' | 'renkAdi' | 'notr' | 'renkler' | 'desen' | 'formalite' | 'sicaklik' | 'mevsim' | 'kesim' | 'suGecirmez'
>;

const KATEGORILER: Kategori[] = ['ust', 'alt', 'dis', 'ayakkabi', 'tek_parca', 'aksesuar'];
const MEVSIMLER: Mevsim[] = ['ilkbahar', 'yaz', 'sonbahar', 'kis'];

type Props = { deger: Etiketler; degistir: (e: Etiketler) => void };

/** Kıyafet etiketleri: tek alan yanlışsa dokunup düzeltilir (bölüm 4.3). */
export function EtiketFormu({ deger, degistir }: Props) {
  const set = (d: Partial<Etiketler>) => degistir({ ...deger, ...d });

  const turSec = (ad: string) => {
    const t = turBul(ad);
    if (!t) return set({ tur: ad });
    // Tür seçilince formalite, kalınlık ve mevsim katalogdan dolar
    set({
      tur: t.ad,
      kategori: t.kategori,
      formalite: t.formalite,
      sicaklik: t.sicaklik,
      mevsim: t.mevsim,
      suGecirmez: t.suGecirmez ?? false,
    });
  };

  const renkSec = (ad: string) => {
    const r = RENK_ADLARI.find((x) => x.ad === ad);
    if (!r) return;
    const ilk = { hex: r.hex, lab: hexToLab(r.hex), pay: deger.renkler[0]?.pay ?? 1 };
    set({ renkAdi: r.ad, notr: r.notr, renkler: [ilk, ...deger.renkler.slice(1)] });
  };

  const turler = TURLER.filter((t) => t.kategori === deger.kategori);
  const anaHex = deger.renkler[0]?.hex ?? RENK_ADLARI.find((r) => r.ad === deger.renkAdi)?.hex;

  return (
    <div>
      <div className="alan dikey">
        <span className="etiket">Kategori</span>
        <div className="chipler sar">
          {KATEGORILER.map((k) => (
            <button key={k} type="button" className="chip kucuk-chip" aria-pressed={deger.kategori === k} onClick={() => set({ kategori: k, tur: '' })}>
              {KATEGORI_ADI[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="alan">
        <label htmlFor="f-tur">Tür</label>
        <select id="f-tur" value={deger.tur} onChange={(e) => turSec(e.target.value)} aria-invalid={!deger.tur}>
          <option value="" disabled>Seç</option>
          {turler.map((t) => <option key={t.ad} value={t.ad}>{buyukHarf(t.ad)}</option>)}
          {deger.tur && !turler.some((t) => t.ad === deger.tur) && <option value={deger.tur}>{buyukHarf(deger.tur)}</option>}
        </select>
      </div>
      <div className="alan">
        <label htmlFor="f-renk" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Renk {anaHex && <span className="renk-noktasi" style={{ background: anaHex }} />}
        </label>
        <select id="f-renk" value={deger.renkAdi} onChange={(e) => renkSec(e.target.value)}>
          {!deger.renkAdi && <option value="">Seç</option>}
          {RENK_ADLARI.map((r) => <option key={r.ad} value={r.ad}>{buyukHarf(r.ad)}</option>)}
        </select>
      </div>
      <div className="alan dikey">
        <span className="etiket">Desen</span>
        <div className="chipler sar">
          {(Object.keys(DESEN_ADI) as Desen[]).map((d) => (
            <button key={d} type="button" className="chip kucuk-chip" aria-pressed={deger.desen === d} onClick={() => set({ desen: d })}>
              {DESEN_ADI[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="alan">
        <label htmlFor="f-form">Ortam</label>
        <div className="kaydirici">
          <span>Günlük</span>
          <input id="f-form" type="range" min={1} max={5} step={1} value={deger.formalite} onChange={(e) => set({ formalite: Number(e.target.value) as Seviye })} aria-valuetext={`${deger.formalite} / 5`} />
          <span>Şık</span>
        </div>
      </div>
      <div className="alan">
        <label htmlFor="f-sic">Kalınlık</label>
        <div className="kaydirici">
          <span>İnce</span>
          <input id="f-sic" type="range" min={1} max={5} step={1} value={deger.sicaklik} onChange={(e) => set({ sicaklik: Number(e.target.value) as Seviye })} aria-valuetext={`${deger.sicaklik} / 5`} />
          <span>Kalın</span>
        </div>
      </div>
      <div className="alan">
        <span className="etiket">Mevsim</span>
        <div className="chipler sar" style={{ justifyContent: 'flex-end' }}>
          {MEVSIMLER.map((m) => (
            <button
              key={m}
              type="button"
              className="chip kucuk-chip"
              aria-pressed={deger.mevsim.includes(m)}
              onClick={() => set({ mevsim: deger.mevsim.includes(m) ? deger.mevsim.filter((x) => x !== m) : [...deger.mevsim, m] })}
            >
              {MEVSIM_KISA[m]}
            </button>
          ))}
        </div>
      </div>
      <div className="alan">
        <span className="etiket">Kesim</span>
        <div className="chipler sar" style={{ justifyContent: 'flex-end' }}>
          {(Object.keys(KESIM_ADI) as Kesim[]).map((k) => (
            <button key={k} type="button" className="chip kucuk-chip" aria-pressed={deger.kesim === k} onClick={() => set({ kesim: k })}>
              {KESIM_ADI[k]}
            </button>
          ))}
        </div>
      </div>
      <div className="alan">
        <span className="etiket" id="f-su">Su geçirmez</span>
        <button type="button" role="switch" className="anahtar" aria-labelledby="f-su" aria-checked={deger.suGecirmez} onClick={() => set({ suGecirmez: !deger.suGecirmez })} />
      </div>
    </div>
  );
}
