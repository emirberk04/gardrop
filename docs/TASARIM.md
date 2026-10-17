# Gardırop: Tasarım ve Ürün Dokümanı

Kişisel, telefonda kullanılan, yapay zekâ destekli kombin uygulaması.
Tek kullanıcı (Emir), önce PWA, ucuz ve çoğu iş cihazda.

---

## 1. Amaç

**Problem:** Dolapta çok kıyafet var, ne giyeceğime karar veremiyorum, birçoğu hiç giyilmiyor.

**Çözüm:** Tüm kıyafetlerim telefonda dijital bir gardırop olarak durur. Uygulama, elimdeki parçalardan mantıklı kombinlerin hepsini üretir, bugünün havasına göre süzer, en şık olanları öne koyar. Ben sadece seçerim.

**Başarı ölçütü (3 ay sonra):**
- Sabah kombin seçmek 30 saniyeden kısa sürüyor.
- Haftada giydiğim farklı parça sayısı artıyor.
- "Hiç giymediğim" parça sayısı düşüyor.

---

## 2. Dört temel ilke

1. **Bir kez öğret, hep hatırla.** Kıyafetler, kombinler ve beğenilerim cihazda kalıcı saklanır. Uygulama her açılışta sıfırdan başlamaz, her seferinde bana bir şey sormaz.
2. **Abartısız şıklık.** Cesur ve riskli kombinler değil, en iyi görünen ve en rahat giyilen kombinler önde olur.
3. **Tek elle, 10 saniyede.** Ana akış başparmak bölgesinde, bir iki dokunuşla biter.
4. **Ucuz.** Ağır işler (arka plan silme, renk çıkarma, kombin skorlama) cihazda ve kodla yapılır. Yapay zekâ sadece her kıyafet için bir kez etiketlemede kullanılır.

---

## 3. Kalıcı hafıza: uygulama nasıl öğrenir ve unutmaz

Bu bölüm uygulamanın kalbi.

### 3.1 Ne kaydedilir (hepsi cihazda, IndexedDB)

| Kayıt | İçerik |
|---|---|
| Kıyafetler | Fotoğraf, arka planı silinmiş hali, renk, tür, formalite, kalınlık, mevsim, desen, giyilme sayısı |
| Kombinler | Hangi parçalardan oluştuğu, skoru, durumu (önerildi, kaydedildi, giyildi, reddedildi) |
| Giyme günlüğü | Hangi gün hangi kombini giydim, hava neydi |
| Zevk profili | Renk çiftleri, tür çiftleri, formalite tercihi için öğrenilmiş ağırlıklar |
| Ayarlar | Şehir, sıcaklık hassasiyeti, tema, ortam tercihleri |

### 3.2 Öğrenme sinyalleri

Ben normal kullanımda bir şeye basarım, uygulama bunu sessizce öğrenir. Ayrı bir "eğitim" ekranı yok.

| Dokunuş | Anlamı | Zevk profiline etkisi |
|---|---|---|
| **Giyeceğim** | En güçlü olumlu sinyal | +3 |
| **Kaydet** (kalp) | Beğendim | +2 |
| Kartı sağa kaydırıp **geçmeden** uzun bakmak | Zayıf olumlu (isteğe bağlı) | +0.5 |
| **Geç** | Bu sefer değil | −1 |
| **Bir daha gösterme** | Bu iki parça birlikte olmasın | −5 (o çift için kalıcı) |

Öğrenme iki seviyede olur:
- **Çift seviyesi:** "Bu gömlek + bu pantolon" gibi somut çiftler.
- **Genel seviye:** "Lacivert + bej", "keten gömlek + kot" gibi renk ve tür örüntüleri. Böylece yeni eklenen bir parça, benzerlerinin geçmişinden hazır bir zevk puanı alır.

Güncelleme ağır değil, hareketli ortalama: `yeni = eski × 0.9 + sinyal × 0.1`. Tek bir kötü gün zevk profilini bozmaz.

### 3.3 İlk açılışta zevk kalibrasyonu (30 saniye, bir kez)

