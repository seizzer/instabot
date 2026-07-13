# Instabot — Ürün ve Mimari Planı

> Instagram yorum → otomatik cevap + otomatik DM SaaS'ı.
> Bu belge onay için hazırlanmıştır. Onay sonrası proje iskeleti kurulacak ve MVP kodlanmaya başlanacaktır.

---

## 1. Mimari Diyagram (metin)

```
┌───────────────────────────────┐
│        Instagram / Meta        │
│  Business/Creator hesabı       │
│  (bir Facebook Page'e bağlı)   │
│  Graph API + Webhooks          │
└───────────────┬─────────────────┘
                │ (1) yorum webhook (comments)
                ▼
┌─────────────────────────────────────────────┐
│  Firebase Cloud Functions (europe-west3)      │
│                                                │
│  instagramWebhookVerify (GET)                 │
│    hub.challenge doğrulama                    │
│                                                │
│  instagramWebhookReceive (POST)               │
│    - X-Hub-Signature-256 imza doğrulama       │
│    - 200 OK ile hemen yanıt (Meta <5sn ister) │
│    - event'i webhookEvents koleksiyonuna yazar│
│                                                │
│  processWebhookEvent (Firestore trigger)      │
│    - igAccountId çözümle                      │
│    - o hesabın aktif kurallarını çek          │
│    - keyword eşleştir VEYA (premium) AI ile   │
│      niyet sınıflandır (Vercel proxy → Gemini)│
│    - Graph API: public reply + private DM gönder│
│    - automationLogs + rule stats yaz          │
│                                                │
│  revenueCatWebhook (POST)                     │
│    - subscriptions/{uid} günceller             │
│                                                │
│  refreshInstagramTokens (scheduled, günlük)   │
│    - süresi yaklaşan long-lived token'ları     │
│      yeniler                                   │
└───────────────┬─────────────────────────────────┘
                │ Admin SDK read/write
                ▼
┌─────────────────────────────────────┐
│              Firestore                │
│  users / igAccounts / igAccountsSecrets│
│  rules / automationLogs / subscriptions│
│  webhookEvents                         │
└───────────────┬───────────────────────┘
                │ Firebase SDK (Auth + realtime listener)
                ▼
┌─────────────────────────────────────────┐
│     React Native + Expo (iOS/Android)     │
│  - Firebase Auth (email, Google, Apple)   │
│  - Firestore realtime dinleyiciler        │
│  - RevenueCat SDK (paywall/satın alma)    │
│  - i18next (tr → en)                      │
│  - AI önizleme isteği → Vercel proxy      │
└─────────────────────────────────────────────┘

┌────────────────────────┐        ┌──────────────┐
│ Vercel Proxy (Node/Edge) │──────▶│  Gemini API   │
│  - tek Gemini gateway     │◀──────│               │
│  - API key sadece burada  │        └──────────────┘
│  - kullanıcı/tier bazlı    │
│    rate limit & maliyet    │
│    kontrolü                │
│  - hem Cloud Functions hem │
│    mobil app (önizleme)    │
│    buradan çağırır          │
└────────────────────────┘
```

**Neden tek Gemini gateway (Vercel proxy) hem client hem server için?**
Mobil app'te kural oluşturma ekranında "AI ile öneri üret" gibi bir önizleme özelliği olacak (kullanıcı kaydetmeden önce AI'nin nasıl cevap vereceğini görebilsin). Bu istek client'tan gelir. Gerçek zamanlı otomasyon (webhook tetiklendiğinde) ise Cloud Functions'tan gelir. İkisini de aynı proxy'den geçirmek: (a) API key'in tek yerde tutulmasını, (b) prompt/versiyon yönetiminin merkezi olmasını, (c) kullanıcı bazlı maliyet/rate-limit kontrolünü tek noktadan yapmayı sağlar.

---

## 2. Firestore Veri Modeli

