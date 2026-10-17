# Gardırop

Kişisel, telefonda kullanılan, yapay zekâ destekli kombin uygulaması (PWA).
Dolaptaki parçalardan mantıklı kombinlerin hepsini üretir, bugünün havasına göre süzer,
en şık olanları öne koyar. Tasarım ve ürün dokümanı: [docs/TASARIM.md](docs/TASARIM.md).

## Telefonda kullanmak

Uygulama `main` dalına her push'ta GitHub Actions ile **https://emirberk04.github.io/gardrop/**
adresine yayınlanır (`.github/workflows/pages.yml`). Bir kerelik ayar (repo sahibi yapar):

1. **Settings → General → Danger Zone → Change visibility → Public.**
   Ücretsiz planda GitHub Pages sadece herkese açık repolarda çalışır. Kodda gizli bilgi yok;
   API anahtarı repoda değil, etiketleme sunucusunda saklanır. Kıyafet fotoğrafların repoda değil,
   sadece telefonunda durur.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
3. **Actions → "Yayınla (GitHub Pages)" → Run workflow** (ya da `main`'e yeni bir push).

Sonra telefonda adresi aç:
- **iPhone (Safari):** Paylaş → Ana Ekrana Ekle. Uygulamayı hep ana ekrandaki simgeden aç;
  Safari, ana ekrana eklenmeyen sitelerin verisini bir süre sonra silebilir.
- **Android (Chrome):** menü → Uygulamayı yükle.

Repo gizli kalacaksa alternatif: Cloudflare Pages ya da Vercel gizli repoyu ücretsiz yayınlar
(build `npm run build`, çıktı `dist`).

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # kombin motoru, kalibrasyon ve sabah bildirimi testleri
npm run build      # dist/
```

## Durum

| Sürüm | İçerik |
|---|---|
| v0.1 Dolap | Fotoğraf çek / galeriden seri ekle, 600px WebP'ye küçült, cihazda arka plan silme, k-means ile renk çıkarma ve Türkçe renk adı, tür kataloğundan otomatik dolan etiketler, isteğe bağlı AI etiketleme, 3 sütunlu ızgara, detay paneli, düzenleme, arşiv |
| v0.2 Bugün | Web Worker'da kombin motoru (şablonlar, sert eleme, renk/formalite/hava/desen/zevk skoru, yağmur etkisi, yenilik bonusu, tekrar cezası, MMR çeşitlilik, isteğe bağlı aksesuar), Open-Meteo, kaydırmalı kart, "Neden?" gerekçeleri, flat-lay kolaj |
| v0.3 Öğrenme | Giyeceğim / Kaydet / Geç / Bir daha gösterme / uzun bakış sinyalleri, hareketli ortalamalı zevk profili, ilk açılışta 8 kartlık kalibrasyon (Ben'den tekrarlanır), Kombinler ekranı, yeni parça bildirimi |
| v0.4 Güvence | Yedekle / geri yükle (silüet dahil), aylık yedek hatırlatması, giyilmeyenler filtresi, istatistik, `storage.persist()` |
| v1.0 Cila | Silüet üzerinde gösterim ("Üzerimde"), açık/koyu/sistem tema, sabah bildirimi, çevrimdışı uygulama kabuğu, PNG ana ekran ikonları |
| Sonra | Bulut senkron, ücretli sanal deneme, kapsül gardırop (dokümanda da "sonra" aşaması) |

**Bilinen sınırlar**
- Sabah bildirimi Android Chrome'da, ana ekrana eklenmiş uygulamada çalışır; saati tarayıcı seçer
  (uygulama 06-11 arası, günde bir kez gösterir). iPhone arka planda zamanlanmış bildirime izin vermez;
  bunun için bir push sunucusu gerekir (sonraki aşama). iPhone'da uygulamayı açınca kombin zaten hazır.
- Arka plan silme modeli ilk parçada bir kez iner (~40 MB), sonra çevrimdışı çalışır.
- Skor eşikleri ve silüet oranları başlangıç değerleri; gerçek dolapla ayarlanmalı.

## Yapı

```
src/
  db/          veri modeli (bölüm 6) ve Dexie veritabanı
  engine/      kombin motoru: üretim, skor, renk ve hava uyumu, zevk profili, worker
  lib/         renk (CIELAB, k-means), görsel işleme, hava, tür kataloğu, eylemler, yedekleme
  components/  panel (bottom sheet), kolaj, etiket formu, ikonlar
  screens/     Bugün, Dolap, Ekle, Kombinler, Ben
  styles/      tasarım sistemi (bölüm 5)
worker/        AI etiketleme ara sunucusu (Cloudflare Worker, Claude Haiku)
```

## AI etiketleme (isteğe bağlı)

Etiketleme sunucusu olmadan da uygulama tam çalışır: renkler otomatik çıkar, türü seçince
formalite, kalınlık ve mevsim katalogdan dolar. Otomatik tür/desen tahmini için:

```bash
cd worker
npm install
npx wrangler secret put ANTHROPIC_API_KEY
# wrangler.toml içinde IZINLI_KOKEN'i uygulamanın yayın adresi yap (ör. https://gardrop.pages.dev)
npx wrangler deploy
```

Çıkan adresi uygulamada **Ben → Otomatik etiketleme** alanına yaz. Sunucuya sadece arka planı
silinmiş kesit gider; orijinal fotoğraflar cihazda kalır.

## Karar bekleyenler (TASARIM.md bölüm 12)

1. Varsayılan şehir **Ankara** (karar verildi); Ben ekranından arama ya da "Konumumu kullan" ile değişir.
2. Ortamlar: Günlük, Okul, Staj, Dışarı, Şık.
3. Kalibrasyon 8 kart.
4. Kıyafet fiyatı alanı yok.