Boş dolapla başlayınca uygulama bir şey bilmez. Bunu çözmek için kurulumda tek seferlik 8 kartlık bir kalibrasyon: 8 örnek kombin, her biri için "Bana uyar" / "Uymaz". Sonuç zevk profilinin başlangıç değerleri olur. Sonra sürekli öğrenir, kalibrasyon bir daha sorulmaz (Ben sekmesinden istenirse tekrarlanabilir).

### 3.4 Yeni parça eklenince ne olur

1. Sadece **yeni parçayı içeren** kombinler üretilir (hepsi baştan hesaplanmaz).
2. Bu kombinler mevcut zevk profiliyle skorlanır.
3. Dolap ekranında bildirim: **"Yeni gömleğinle 14 kombin hazır"**. Dokununca bu kombinler açılır.
4. Eski kayıtlar, kaydedilmiş kombinler ve giyme günlüğü değişmez.

### 3.5 Sağlamlık kuralları

- Bir parçayı silersem, onu içeren **geçmiş kayıtlar bozulmaz**: parça "arşiv" durumuna geçer, giyme günlüğünde görünmeye devam eder, yeni kombinlerde çıkmaz.
- Bir parçanın etiketini düzeltirsem (renk, tür), skorlar yeniden hesaplanır ama **geri bildirim geçmişi silinmez**.
- İlk açılışta `navigator.storage.persist()` istenir, tarayıcının veriyi kendiliğinden silmesi engellenir.
- **iPhone uyarısı:** Safari, ana ekrana eklenmeyen sitelerin verisini bir süre kullanılmayınca silebilir. Bu yüzden uygulama ana ekrana eklenmeli ve **yedekleme** özelliği olmalı (bölüm 9).

---

## 4. Ekranlar ve gezinme

Alt gezinme çubuğu, 5 öğe. Ortadaki **＋** kıyafet ekleme düğmesi.

```
Bugün · Dolap · ＋ · Kombinler · Ben
```

Tüm ana eylemler ekranın alt yarısında (başparmak bölgesi). Üst yarı sadece bilgi gösterir.

### 4.1 Bugün (açılış ekranı)

Uygulama her zaman buraya açılır. Soru: **"Bugün ne giysem?"**

```
┌──────────────────────────────────┐
│ Cumartesi, 17 Ekim               │
│ ☁ Konya · 14° · yağmur %20       │
├──────────────────────────────────┤
│ Bugün için 12 kombin             │
│ ┌──────────────────────────────┐ │
│ │            [ ceket ]         │ │
│ │  [ gömlek ]      [ pantolon ]│ │
│ │            [ ayakkabı ]      │ │
│ │                              │ │
│ │  Çok şık · 14° için uygun    │ │
│ └──────────────────────────────┘ │
│  ○ ● ○ ○ ○ ○                     │
│                                  │
│   ✕ Geç     ♡ Kaydet    ✓ Giyeceğim │
├──────────────────────────────────┤
│ Bugün  Dolap   ＋   Kombin   Ben │
└──────────────────────────────────┘
```

- Kart yatay kaydırılır. Sağa kaydır: kaydet. Sola kaydır: geç. Aşağıdaki üç düğme aynı işi yapar (erişilebilirlik için).
- Kartın altındaki **"Neden?"** satırına dokununca kısa gerekçe açılır: "Lacivert ve bej nötr uyum", "14° için ceket gerekli", "Bu pantolonu 12 gündür giymedin".
- Şık/rahat ince göstergesi yok. Skor etiketle gösterilir: **Çok şık / Şık / Olur**. Çıplak sayı gösterilmez.
- Ortam seçici (üstte küçük chip): Günlük, Okul, Staj, Dışarı, Şık. Seçim hatırlanır.

### 4.2 Dolap

```
┌──────────────────────────────────┐
│ Dolabım · 47 parça        🔍     │
│ [Hepsi][Üst][Alt][Dış][Ayakkabı] │
│ [Giyilmeyenler]                  │
├──────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │      │ │      │ │      │       │
│ │ foto │ │ foto │ │ foto │       │
│ │  ●   │ │  ●   │ │  ●   │       │
│ └──────┘ └──────┘ └──────┘       │
│ Gömlek   Kot      Mont           │
│ ● 3 gün  ● 41 gün                │
└──────────────────────────────────┘
```

