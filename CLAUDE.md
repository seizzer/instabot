# CLAUDE.md — Instabot

Instagram yorum → otomatik cevap + buton/dosya destekli DM otomasyonu SaaS'ı.
Ürün planı, veri modeli ve rakip analizi için **PLAN.md**'ye bak. Meta Developer
panelinde elle yapılması gereken adımlar için **META_SETUP.md**'ye bak. Bu dosya
sadece kod tabanına özel kurallar ve mimari kararlar içindir.

## Monorepo yapısı

```
app/                     React Native (Expo, TypeScript) mobil uygulama
functions/                Firebase Cloud Functions (TypeScript, europe-west3)
vercel-gemini-proxy/      Gemini API için tek gateway (Vercel, Node)
firestore.rules           Firestore güvenlik kuralları (repo kökünde)
firestore.indexes.json    Composite index tanımları
firebase.json / .firebaserc
PLAN.md                   Ürün/mimari planı
META_SETUP.md             Meta Developer panelinde elle yapılacak adımlar
```

Üç proje (`app`, `functions`, `vercel-gemini-proxy`) birbirinden bağımsız
`package.json`'a sahip ayrı Node projeleridir — kök dizinde ortak bir
`package.json`/workspace yok.

## Kesin mimari kararlar (bunları değiştirmeden önce PLAN.md'yi güncelle)

- **Instagram Graph API dışında hiçbir yol yok.** Scraping/unofficial API yasak.
- **Cloud Functions bölgesi her zaman `europe-west3`.** `functions/src/lib/admin.ts`
  içindeki `REGION` sabiti tüm fonksiyonlara geçiliyor — yeni bir fonksiyon
  eklerken region'ı unutma.
- **`igAccountsSecrets` koleksiyonuna hiçbir client asla erişemez** (bkz.
  `firestore.rules`). Instagram access token'ları sadece Cloud Functions'ın
  Admin SDK'sı üzerinden okunur/yazılır. Bu kuralı gevşetme.
- **Gemini API'ye tek giriş noktası `vercel-gemini-proxy`.** Ne mobil app ne de
  Cloud Functions Gemini key'ini asla doğrudan tutmaz; ikisi de proxy'yi
  `x-proxy-secret` header'ı ile çağırır. Yeni bir AI özelliği eklerken bu
  proxy'ye yeni bir `api/*.ts` route eklemek doğru yaklaşımdır — Cloud
  Functions'tan doğrudan Gemini çağrısı yapma.
- **DM akışı (`dmFlow`) düz (flat) bir node haritasıdır**, ağaç yapısı sadece
  `button.targetNodeId` referanslarıyla kurulur. Yeni bir node eklerken
  `dmFlow.nodes` map'ine flat şekilde ekle, iç içe (nested) obje yapma —
  `app/src/utils/dmFlow.ts` ve `functions/src/lib/dmFlowRuntime.ts` bu
  varsayıma göre yazıldı.
- **Buton kısıtı: en fazla 3 buton** (Instagram generic template limiti).
  `DmNodeEditor` ve `graphApi.ts`'teki `toGraphButtons` bunu zaten kırpıyor;
  UI tarafında da 3'ten fazla eklenmesine izin verme.
- **Private reply/DM sadece yorumdan itibaren 7 gün içinde** gönderilebilir
  (Meta kısıtı). `dmError` alanına yazılan hatalar genelde bu yüzdendir —
  kullanıcıya "tekrar dene" değil, "bu yorum çok eski" gibi bir mesaj göster.
- **Freemium: 1 gönderi ücretsiz.** `subscriptions/{uid}.freePostUsed` bayrağı
  client'ın kendi güncelleyebildiği tek alan (bkz. `firestore.rules`); geri
  kalan abonelik alanları sadece RevenueCat webhook'undan (Admin SDK) gelir.
- **`app/src/types/models.ts` ve `functions/src/lib/types.ts` birbirinin
  kopyasıdır**, paylaşılan bir paket yok. Firestore şemasında bir alan
  değiştirirsen İKİSİNİ DE güncelle.

## Kodlama standartları

- TypeScript `strict: true` — hem `app` hem `functions` hem proxy'de.
  Tip hatası olan kod merge edilmez.
- Yeni yazılan hiçbir metin doğrudan RN component içine hardcode edilmez —
  `app/src/i18n/locales/tr.json` + `en.json`'a eklenip `t('...')` ile çağrılır.
  TR birincil dil, her yeni key iki dosyaya da eklenmelidir.
- Renk/boşluk/tipografi değerleri `app/src/theme/theme.ts`'ten gelir, ekran
  dosyalarında hex kod veya sabit sayı yazma.
- Yorum yazma alışkanlığı: sadece WHY açıklaması gerektiğinde tek satır yorum
  (örn. Meta API kısıtları, tsc/typing tuhaflıkları). Neyin ne yaptığını
  anlatan yorum yazma, isimlendirme bunu zaten söylemeli.
- Türkçe kelime eşleştirmesi her zaman `normalizeTurkish` /
  `commentMatchesKeyword` üzerinden yapılır (`functions/src/lib/textMatch.ts`).
  `.toLowerCase()` doğrudan kullanma — Türkçe İ/I harflerinde yanlış sonuç verir.

## Ortam değişkenleri / secrets

| Yer | Nasıl ayarlanır |
|---|---|
| `app/.env` | `app/.env.example`'dan kopyala, Firebase/Meta/RevenueCat public config değerlerini doldur |
| Cloud Functions secrets | `firebase functions:secrets:set META_APP_ID` (ve `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN`, `GEMINI_PROXY_URL`, `GEMINI_PROXY_SHARED_SECRET`, `REVENUECAT_WEBHOOK_SECRET`) — bkz. `functions/src/lib/secrets.ts` |
| `vercel-gemini-proxy/.env` (Vercel dashboard'da Environment Variables) | `.env.example`'dan kopyala: `GEMINI_API_KEY`, `GEMINI_MODEL`, `PROXY_SHARED_SECRET`, `RATE_LIMIT_PER_MINUTE` |

`GEMINI_PROXY_SHARED_SECRET` (functions) ve `PROXY_SHARED_SECRET` (vercel proxy)
**aynı değer** olmalı — biri diğerini doğrulamak için kullanılıyor.

## Çalıştırma

```bash
# Mobil app
cd app && npm start            # Expo dev server
cd app && npm run android|ios  # emülatör/cihaz

# Cloud Functions (yerel emülatör)
cd functions && npm run serve

# Cloud Functions (deploy)
cd functions && npm run deploy

# Gemini proxy (yerel)
cd vercel-gemini-proxy && npm run dev   # vercel dev

# Firestore rules/indexes deploy
firebase deploy --only firestore
```

`.firebaserc` içindeki `instabot-app` proje ID'si bir yer tutucudur — gerçek
Firebase projesini oluşturunca (META_SETUP.md / Firebase Console) bu dosyayı
güncelle.

## Henüz yapılmayanlar (bilerek MVP dışında bırakıldı)

- Google/Apple ile giriş: `app/src/services/auth.ts` içinde stub olarak duruyor,
  gerçek OAuth config'i (expo-auth-session + Google/Apple developer hesabı)
  gerektirir.
- Test/lint altyapısı kurulmadı (Jest, ESLint) — proje büyüdükçe eklenmeli.
- Sektörel şablonlar, çoklu Instagram hesabı yönetimi, AI şablon önerisi arayüzü:
  PLAN.md'de v1.1/v2 kapsamında.