```
users/{uid}
  email: string
  displayName: string
  locale: "tr" | "en"
  createdAt: timestamp
  onboardingCompleted: boolean

igAccounts/{igAccountId}          // client okuyabilir (sadece kendi ownerUid'i)
  ownerUid: string
  igUserId: string                 // Instagram-scoped user id
  igUsername: string
  fbPageId: string
  status: "active" | "token_expired" | "revoked"
  tokenExpiresAt: timestamp
  webhookSubscribed: boolean
  connectedAt: timestamp

igAccountsSecrets/{igAccountId}   // SADECE Cloud Functions (Admin SDK) erişir, hiçbir client kuralı yok
  accessToken: string              // long-lived token
  refreshNeededAt: timestamp

rules/{ruleId}
  ownerUid: string
  igAccountId: string
  name: string
  targetScope: "all_posts" | "specific_posts"
  targetPostIds: string[]          // Graph API media id'leri
  triggerType: "keyword" | "ai_intent"     // ai_intent sadece premium
  keywords: string[]
  aiIntentTags: string[]           // örn: ["fiyat_sorma","sikayet","genel_soru"]
  publicReplyEnabled: boolean
  publicReplyText: string
  dmEnabled: boolean
  dmFlow: {                        // İNTERAKTİF DM AKIŞI (MVP çekirdek özellik)
    startNodeId: string
    nodes: {
      [nodeId: string]: {
        type: "text" | "file"
        text: string                       // {{username}} placeholder destekli
        mediaUrl: string | null            // type=file ise: gönderilecek dosya/görsel URL'i
        buttons: [                          // en fazla 3 buton (Instagram generic template kısıtı)
          {
            id: string
            label: string
            action: "reply" | "url" | "file"
            targetNodeId: string | null      // action=reply → sıradaki node
            url: string | null               // action=url
            fileUrl: string | null           // action=file
          }
        ]
      }
    }
  }
  priority: number
  status: "active" | "paused"
  stats: { commentsMatched: number, dmsSent: number, dmsFailed: number, buttonClicks: number }
  createdAt: timestamp
  updatedAt: timestamp

conversations/{conversationId}     // id = `${igAccountId}_${commenterIgId}` — buton akışının durumu
  ownerUid: string
  igAccountId: string
  ruleId: string
  commenterIgId: string
  commenterUsername: string
  currentNodeId: string
  status: "active" | "completed"
  startedAt: timestamp
  lastInteractionAt: timestamp

automationLogs/{logId}
  ownerUid: string
  igAccountId: string
  ruleId: string
  commentId: string | null         // postback event'lerde null olabilir
  commentText: string | null
  commenterIgId: string
  commenterUsername: string
  eventType: "comment_match" | "button_click"
  matchedTrigger: "keyword" | "ai"
  matchedValue: string
  publicReplySent: boolean
  dmSent: boolean
  buttonClicked: string | null     // postback button id
  dmError: string | null           // örn. "OUTSIDE_7_DAY_WINDOW"
  aiIntent: string | null
  aiConfidence: number | null
  createdAt: timestamp

subscriptions/{uid}                // RevenueCat webhook ile senkron
  tier: "free" | "pro"
  entitlementActive: boolean
  freePostUsed: boolean
  revenueCatCustomerId: string
  expiresAt: timestamp | null
  updatedAt: timestamp

webhookEvents/{eventId}            // ham event kuyruğu, kısa TTL ile temizlenir
  rawPayload: object
  processed: boolean
  receivedAt: timestamp
```

**Güvenlik kuralı prensibi:** `igAccountsSecrets` client için tamamen kapalı (Firestore rules: `allow read, write: if false`). Access token asla client'a ulaşmaz. `igAccounts` dokümanında token YOK, sadece durum bilgisi var.

---

## 3. Webhook Akışı (yorum → otomatik cevap + DM)

1. **Kurulum:** Meta, App Dashboard'da tanımlı webhook URL'ine `GET` ile `hub.challenge` gönderir → `instagramWebhookVerify` doğrular ve challenge'ı döner.
2. **Yorum geldiğinde:** Meta, `comments` alanına abone olunan IG medyasında yeni yorum olduğunda `POST` ile `instagramWebhookReceive`'e event yollar.
3. Fonksiyon:
   - `X-Hub-Signature-256` header'ını app secret ile HMAC-SHA256 doğrular, uyuşmazsa reddeder.
   - Meta 5 saniye içinde 200 bekler → ağır işi yapmadan hemen `webhookEvents`'e ham event yazıp 200 döner.