- 3 sütunlu ızgara, arka planı silinmiş fotoğraflar.
- Altta renk noktası ve **"son giyilme"** bilgisi. 30 günden uzun süredir giyilmeyenlerde iplik turuncusu bir nokta.
- **Giyilmeyenler** filtresi, "boşa giden kıyafet" derdinin doğrudan cevabı.
- Parçaya dokununca alttan açılan detay paneli: büyük foto, etiketler (düzenlenebilir), "Bu parçayla kombinler" düğmesi.

### 4.3 Kıyafet ekleme (＋)

Kamera açılır, parçayı çek. Arka plan otomatik silinir, etiketler önceden doldurulur. Ben sadece onaylarım.

```
┌──────────────────────────────────┐
│ ✕                  Yeni parça    │
│        ┌──────────────┐          │
│        │   [kıyafet]  │          │
│        └──────────────┘          │
│ Tür       Gömlek             ›   │
│ Renk      ● Lacivert         ›   │
│ Desen     Düz                ›   │
│ Ortam     Günlük ──●── Şık       │
│ Kalınlık  İnce ───●─── Kalın     │
│ Mevsim    [İlk][Yaz][Son][Kış]   │
│                                  │
│  [ Kaydet ve sıradaki parça ]    │
└──────────────────────────────────┘
```

- **Seri ekleme modu:** 10 parçayı art arda çek, sonra hepsini tek tek onayla. 40 parçalık dolap bir akşamda girilir.
- Tek alan yanlışsa dokunup düzeltilir. Hepsi doğruysa tek dokunuş.
- Etiketleme sırasında yükleme göstergesi, işlem arka planda sürer, bir sonraki parçayı çekmeye devam edebilirim.

### 4.4 Kombinler

Üretilen **tüm** mantıklı kombinlerin yeri.

```
┌──────────────────────────────────┐
│ Kombinler         [Kaydedilenler]│
│ [Hava ✓][Günlük][Okul][Staj]     │
│ Sırala: En şık ▾                 │
├──────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐    │
│ │   kolaj    │ │   kolaj    │    │
│ │ Çok şık    │ │ Şık        │    │
│ └────────────┘ └────────────┘    │
│ ┌────────────┐ ┌────────────┐    │
│ │   kolaj    │ │   kolaj    │    │
│ └────────────┘ └────────────┘    │
└──────────────────────────────────┘
```

- **Hava ✓** açıkken sadece bugünün havasına uygun kombinler listelenir (varsayılan açık).
- Sıralama seçenekleri: **En şık**, **Uzun süredir giymediğin**, **Yeni eklenenler**, **Bende en çok giyilen**.
- **Kaydedilenler** sekmesi: kalp koyduğum kombinler.
- Uzun basınca: "Bir daha gösterme", "Kaydet", "Giydim".

### 4.5 Ben

- Şehir (otomatik konum reddedilirse elle seçilir. Varsayılan: Konya)
- Soğuğa/sıcağa hassasiyet kaydırıcısı (üşüyen ↔ sıcak tutan)
- Tema: Sistem / Açık / Koyu
- Zevk kalibrasyonunu tekrarla
- **Yedekle / Geri yükle**
- İstatistik: giyilen / giyilmeyen oranı, en çok giyilen 5 parça

### 4.6 Durumlar

| Durum | Ne gösterilir |
|---|---|
| Dolap boş | "İlk parçanı ekle", büyük ＋ düğmesi, 3 maddelik çekim ipucu |
| Dolapta çok az parça (< 6) | "Kombin üretmek için en az bir üst, bir alt ve bir ayakkabı lazım" |
| Hava alınamadı | Son bilinen hava + "Şehri elle seç" bağlantısı |
| Çevrimdışı | Uygulama aynen çalışır, sadece hava eski veriyle gösterilir |
| Etiketleme başarısız | Parça kaydedilir, etiketler boş gelir, elle doldurulur, "Yeniden dene" düğmesi |
| Kombin bulunamadı | "Bugünün havasına uygun kombin çıkmadı. Eksik olan: kalın bir üst" gibi somut bir eksik bilgisi |

---

## 5. Görsel tasarım sistemi

**Yön:** Sakin, ferah, kumaşın kendisini öne çıkaran bir arayüz. Kıyafet fotoğrafları süs, arayüz çerçeve. Renk paleti denimden ve dikişten gelir: indigo mavi ve iplik turuncusu.

