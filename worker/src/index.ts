import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';

// Gardırop etiketleme ara sunucusu (docs/TASARIM.md bölüm 8).
// Uygulama sadece arka planı silinmiş kesiti gönderir; API anahtarı burada, gizli kalır.

type Env = { ANTHROPIC_API_KEY: string; IZINLI_KOKEN: string };

const Etiket = z.object({
  kategori: z.enum(['ust', 'alt', 'dis', 'ayakkabi', 'aksesuar', 'tek_parca']),
  tur: z.string(),
  desen: z.enum(['duz', 'cizgili', 'ekose', 'desenli', 'baskili']),
  formalite: z.number().int().min(1).max(5),
  sicaklik: z.number().int().min(1).max(5),
  mevsim: z.array(z.enum(['ilkbahar', 'yaz', 'sonbahar', 'kis'])),
  kesim: z.enum(['dar', 'normal', 'bol']),
  suGecirmez: z.boolean(),
});

// Uygulamadaki tür kataloğuyla aynı adlar (src/lib/turler.ts), böylece seçim kutusunda doğrudan eşleşir.
const TURLER =
  'tişört, polo, gömlek, keten gömlek, oduncu gömlek, uzun kollu tişört, sweatshirt, kapüşonlu, triko, kazak, ' +
  'balıkçı yaka, hırka, kot, chino, kumaş pantolon, keten pantolon, kargo pantolon, eşofman altı, şort, etek, ' +
  'ceket, blazer, kot ceket, deri ceket, overshirt, bomber, yağmurluk, trençkot, mont, şişme mont, kaban, ' +
  'spor ayakkabı, sneaker, loafer, klasik ayakkabı, bot, süet ayakkabı, sandalet, elbise, tulum, bere, şapka, atkı, kemer';

const SISTEM = `Bir gardırop uygulaması için tek bir kıyafet fotoğrafını etiketliyorsun.
Fotoğrafta arka planı silinmiş tek bir parça var. Alanlar:
- kategori: ust (tişört, gömlek, kazak…), alt (pantolon, şort, etek), dis (ceket, mont, kaban), ayakkabi, aksesuar, tek_parca (elbise, tulum).
- tur: şu listeden en yakın olanı, aynen yazıldığı gibi: ${TURLER}.
- desen: duz, cizgili, ekose, desenli (çiçek, puantiye vb.), baskili (yazı/grafik baskı).
- formalite 1-5: 1 çok günlük (eşofman, spor tişört), 3 smart casual, 5 çok şık (takım ceketi, klasik ayakkabı).
- sicaklik 1-5: kumaşın kalınlığı ve sıcak tutması; 1 çok ince (keten tişört), 5 çok kalın (şişme mont, kaban).
- mevsim: giyilebileceği mevsimler, bir ya da birkaç.
- kesim: dar, normal, bol.
- suGecirmez: sadece yağmurluk, trençkot, deri/kauçuk bot gibi açıkça su geçirmeyen parçalar için true.
Emin olmadığın alanda en olası değeri seç; kullanıcı onay ekranında düzeltebilir.`;

const MEDYA = ['image/webp', 'image/png', 'image/jpeg'] as const;

function cors(env: Env, istek: Request) {
  const koken = istek.headers.get('origin') ?? '';
  return {
    'access-control-allow-origin': koken === env.IZINLI_KOKEN ? koken : env.IZINLI_KOKEN,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    vary: 'origin',
  };
}

const json = (veri: unknown, durum: number, basliklar: Record<string, string>) =>
  new Response(JSON.stringify(veri), { status: durum, headers: { 'content-type': 'application/json', ...basliklar } });

export default {
  async fetch(istek: Request, env: Env): Promise<Response> {
    const h = cors(env, istek);
    if (istek.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const url = new URL(istek.url);
    if (istek.method !== 'POST' || url.pathname !== '/etiketle') return json({ hata: 'Bulunamadı' }, 404, h);
    if (istek.headers.get('origin') !== env.IZINLI_KOKEN) return json({ hata: 'İzin yok' }, 403, h);

    const { gorsel } = (await istek.json().catch(() => ({}))) as { gorsel?: string };
    const eslesme = gorsel?.match(/^data:(image\/[a-z]+);base64,(.+)$/);
    const medya = eslesme?.[1] as (typeof MEDYA)[number] | undefined;
    if (!eslesme || !medya || !MEDYA.includes(medya)) return json({ hata: 'Geçersiz görsel' }, 400, h);
    if (eslesme[2].length > 1_500_000) return json({ hata: 'Görsel çok büyük' }, 413, h);

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const yanit = await client.messages.parse({
        model: 'claude-haiku-5-5',
        max_tokens: 1024,
        output_config: { effort: 'low', format: zodOutputFormat(Etiket) },
        system: SISTEM,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: medya, data: eslesme[2] } },
              { type: 'text', text: 'Bu parçayı etiketle.' },
            ],
          },
        ],
      });
      if (yanit.stop_reason === 'refusal' || !yanit.parsed_output) {
        return json({ hata: 'Etiketlenemedi' }, 422, h);
      }
      return json(yanit.parsed_output, 200, h);
    } catch (hata) {
      if (hata instanceof Anthropic.RateLimitError) return json({ hata: 'Çok fazla istek, biraz sonra dene' }, 429, h);
      if (hata instanceof Anthropic.APIError) return json({ hata: 'Etiketleme servisi hatası' }, 502, h);
      throw hata;
    }
  },
} satisfies ExportedHandler<Env>;