4. **`processWebhookEvent`** (Firestore `onCreate` trigger, asıl iş burada) — event tipine göre iki dal:

   **a) Yorum eşleşmesi (`comments` alanı):**
   - Event'teki IG business account id'den `igAccounts` dokümanını bulur.
   - O hesaba ait `status:"active"` kuralları `priority` sırasına göre çeker.
   - **Keyword modu:** yorum metnini Türkçe locale-aware küçük harfe çevirip (İ/I, ş/ı gibi karakterleri normalize ederek) kelime eşleştirmesi yapar.
   - **AI modu (premium, entitlement kontrolü ile):** yorum metnini Vercel proxy üzerinden Gemini'ye gönderir, niyet etiketi + doğal cevap metni alır.
   - Eşleşme varsa:
     - `publicReplyEnabled` ise → Graph API `POST /{comment-id}/replies`
     - `dmEnabled` ise → `dmFlow.startNodeId` düğümünü gönderir: metin + (varsa) en fazla 3 buton, Graph API `POST /{ig-user-id}/messages` ile **generic/button template** olarak (private reply, yorum tarihinden **7 gün** içinde olmalı — Meta kısıtı). Node `type:"file"` ise önce dosya/görsel attachment olarak yollanır.
     - `conversations/{igAccountId_commenterIgId}` dokümanı `currentNodeId = dmFlow.startNodeId`, `status:"active"` olarak oluşturulur/güncellenir.
     - `automationLogs`'a `eventType:"comment_match"` kaydı, `rules.stats` sayaçlarını artırır.
   - Eşleşme yoksa no-op.

   **b) Buton tıklaması (`messaging_postbacks` alanı):**
   - Event'teki `sender.id` (commenterIgId) ile `conversations` dokümanı bulunur.
   - Postback payload'ından `buttonId` çözülür, `rules/{ruleId}.dmFlow.nodes[currentNodeId].buttons` içinde eşleşen buton bulunur:
     - `action:"reply"` → `targetNodeId` düğümünü gönderir (yeni metin + yeni butonlar/dosya), `conversations.currentNodeId` günceller.
     - `action:"url"` → buton zaten Instagram tarafında bir web_url butonu olarak gönderilmiştir, sunucu tarafında ekstra işlem gerekmez (sadece log).
     - `action:"file"` → `fileUrl` Graph API ile attachment olarak gönderilir, akış `status:"completed"` yapılabilir (dosyadan sonra flow biterse).
   - `automationLogs`'a `eventType:"button_click"` kaydı, `rules.stats.buttonClicks` artırılır.

   Rate limit / token expiry hatalarında `igAccounts.status` güncellenir, kullanıcıya push bildirimi (v1.1) planlanır.
5. **`refreshInstagramTokens`** (günlük scheduled function): süresi 60 günlük long-lived token'ların süresine 7 günden az kalanları `GET /refresh_access_token` ile yeniler.
6. **`revenueCatWebhook`**: satın alma/iptal/yenileme event'lerinde `subscriptions/{uid}` günceller.