### 5.1 Renk

Açık tema:

| Token | Değer | Kullanım |
|---|---|---|
| `--bg` | `#F1F3F0` | Sayfa arka planı (hafif yeşilimsi nötr) |
| `--surface` | `#FFFFFF` | Kartlar, paneller |
| `--ink` | `#1B1F1D` | Ana metin |
| `--ink-soft` | `#5E6661` | İkincil metin |
| `--line` | `#DDE1DC` | Çizgiler |
| `--denim` | `#2F3E6B` | Ana vurgu: düğmeler, aktif sekme |
| `--thread` | `#D9792B` | İkincil vurgu: "uzun süredir giyilmedi", yeni parça rozeti |

Koyu tema:

| Token | Değer |
|---|---|
| `--bg` | `#121513` |
| `--surface` | `#1C201E` |
| `--ink` | `#ECEEE9` |
| `--ink-soft` | `#9BA39D` |
| `--line` | `#2B312D` |
| `--denim` | `#8FA3DB` |
| `--thread` | `#F0A15E` |

Anlamsal renkler (vurgudan ayrı): olumlu `#3E8E5E`, uyarı `#C9962B`, hata `#C4473A`.

Kural: kıyafet fotoğrafları arayüzün en renkli şeyi olmalı. Arayüz renkleri bilerek sessiz tutulur, fotoğrafın renk algısını bozmasın.

### 5.2 Tipografi

- **Başlıklar:** Bricolage Grotesque (600). Karakterli ama okunaklı.
- **Gövde ve etiketler:** Manrope (400, 500, 600).
- Türkçe karakterler (ğ, ş, ı, İ, ö, ü, ç) için Google Fonts'ta `latin-ext` alt kümesi yüklenmeli. Yedek yığın: `system-ui, sans-serif`.

