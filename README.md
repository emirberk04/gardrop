# Gardırop

Kişisel, telefonda kullanılan, yapay zekâ destekli kombin uygulaması (PWA).
Dolaptaki parçalardan mantıklı kombinlerin hepsini üretir, bugünün havasına göre süzer,
en şık olanları öne koyar. Tasarım ve ürün dokümanı: [docs/TASARIM.md](docs/TASARIM.md).

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # kombin motoru testleri
npm run build      # dist/ (Cloudflare Pages / Vercel'e statik olarak yüklenir)
```

Telefonda denemek için `npm run dev -- --host` ile aynı ağdan aç, sonra
**Paylaş → Ana Ekrana Ekle**. iPhone'da veri kalıcılığı için ana ekrana eklemek önemli (bölüm 3.5).

## Durum

| Sürüm | Durum |
|---|---|
| v0.1 Dolap | Fotoğraf çek / galeriden seri ekle, 600px WebP'ye küçült, cihazda arka plan silme (`@imgly/background-removal`), k-means ile renk çıkarma ve Türkçe renk adı, tür kataloğundan otomatik dolan etiketler, isteğe bağlı AI etiketleme, 3 sütunlu ızgara, detay paneli, düzenleme, arşiv. IndexedDB (Dexie) + `storage.persist()` |
| v0.2 Bugün | Web Worker'da kombin motoru (şablonlar, sert eleme, renk/formalite/hava/desen/zevk skoru, yenilik bonusu, tekrar cezası, MMR çeşitlilik), Open-Meteo, Bugün ekranı, kaydırmalı kart, "Neden?" gerekçeleri, flat-lay kolaj |
| v0.3 Öğrenme | Giyeceğim / Kaydet / Geç / Bir daha gösterme sinyalleri ve hareketli ortalamalı zevk profili, Kombinler ekranı, yeni parça bildirimi **hazır**. 8 kartlık zevk kalibrasyonu **yapılmadı** |
| v0.4 Güvence | Yedekle / geri yükle, giyilmeyenler filtresi, istatistik, depolama koruması **hazır**. Aylık yedek hatırlatması sadece Ben ekranında not olarak |
| v1.0 Cila | Açık/koyu/sistem tema hazır. Silüet üzerinde gösterim ve bildirimler yok |

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
# wrangler.toml içinde IZINLI_KOKEN'i uygulamanın yayın adresi yap
npx wrangler deploy
```

Çıkan adresi uygulamada **Ben → Otomatik etiketleme** alanına yaz. Sunucuya sadece arka planı
silinmiş kesit gider; orijinal fotoğraflar cihazda kalır.

## Karar bekleyenler (TASARIM.md bölüm 12)

1. Varsayılan şehir şimdilik **Konya**; Ben ekranından arama ya da "Konumumu kullan" ile değişir.
2. Ortamlar: Günlük, Okul, Staj, Dışarı, Şık.
3. Kalibrasyondaki kart sayısı (öneri 8) henüz uygulanmadı.
4. Kıyafet fiyatı alanı yok.