**Not — Instagram Messaging buton kısıtları:** Generic/button template başına en fazla 3 buton desteklenir. Buton tipleri: `web_url` (link açar, client-side) ve `postback` (sunucuya `messaging_postbacks` webhook event'i döner). Dosya/görsel gönderimi ayrı bir attachment mesajıdır (buton değildir) — bu yüzden "dosya gönder" aksiyonu, butona tıklandığında sunucunun postback alıp *ardından* dosyayı ayrı bir mesaj olarak yollamasıyla çalışır.

---

## 4. Meta App Review — Gerekli İzinler

| İzin | Neden gerekli |
|---|---|
| `instagram_basic` | Hesap/medya temel verisine erişim |
| `instagram_manage_comments` | Yorumları okuma + yoruma public reply atma |
| `instagram_manage_messages` | Yorum yapana private reply (DM) gönderme |
| `pages_show_list` | Kullanıcının yönetebileceği FB Page listesini gösterme (bağlama akışı için) |
| `pages_read_engagement` | Page'e bağlı IG hesabı ve etkileşim verisi okuma |
| `pages_manage_metadata` | Webhook abonelik (subscribe/unsubscribe) yönetimi |
| `business_management` | Business Manager üzerinden bağlı hesaplarda (bazı review senaryolarında zorunlu) |

**Webhook abonelik alanları (subscription fields):** `comments`, `messages`, `messaging_postbacks` — üçü de kayıtlı olmalı (yorum yakalama + gönderilen DM'lerdeki butonlara tıklama olaylarını almak için).

**Sabit kısıtlar (değiştirilemez, tasarımı buna göre yaptık):**
- IG Business/Creator hesabı bir **Facebook Page'e bağlı olmak zorunda** — bağlı değilse onboarding'de kullanıcı yönlendirilip önce Page bağlaması istenecek.
- Private reply (DM) sadece yorumun atıldığı tarihten **7 gün** sonrasına kadar gönderilebilir; sonrasında sadece public reply mümkün — arayüzde bu kısıt kullanıcıya açıkça anlatılacak.
- Uygulama sadece yorum yapan kişiye DM atabilir, soğuk (cold) DM yasak — ürün zaten bu şekilde tasarlandı.
- App Review başvurusundan önce Meta App Dashboard'da **Privacy Policy URL**, **Terms of Service URL**, **Data Deletion Instructions URL** tanımlı olmalı ve kullanım senaryosunu gösteren bir ekran kaydı (screencast) hazırlanmalı.
- Review onaylanana kadar uygulama sadece test kullanıcıları (App Dashboard'da tanımlı Instagram Testers) ile çalışır — bu yüzden MVP geliştirme sürecinde kendi test hesabınla ilerleyeceğiz.

Meta Developer panelinde elle yapmanız gereken adımlar ayrı bir **META_SETUP.md** dosyasında (kodlama fazına geçince) adım adım verilecek.

---

## 5. MVP Kapsamı (Faz 1)

**Dahil:**
- Firebase Auth (email/şifre + Google + Apple) ile kayıt/giriş
- Instagram Business hesabı bağlama (Graph API OAuth), Page bağlantı kontrolü
- Kural oluşturma: gönderi seç → keyword(ler) gir → public reply yaz → **DM akışı oluştur** (3+ adımlık akış)
- **İnteraktif DM akışı (çekirdek/ayırt edici özellik):** DM mesajına en fazla 3 buton eklenebilir, her butona bağımsız aksiyon tanımlanır — (a) yeni bir otomatik cevap mesajı gönder (dallanma), (b) bir link aç, (c) bir dosya/görsel gönder. Kullanıcı arayüzde bunu basit bir "sıradaki adım" sihirbazıyla kurar (ManyChat'teki gibi karmaşık bir canvas değil)
- Kural listesi: aktif/pasif toggle, düzenleme, silme
- Webhook tabanlı otomatik public reply + DM gönderimi + buton postback işleme (sadece keyword modu; AI modu premium/v1.1)
- Aktivite/log ekranı (hangi yorum, hangi kural, DM gitti mi, hangi butona tıklandı)
- Freemium: 1 gönderi ücretsiz otomasyon, sonrası RevenueCat paywall
- TR/EN dil desteği (i18next, varsayılan TR)
- Hesap/veri silme (Meta data deletion compliance) akışı

**Dışında (sonraki fazlara ertelendi):**
- AI destekli niyet anlama modu
- Sektöre özel hazır şablon paketleri
- Çoklu hesap / ajans modu
- Analytics / dönüşüm huni raporları
- Story mention otomasyonu

---

## 6. Özellik Yol Haritası (rakip analizine göre)

**ManyChat / Chatfuel'in boşlukları:** masaüstü-öncelikli akış (flow) canvas'ı teknik bilgisi olmayan küçük işletme sahibi için karmaşık; jargon ağır ("flow", "trigger", "node"); TR yerelleştirme zayıf; contact-based fiyatlandırma küçük işletmeler için öngörülemez; mobil deneyim ikincil (responsive web, native app değil).

**Bizim farkımız:** native mobil-first uygulama, jargonsuz 3 dokunuşluk kural kurulumu, **DM içine gömülü buton/dallanma/dosya gönderme akışını basit bir sihirbazla sunma** (rakiplerin karmaşık canvas'ı yerine), TR öncelikli, sektöre özel hazır şablonlar, basit sabit fiyatlı freemium.

### MVP (v1.0)
Yukarıdaki "MVP Kapsamı" bölümü.

### v1.1
- **AI modu (premium):** Gemini ile niyet sınıflandırma (fiyat sorma / şikayet / teşekkür / genel soru) + doğal dilde otomatik cevap üretimi, marka tonu ayarı (samimi/resmi)
- **Sektörel şablon kütüphanesi:** butik, diyetisyen, kuaför, emlak, kafe için hazır kural paketleri — tek dokunuşla uygula, sonra özelleştir
- Çoklu anahtar kelime + AI destekli eş anlamlı genişletme
- Push bildirimleri: kural tetiklendiğinde / token süresi dolduğunda
- Basit dönüşüm analitiği: yorum → DM gönderildi → link tıklandı
- CSV/Sheets olarak lead (DM atılan kişiler) dışa aktarma

### v2
- Çok turlu AI sohbet: DM'de basit SSS/ürün kataloğu botu
- WhatsApp Business API entegrasyonu (Instagram dışına genişleme)
- Lead etiketleme + takip hatırlatma (CRM-lite)
- Zapier/webhook ile dış CRM entegrasyonu
- Ajans/çoklu müşteri yönetimi için white-label panel

---

## 7. Arayüz Tasarımı

**Hedef kullanıcı:** teknik bilgisi olmayan küçük işletme sahibi (butik, diyetisyen, kuaför vb.) — sade, güven veren, az adımlı bir deneyim şart.

**Tasarım dili:**
- Yumuşak köşeler, bol boşluk, tek vurgu rengi (sıcak mercan/turuncu tonu) + nötr gri tonlar — Instagram'ın gradyanını taklit etmeyen ama enerjik bir palet
- Büyük dokunma alanları, büyük okunaklı TR metin
- Jargonsuz dil: "Flow" değil "Kural", "Trigger" değil "Tetikleyici Kelime"
- Boş durumlarda (empty state) hafif illüstrasyon + yönlendirici metin
- Navigasyon: alt sekme (bottom tab) — başparmakla erişim kolaylığı için, hamburger menü yok

**Navigasyon yapısı (bottom tabs):**
```
Ana Sayfa | Kurallar | Şablonlar | Loglar | Ayarlar
```
Kural oluşturma/düzenleme ve paywall bu sekmelerin üzerine modal/stack olarak açılır.

**Ekran listesi:**
1. **Splash / Onboarding** → Giriş-Kayıt (email, Google, Apple) → Instagram hesabı bağla (Page gerekliliği anlatılır) → Bağlantı başarılı
2. **Ana Sayfa:** özet kartlar (bugünkü yorum sayısı, gönderilen DM sayısı), aktif kurallar, "+ Yeni Kural" butonu, token süresi dolmak üzereyse uyarı banner'ı
3. **Kurallar:** hesaba ait kural listesi, aç/kapa toggle, düzenlemeye dokun
4. **Yeni Kural / Kural Düzenle** (adım adım sihirbaz):
   - Adım 1: Gönderi seç (tüm gönderiler veya IG medya grid'inden seç)
   - Adım 2: Tetikleyici kelime(ler) gir (chip input) — sektörel öneri şablonları
   - Adım 3: Public reply metni yaz, `{{kullanici_adi}}` değişkeni ekle
   - Adım 4: **DM akışı oluştur** — ilk mesajı yaz, isteğe bağlı en fazla 3 buton ekle; her buton için "Ne olsun?" seçimi: *Yeni mesaj gönder* (dallanma — bir sonraki adımı aynı sihirbazla tanımla), *Link aç*, *Dosya/görsel gönder*. Önizleme (telefon mockup'ı içinde canlı DM görünümü) her adımda gösterilir.
5. **Şablonlar** (v1.1): sektöre göre hazır kural paketleri
6. **Loglar:** tetiklenen otomasyonların listesi, detay (yorum, gönderilen cevap, DM durumu/hata sebebi)
7. **AI Modu** (v1.1, premium bölüm): açma/kapama, niyet etiketleri, ton seçimi
8. **Abonelik/Paywall:** plan karşılaştırma, RevenueCat satın alma ekranı, "1 gönderi ücretsiz" göstergesi
9. **Ayarlar:** hesap bilgisi, bağlı IG hesapları yönetimi, dil seçimi, bildirim tercihleri, hesap/veri silme, destek, çıkış

---

## Sıradaki adım

Bu plan onaylanırsa:
1. Expo (React Native, TypeScript) projesi sıfırdan kurulacak, klasör yapısı oluşturulacak
2. Firebase config iskeleti (Auth, Firestore, Cloud Functions — europe-west3) hazırlanacak
3. Firestore security rules yazılacak
4. MVP ekranları ve Cloud Functions kodlanmaya başlanacak
5. `META_SETUP.md` (Meta Developer panelinde elle yapılacak adımlar) ve `CLAUDE.md` (proje kuralları) bu aşamada teslim edilecek

Onaylıyor musunuz, yoksa planda değiştirmek istediğiniz bir kısım var mı?
