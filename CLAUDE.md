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
- **`exchangeInstagramCode` aynı (ownerUid, igUserId) için var olan `igAccounts`
  dokümanını GÜNCELLER, yeni doküman oluşturmaz** (bkz.
  `functions/src/callable/exchangeInstagramCode.ts`). Bunu bozarsan token
  süresi dolan bir hesabı "yeniden bağlan" ile düzeltmek, eski kuralların
  işaret ettiği `igAccountId`'yi güncellemeden yeni bir hesap doğurur ve
  mevcut kurallar sonsuza kadar kırık kalır.

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
| `app/.env` | `app/.env.example`'dan kopyala, Firebase/Meta/RevenueCat/Google public config değerlerini doldur |
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

## Google/Apple ile giriş

Kod tarafı tamamlandı (`app/src/services/socialAuth.ts`,
`app/src/components/SocialAuthButtons.tsx`), ama ikisi de **dış kurulum**
tamamlanmadan çalışmaz:

- **Google:** `@react-native-google-signin/google-signin` kullanıyor (expo-auth-session'ın
  kendi Google provider'ı deprecated). Firebase Console > Authentication > Sign-in
  method > Google'ı aç, oradan çıkan **Web client ID**'yi `app/.env` →
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`'ye yaz. Değer boşsa Google butonu arayüzde
  hiç görünmez (bkz. `isGoogleSignInAvailable()`), hata fırlatmaz.
- **Apple:** `expo-apple-authentication` kullanıyor. Apple Developer hesabında
  "Sign in with Apple" capability'sini açman lazım (`app.config.ts`'te
  `ios.usesAppleSignIn: true` zaten ayarlı, EAS Build bunu otomatik entitlement'a
  çevirir). Sadece iOS'ta ve gerçek cihazda/Apple hesabı bağlı simülatörde çalışır.

Her ikisi de Expo Go'da DEĞİL, sadece bir **development build / EAS Build**'de
çalışır (native modül içeriyorlar).

## Facebook/Telefon ile giriş

Kod tarafı tamamlandı (`app/src/services/socialAuth.ts`'te
`signInWithFacebook`, `app/src/services/phoneAuth.ts`), ama ikisi de **dış
kurulum** tamamlanmadan çalışmaz:

- **Facebook:** `react-native-fbsdk-next` kullanıyor (`expo-auth-session`'ın
  Facebook provider'ı deprecated). Aynı Meta App'i (Instagram Graph API
  bağlama için zaten var olan, `EXPO_PUBLIC_META_APP_ID`) kullanır — ayrı bir
  Facebook App gerekmiyor. Meta App Dashboard > Settings > Advanced >
  Security'den **Client Token**'ı al, `app/.env` →
  `EXPO_PUBLIC_META_CLIENT_TOKEN`'a yaz; ayrıca aynı app'e **Facebook Login**
  ürününü ekleyip Firebase Console > Authentication > Sign-in method >
  Facebook'u Meta App ID + Secret ile aç. Değer boşsa Facebook butonu
  arayüzde hiç görünmez (bkz. `isFacebookSignInAvailable()`).
- **Telefon/OTP:** Native Firebase Phone Auth kullanıyor
  (`@react-native-firebase/auth`) — Twilio/Netgsm gibi SMS sağlayıcıları
  değil, çünkü onlar SMS başına ücretlendiriyor, native Firebase Phone Auth
  Google'ın karşıladığı makul kullanım kotası dahilinde ücretsiz. Bu, mevcut
  `firebase/auth` JS SDK'nın yanına ikinci bir native Firebase Auth sistemi
  eklemek demek — `phoneAuth.ts`'teki köprüleme deseni (RNFirebase ile
  doğrula → `mintCustomTokenForPhoneAuth` Cloud Function'ı ile custom token
  üret → JS SDK'da `signInWithCustomToken`) **bozulmadan korunmalı**, aksi
  halde iki ayrı oturum sistemi senkronsuz kalır. Firebase Console'da
  Authentication > Sign-in method > Phone'u aç, Android için SHA-1/SHA-256
  fingerprint ekle, iOS için APNs Authentication Key yükle, Google Cloud
  Console'da Play Integrity API'yi etkinleştir.

Üçü de (Google/Apple/Facebook/Telefon) Expo Go'da DEĞİL, sadece bir
**development build / EAS Build**'de çalışır (native modül içeriyorlar) —
Facebook/Telefon eklendiğinde mevcut dev-client build'i geçersiz kalır,
`google-services.json`/`GoogleService-Info.plist` Firebase Console'dan
indirilip `app/`'e konduktan sonra yeni bir `eas build --profile
development` gerekir.

## Henüz yapılmayanlar (bilerek MVP dışında bırakıldı)

- Test/lint altyapısı kurulmadı (Jest, ESLint) — proje büyüdükçe eklenmeli.
- Sektörel şablonlar, çoklu Instagram hesabı yönetimi, AI şablon önerisi arayüzü,
  push bildirimleri (gönderim tarafı — tercih toggle'ı `users/{uid}.notificationsEnabled`
  olarak zaten duruyor): PLAN.md'de v1.1/v2 kapsamında.