| Rol | Boyut / ağırlık |
|---|---|
| Ekran başlığı | 26px / 600 |
| Bölüm başlığı | 18px / 600 |
| Gövde | 16px / 400 (iOS'ta 16px altı giriş alanları sayfayı yakınlaştırır, bu yüzden alt sınır 16px) |
| Etiket / chip | 14px / 600 |
| Küçük not | 13px / 500 |

Sayılarda `font-variant-numeric: tabular-nums` (sıcaklık, parça sayısı, gün sayısı).

### 5.3 Boşluk, şekil, dokunma

- Boşluk ölçeği: 4 · 8 · 12 · 16 · 24 · 32.
- Yan boşluk 16px, `env(safe-area-inset-*)` ile çentik ve ana ekran çubuğuna saygı.
- **Dokunma hedefi en az 48×48px.** Alt çubuk ve eylem düğmeleri 56px.
- Köşe yarıçapı rol başına: kombin kartı 20px, küçük kart 14px, chip tam yuvarlak, düğme 16px. Her şeye aynı yarıçap verilmez.
- Gölge sadece yüzen öğelerde (＋ düğmesi, alttan açılan paneller). Kartlar ince çizgiyle ayrılır.

### 5.4 Bileşenler

- **Kombin kartı:** kıyafetler beyaz zeminde, düz yerleşim (flat-lay) düzeninde. Altında skor etiketi ve tek satır gerekçe.
- **Kıyafet kartı:** kare oran (1:1), nesne ortada, altında tür ve son giyilme.
- **Chip:** filtre ve seçim için. Seçiliyken `--denim` zemin, beyaz metin.
- **Alttan açılan panel (bottom sheet):** tüm detay ve düzenleme burada açılır. Tam ekran modal yok, panel başparmakla kapatılır (aşağı çek).
- **Renk noktası:** parçanın baskın rengi, 10px.
- **Skor etiketi:** "Çok şık" (denim dolgu), "Şık" (denim çerçeve), "Olur" (gri çerçeve).
- **Rozetler:** `Yeni` ve `Giyilmedi` iplik turuncusu.

### 5.5 Hareket

- Kart kaydırma: parmakla birlikte hareket, bırakınca yay animasyonu, 200 ms.
- Panel açılma: aşağıdan, 250 ms.
- Kalp ve "Giyeceğim" onayında tek küçük ölçek animasyonu (kısa, abartısız).
- `prefers-reduced-motion` açıksa tüm animasyonlar anında geçişe döner.

### 5.6 Erişilebilirlik

- Metin kontrastı en az 4.5:1, iki temada da.
- Her kaydırma hareketinin düğme karşılığı var.
- Odak halkası görünür (klavye ve harici cihaz için).
- Renk bilgisi tek başına anlam taşımaz: renk noktasının yanında renk adı da yazılır.

### 5.7 Dil ve ton

Kısa, düz Türkçe. Eylem düğmesi ne olacağını söyler: **"Giyeceğim"**, **"Kaydet"**, **"Bir daha gösterme"**. Hata mesajı ne olduğunu ve ne yapılacağını söyler: "Hava alınamadı. Şehri elle seçebilirsin."

---

## 6. Veri modeli

```ts
type Kiyafet = {
  id: string;
  foto: Blob;              // orijinal (küçültülmüş, WebP)
  kesit: Blob;             // arka planı silinmiş hali
  eklendi: number;         // zaman damgası
  kategori: 'ust' | 'alt' | 'dis' | 'ayakkabi' | 'aksesuar' | 'tek_parca';
  tur: string;             // tişört, gömlek, kazak, kot, kumaş pantolon...
  renkler: { hex: string; lab: [number, number, number]; pay: number }[]; // baskın 1-3
  renkAdi: string;         // lacivert, bej, haki...
  notr: boolean;           // siyah/beyaz/gri/bej/lacivert/kahve/haki
  desen: 'duz' | 'cizgili' | 'ekose' | 'desenli' | 'baskili';
  formalite: 1 | 2 | 3 | 4 | 5;   // 1 çok günlük, 5 çok şık
  sicaklik: 1 | 2 | 3 | 4 | 5;    // kalınlık: 1 çok ince, 5 çok kalın
  mevsim: ('ilkbahar' | 'yaz' | 'sonbahar' | 'kis')[];
  kesim: 'dar' | 'normal' | 'bol';
  suGecirmez: boolean;
  giyilmeSayisi: number;
  sonGiyilme: number | null;
  durum: 'aktif' | 'arsiv';
  elleDuzeltildi: boolean;
};

type Kombin = {
  id: string;
  parcalar: string[];      // Kiyafet id'leri
  skor: number;            // 0-100, sadece sıralama için, kullanıcıya etiket olarak gösterilir
  durum: 'oneri' | 'kayitli' | 'giyildi' | 'reddedildi' | 'asla';
  olusturuldu: number;
};

type GiymeKaydi = {
  tarih: string;           // YYYY-MM-DD
  kombinId: string;
  hava: { hissedilen: number; yagmur: number; ruzgar: number };
};

type ZevkProfili = {
  renkCifti: Record<string, number>;   // "lacivert|bej" -> ağırlık
  turCifti: Record<string, number>;    // "gomlek|kot" -> ağırlık
  parcaCifti: Record<string, number>;  // "idA|idB" -> ağırlık
  formaliteTercihi: number;
  guncellendi: number;
};
```

Depolama: IndexedDB (Dexie kütüphanesiyle). Fotoğraflar 600px WebP'ye küçültülür, parça başına yaklaşık 40-80 KB. 200 parça ≈ 15 MB, rahatça sığar.

---

## 7. Kombin motoru

Çoğu kodla çalışır, yapay zekâ gerekmez. Cihazda bir Web Worker içinde çalışır, arayüzü dondurmaz.

### 7.1 Üretim

1. **Şablonlar:** üst + alt + ayakkabı. Soğukta + dış giyim. Tek parça (elbise/tulum) + ayakkabı. İsteğe bağlı aksesuar.
2. **Sert eleme** (aşağıdakileri sağlamayan kombin hiç oluşmaz):
   - Formalite farkı ≤ 1 (spor ayakkabı + takım elbise ceketi olmaz).
   - Mevsim ve sıcaklık bugünün havasına uygun (hava filtresi açıksa).
   - Yağmur varsa su geçirmez ayakkabı ya da yağmurluk tercih (zorunlu değil, skora yansır).
3. **Skorlama** (bölüm 7.2) ve **çeşitlilik süzmesi:** ilk 12'de aynı üstün 5 kez tekrarlanması engellenir (MMR benzeri: skor yüksek ama öncekilere çok benzeyen kombin geriye itilir).

Ölçek örneği: 10 üst × 8 alt × 6 ayakkabı × 4 dış giyim = 1920 kombin. Sert elemeden sonra birkaç yüze iner, skorlama 200 ms altında biter.

### 7.2 Skor formülü (başlangıç ağırlıkları, ayarlanabilir)

```
skor = 0.30 × renkUyumu
     + 0.20 × formaliteUyumu
     + 0.20 × havaUyumu
     + 0.10 × desenUyumu
     + 0.20 × kisiselZevk
     + yenilikBonusu        (−0.00 … +0.10)
     − tekrarCezasi         (0 … 0.15)
```

| Bileşen | Nasıl hesaplanır |
|---|---|
| **renkUyumu** | Bölüm 7.3 |
| **formaliteUyumu** | Parçalar arası formalite farkı küçüldükçe yüksek. Seçili ortamla ortalama formalite örtüşürse bonus |
| **havaUyumu** | Toplam sıcaklık puanı hedef aralığa ne kadar yakın (bölüm 7.4). Yağmur ve rüzgâr için küçük düzeltme |
| **desenUyumu** | Aynı kombinde en fazla 1 belirgin desen. İki desen çakışırsa düşük puan. Düz + desenli en iyi |
| **kisiselZevk** | Zevk profilindeki parça çifti, renk çifti ve tür çifti ağırlıklarının ortalaması |
| **yenilikBonusu** | Uzun süredir giyilmeyen parçalar + yeni eklenen parçalar için küçük bonus. "Boşa giden kıyafet" sorununun doğrudan çözümü |
| **tekrarCezasi** | Son 7 günde giyilen aynı kombin ya da aynı üst için ceza |

Skor kullanıcıya sayı olarak gösterilmez, eşik değerlerle **Çok şık / Şık / Olur** etiketine çevrilir.

### 7.3 Renk uyumu kuralları

Renkler CIELAB uzayında karşılaştırılır (insan algısına yakın), ton ve doygunluk için HSL ile desteklenir.

| Durum | Puan |
|---|---|
| Hepsi nötr (siyah, beyaz, gri, bej, lacivert, kahve, haki) | Yüksek |
| Nötr ağırlıklı + en fazla **1 vurgu rengi** | Yüksek (en şık ve güvenli) |
| Tek renk ailesi, farklı tonlar (monokrom) | Yüksek |
| Birbirine yakın renkler (analog) | Orta-yüksek |
| Tamamlayıcı renkler (karşıt), biri baskın biri vurgu | Orta |
| 2 veya daha fazla parlak vurgu rengi | Düşük (elenmez ama sona düşer) |
| Çok yakın ama aynı olmayan tonlar (ör. iki farklı mavi) | Düşük (kötü "neredeyse eşleşme") |
| Açık-koyu dengesi (üst açık/alt koyu ya da tersi) | Bonus |

"Abartı olmasın" isteği bu tabloda çözülür: skor yüksek olanlar zaten sade ve dengeli kombinler.

### 7.4 Hava eşlemesi

Kaynak: **Open-Meteo** (ücretsiz, anahtar gerekmez, ticari olmayan kullanım). Hissedilen sıcaklık, yağmur olasılığı, rüzgâr alınır.

| Hissedilen sıcaklık | Hedef toplam sıcaklık puanı | Tipik katmanlar |
|---|---|---|
| ≥ 26° | 1-2 | Tişört, ince pantolon/şort |
| 20-25° | 2-3 | Tişört, ince gömlek |
| 14-19° | 3-5 | Gömlek/kazak + ceket |
| 8-13° | 5-7 | Kazak + mont |
| 0-7° | 7-9 | Kalın kazak + mont + bere |
| < 0° | 9+ | Tam kış katmanı |

Bunlar başlangıç değerleri. Ben sekmesindeki "üşüyen ↔ sıcak tutan" kaydırıcısı hedef aralığı yukarı/aşağı kaydırır.
Yağmur olasılığı > %50 ise: su geçirmez ayakkabı ve yağmurluk skoru artar, süet/kumaş ayakkabı düşer.
Konum izni verilmezse şehir elle seçilir (varsayılan Konya).

### 7.5 "Beni orada göster"

Üç aşama:

1. **MVP (ücretsiz):** Arka planı silinmiş kıyafetler, düz yerleşimle (flat-lay) bir kolaj olarak gösterilir. Üstte ceket/üst, ortada alt, altta ayakkabı.
2. **Sonraki adım (ücretsiz):** Boydan bir fotoğrafım çekilip silüet olarak kaydedilir, kıyafetler bu silüetin üzerine yerleştirilir. Gerçek bir deneme değil, oran ve renk hissi verir.
3. **İsteğe bağlı (ücretli):** Sadece beğendiğim kombinler için tek seferlik gerçek sanal deneme (try-on) servisi. Her kombin için otomatik çalıştırılmaz, hem pahalı hem tutarsız sonuç verebilir. Kullanmadan önce kalitesi birkaç kombinle denenmeli.

---

## 8. Kıyafet ekleme hattı

```
Fotoğraf → küçült (WebP) → arka planı sil → renk çıkar → etiketle → onayla → kaydet
              cihazda         cihazda         cihazda     AI (1 kez)   kullanıcı
```

| Adım | Nasıl | Maliyet |
|---|---|---|
| Çekim | Gün ışığı, düz zemin (yatak örtüsü/zemin), parça düz serili ya da askıda, her seferinde aynı açı. **AI ile güzelleştirmeye gerek yok.** | Ücretsiz |
| Arka plan silme | Tarayıcıda çalışan `@imgly/background-removal` (ilk kullanımda model iner, sonra çevrimdışı çalışır) | Ücretsiz |
| Renk çıkarma | Kesit üzerinde k-means ile baskın 1-3 renk, LAB'a çevir, renk adına eşle | Ücretsiz |
| Etiketleme | Kesit görsel, ucuz bir görsel model (Claude Haiku ya da Gemini Flash sınıfı) ile bir kez: tür, desen, formalite, kalınlık, mevsim | Parça başına çok küçük tutar, 100 parça birkaç lira mertebesinde (güncel fiyatı kontrol et) |
| Onay | Alanlar önceden dolu gelir, ben düzeltirim | Ücretsiz |

Etiketleme isteği API anahtarını gizlemek için küçük bir ara sunucudan geçer (Cloudflare Worker ya da Vercel fonksiyonu, ücretsiz katman yeterli). Anahtar uygulama koduna gömülmez.

**Gizlilik:** Orijinal fotoğraflar cihazda kalır. Sadece arka planı silinmiş kesit etiketleme için gönderilir.

Çekim ipuçları (uygulamada ilk çekimde gösterilir):
- Pencere önünde, doğrudan güneş değil yumuşak gün ışığı.
- Kıyafet düz zeminde, buruşuksuz.
- Her parça kadrajın ortasında, kenarlara taşmadan.
- Tüm parçalar aynı yükseklikten çekilsin.

---

## 9. Teknik mimari

| Katman | Seçim | Neden |
|---|---|---|
| Uygulama | **PWA**, React + Vite | React biliyorsun, ana ekrana eklenir, mağaza gerekmez |
| Yerel veri | IndexedDB (Dexie) | Çevrimdışı, backend gerekmez, ücretsiz |
| Kombin motoru | Web Worker (TypeScript) | Arayüz donmaz |
| Hava | Open-Meteo | Ücretsiz, anahtarsız |
| Etiketleme | Vision API + ince ara sunucu | Anahtarı gizler, ücretsiz katman yeter |
| Yayın | Cloudflare Pages / Vercel | Ücretsiz |
| Çevrimdışı | Service worker (vite-plugin-pwa) | Önbelleğe alınmış uygulama kabuğu |

**Yedekleme:** Ben sekmesinde "Yedekle" tek dokunuşla tüm veriyi (parçalar, kombinler, günlük, zevk profili) tek dosya olarak dışa aktarır. "Geri yükle" aynı dosyayı içe alır. Düzenli yedek hatırlatması: ayda bir.
Bulut senkron (telefon + bilgisayar) sonraki aşama: Supabase ya da Cloudflare R2 ücretsiz katmanı.

**Performans hedefleri:**
- Uygulama açılışı: < 1.5 sn (önbellekten)
- 2000 kombin üretme ve skorlama: < 300 ms
- Dolap ızgarası: 200 parçada akıcı kaydırma (görseller tembel yüklenir)

**Aylık maliyet:** barındırma 0 TL, hava 0 TL, etiketleme parça başına birkaç kuruş. Toplam kullanım için birkaç lira.

---

## 10. Yol haritası

| Sürüm | İçerik | Sonuç |
|---|---|---|
| **v0.1 Dolap** | Fotoğraf çek, arka plan sil, renk çıkar, etiketle, onayla, ızgarada göster, kalıcı kayıt | Dolabım telefonda |
| **v0.2 Bugün** | Kombin motoru (renk, formalite, hava), Open-Meteo, Bugün ekranı, kolaj gösterimi | "Bugün ne giysem" cevabı |
| **v0.3 Öğrenme** | Giyeceğim / Kaydet / Geç / Bir daha gösterme, zevk profili, kalibrasyon, Kombinler ekranı, yeni parça bildirimi | Uygulama beni tanıyor |
| **v0.4 Güvence** | Yedekle / geri yükle, giyilmeyenler filtresi, istatistik, depolama koruması | Veri güvende, boşa giden parçalar görünür |
| **v1.0 Cila** | Silüet üzerinde gösterim, koyu tema inceliği, bildirim ("bugün hava soğuk, kombinin hazır") | Günlük kullanım rahatlığı |
| **Sonra** | Bulut senkron, isteğe bağlı sanal deneme, kapsül gardırop önerileri | Genişleme |

**İlk hedef:** 20-30 parçayla v0.1 ve v0.2. Önce küçük dolapla çalıştır, motoru bu veriyle ayarla, sonra tüm dolabı ekle.

---

## 11. Kabul ölçütleri (MVP bitti sayılması için)

- [ ] Bir parçayı çekip 15 saniye içinde onaylayıp dolaba ekleyebiliyorum.
- [ ] Uygulamayı kapatıp açınca tüm parçalar ve kombinler yerinde.
- [ ] Bugün ekranı havaya uygun en az 5 kombin gösteriyor (dolapta yeterli parça varsa).
- [ ] Hiçbir kombinde iki parlak vurgu rengi ve iki desen birlikte öne çıkmıyor.
- [ ] "Bir daha gösterme" dediğim çift tekrar gelmiyor.
- [ ] Yeni parça ekleyince o parçayla yeni kombinler birkaç saniyede hazır.
- [ ] Çevrimdışıyken dolap ve kombinler açılıyor.
- [ ] Tüm ekranlar 390px genişlikte yatay kaydırma olmadan, tek elle kullanılabiliyor.
- [ ] Açık ve koyu temada metinler okunuyor.

---

## 12. Riskler ve açık sorular

| Konu | Not |
|---|---|
| Arka plan silme kalitesi | Koyu zemin üzerinde koyu kıyafet ya da beyaz kıyafet zorlayabilir. Çekim ipuçlarıyla azaltılır, kötü kesit için "yeniden çek" düğmesi |
| AI etiket hatası | Etiketler önceden dolu gelir ama onay ekranında düzeltilir. Yanlışı birkaç kez düzeltince benzer hata azalır |
| iPhone depolama silinmesi | Ana ekrana ekleme + `storage.persist()` + düzenli yedek |
| Zevk profilinin erken yanlış öğrenmesi | Hareketli ortalama ile tek günlük sapma yumuşatılır, ayarlardan sıfırlanabilir |
| Sanal deneme kalitesi | İsteğe bağlı, ayrı aşamada, önce küçük denemeyle |

**Karar bekleyen:**
1. Hava için şehir: Konya mı Ankara mı varsayılan olsun, yoksa konuma göre otomatik mi?
2. Ortam listesi (Günlük, Okul, Staj, Dışarı, Şık) senin gerçek günlerine uyuyor mu?
3. Zevk kalibrasyonunda kaç kombin sorulsun (öneri: 8)?
4. Kıyafet fiyatı girmek ister misin? (Giyim başına maliyet hesabı için, isteğe bağlı bir sonraki aşama)
