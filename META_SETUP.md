# META_SETUP.md — Meta Developer Panelinde Elle Yapılacaklar

Bu dosyadaki adımların hepsi https://developers.facebook.com/apps üzerinden,
elle yapılır. Kod tarafı zaten hazır; burada üretilen değerleri nereye
yapıştıracağını her adımın sonunda belirttim.

Sırayla ilerle — sonraki adımlar bir öncekinin çıktısına ihtiyaç duyuyor.

---

## 1. Meta App oluştur

1. https://developers.facebook.com/apps → **Create App**
2. Kullanım amacı olarak **"Other"** seç → app type: **"Business"**
3. App adı: `Instabot` (veya istediğin isim), iletişim e-postan, varsa Business
   Manager hesabını seç (yoksa adım 7'de oluşturacağız).
4. App oluşturulunca App Dashboard'a düşersin — App ID sağ üstte görünür.

## 2. Ürünleri ekle

App Dashboard sol menü → **Add Product**, şu üçünü ekle:
- **Instagram** (Instagram Graph API — yorum/mesaj/medya erişimi için)
- **Webhooks**
- **Facebook Login for Business** (OAuth dialog'unu bu sağlıyor, mobil app bunu kullanıyor)

## 3. Temel ayarlar (App Settings > Basic)

1. **App Secret**'i göster (şifre sorabilir) ve kopyala.
2. **Privacy Policy URL**, **Terms of Service URL**, **App Icon**, **Category**
   alanlarını doldur — bunlar olmadan App Review'a gönderemezsin.
3. **User Data Deletion** alanına bir URL gir. En basit seçenek: kod tabanındaki
   `deleteMyAccount` Cloud Function'ı çağıran basit bir statik sayfa, ya da
   şimdilik `https://<senin-domainin>/veri-silme` gibi bir sayfa hazırlayıp
   "hesabınızı Ayarlar > Hesabımı ve verilerimi sil'den silebilirsiniz, ya da
   bize e-posta atın" yazabilirsin.

**Buraya yapıştır:**
| Değer | Nereye |
|---|---|
| App ID | `app/.env` → `EXPO_PUBLIC_META_APP_ID` |
| App Secret | `firebase functions:secrets:set META_APP_SECRET` (ASLA `.env`'e, ASLA client koduna girmez) |

## 4. Facebook Login for Business ayarları

**Facebook Login for Business > Settings** sayfasında **Valid OAuth Redirect
URIs** alanına şunu ekle:
```
https://instabot-app-tr.web.app/instagram-callback.html
```
Meta'nın OAuth dialog'u 2018'den beri sadece `https://` redirect URI kabul
ediyor — `instabot://` gibi özel scheme'ler "should represent a valid URL"
hatasıyla reddedilir. Bu yüzden gerçek redirect URI, `instabot-site` reposunda
duran ve Firebase Hosting'e deploy edilen küçük bir "bounce" sayfası
(`hosting/instagram-callback.html`) — Facebook koda oraya dönüyor, sayfa da
anında `instabot://redirect`'e yönlendirip uygulamaya geri veriyor.

**Buraya yapıştır:** Bu URL zaten `app/.env` →
`EXPO_PUBLIC_META_OAUTH_REDIRECT_URI`'de duruyor, değiştirmene gerek yok.

## 5. Webhooks ayarları

Önce Cloud Functions'ı bir kere deploy etmen lazım (`cd functions && npm run
deploy`), çünkü webhook URL'i deploy sonrası oluşuyor:
`https://europe-west3-<firebase-proje-id>.cloudfunctions.net/instagramWebhook`

1. Rastgele, uzun bir string üret (örn. bir şifre üretici ile) — buna
   **Verify Token** diyeceğiz.
2. Önce bu token'ı Cloud Functions'a tanıt:
   `firebase functions:secrets:set META_WEBHOOK_VERIFY_TOKEN` (deploy'u tekrarla)
3. **Webhooks** ürünü > **Instagram** sekmesi > **Subscribe to this object**:
   - Callback URL: yukarıdaki `instagramWebhook` URL'i
   - Verify Token: adım 1'de ürettiğin string
   - **Verify and Save** — Meta senin fonksiyonuna bir GET isteği atıp
     doğrulayacak, fonksiyon zaten bunu karşılıyor (`instagramWebhook.ts`).
4. Doğrulama geçince, aşağıdaki **fields**'ı işaretle (checkbox):
   - `comments`
   - `messages`
   - `messaging_postbacks`

Bu üç alan işaretli olmadan ne yorum yakalanır ne de gönderilen DM'lerdeki
butonlara tıklama bilgisi gelir.

## 5b. Messenger (Facebook Page DM) için Page webhook aboneliği

Instagram webhook'u (adım 5) sadece Instagram Business hesabındaki olayları
kapsar. Aynı bağlı Facebook Sayfası'nın **kendi Facebook Messenger DM'lerini
ve kendi gönderilerine gelen yorumları** da yakalamak için AYNI callback
URL'ine, ayrı bir "Page" aboneliği daha açman lazım — kod tarafı zaten hazır
(`getIgAccountByPlatformId` bağlı Page id'sini otomatik tanıyor).

1. App Dashboard sol menü → **Add Product** → **Messenger** ürününü ekle
   (henüz ekli değilse).
2. **Webhooks** ürününe git → üstteki obje seçicisinden **Instagram**
   yerine **Page**'i seç (aynı sayfada iki ayrı obje sekmesi var, karıştırma).
3. **Subscribe to this object**:
   - Callback URL: adım 5'teki **aynı** `instagramWebhook` URL'i
   - Verify Token: adım 5'te ürettiğin **aynı** string
   - **Verify and Save**
4. Doğrulama geçince şu **fields**'ı işaretle:
   - `feed` (Sayfa'nın kendi gönderilerine gelen yorumlar — Instagram'daki
     `comments` alanının Facebook Page karşılığı, isim farklı)
   - `messages`
   - `messaging_postbacks`
   - `message_reactions`
   - `messaging_referrals`
5. **Messenger** ürünü > **Settings** sayfasından, bağlı Facebook Sayfası'nı
   **"Webhook events"** altına ekle (sayfa seçilmeden Page tipi olaylar hiç
   gelmez — bu adım Instagram tarafında gerekmiyordu ama Messenger'da şart).

Bunlar tamamlanınca ekstra kod/deploy gerekmiyor — mevcut kural motoru
(`keyword` tipi kurallar) Facebook Page yorumlarını/DM'lerini de otomatik
yakalayacak, çünkü eşleşme yorum id'si + metne göre yapılıyor, platform fark
etmiyor.

## 6. Kendi hesabınla test etme (App Review beklemeden)

App Review onayı gelene kadar uygulama sadece "tester" olarak eklediğin
hesaplarla çalışır:

1. **App roles > Roles** sayfasına git, kendi Facebook hesabını
   **Instagram Tester** olarak ekle.
2. Instagram mobil uygulamasında: **Ayarlar > Hesap Merkezi (veya Apps and
   Websites) > Tester Davetleri** kısmından daveti kabul et.
3. Instagram Business/Creator hesabının bir **Facebook Sayfası'na bağlı**
   olduğunu doğrula (Instagram app > Ayarlar > İşletme > Bağlı hesaplar).
   Bağlı değilse önce bunu yapman lazım — bağlı olmadan hiçbir izin çalışmaz.
4. Artık mobil uygulamadan "Instagram ile bağlan" butonuna bastığında kendi
   hesabınla uçtan uca test edebilirsin.

## 7. Business Verification (bazı izinler için gerekli)

`business_management` ve ileri seviye mesajlaşma izinleri genelde doğrulanmış
bir Meta Business hesabı ister:

1. https://business.facebook.com → işletmeni oluştur (yoksa).
2. **Business Settings > Business Info** üzerinden doğrulama sürecini başlat
   (vergi levhası/şirket belgesi istenebilir).
3. App Dashboard > **Business Settings** kısmından App'i bu Business Manager
   hesabına bağla.

## 8. App Review — izin talepleri

Test tamamlanıp gerçek kullanıcılara açılmaya hazır olduğunda, **App Review >
Permissions and Features** sayfasından şu izinleri tek tek "Request" et:

| İzin |
|---|
| `instagram_basic` |
| `instagram_manage_comments` |
| `instagram_manage_messages` |
| `pages_show_list` |
| `pages_read_engagement` |
| `pages_manage_metadata` |
| `business_management` |

Her izin talebinde Meta senden ister:
- Kullanım senaryosu açıklaması (Türkçe/İngilizce, kısa ve net — "küçük
  işletmelerin Instagram yorumlarına otomatik cevap/DM göndermesini sağlıyoruz"
  gibi)
- **Ekran kaydı (screencast):** uygulamanın gerçek akışını göster — hesap
  bağlama, kural oluşturma, bir yoruma otomatik DM gitmesi. Meta bunu izin
  onayı için mutlaka istiyor.

## 9. Canlıya alma

App Review onaylanınca App Dashboard üstünde **App Mode: Development → Live**
anahtarını çevir. Business Verification tamamlanmamışsa bazı izinler Live
modda devre dışı kalabilir — adım 7'yi önce bitir.

---

## 10. WhatsApp Business API — hesap bağlama ve onay süreci

Kod tarafı hazır (`connectWhatsAppAccount` callable + webhook işleme). Burada
anlatılan her şey Meta panelinde elle yapılıyor; sonunda 3 değer elde
edeceksin: **Phone Number ID**, **WhatsApp Business Account ID (WABA ID)**,
ve **kalıcı erişim token'ı** — bunları uygulamada Ayarlar > WhatsApp bağla
ekranına yapıştıracaksın.

### 10.1 Test için hızlı başlangıç (gerçek numara olmadan)

1. Aynı Meta App'in Dashboard'unda **Add Product** → **WhatsApp** ekle.
2. **WhatsApp > API Setup** sayfasına git. Meta sana otomatik bir **test
   telefon numarası** ve geçici (24 saatlik) bir token verir.
3. Bu sayfada görünen **Phone Number ID** ve **WhatsApp Business Account ID**
   değerlerini not al.
4. **To** alanına kendi WhatsApp numaranı ekle (test alıcısı olarak
   doğrulaman gerekir — SMS/arama ile kod gelir).
5. Bu geçici token'ı `ConnectWhatsAppScreen`'e yapıştırıp uçtan uca test
   edebilirsin — ama 24 saatte bir yenilenmesi gerekir, üretim için adım
   10.2'ye geç.

### 10.2 Kalıcı token (üretim için — System User)

Geçici token'lar üretimde işe yaramaz, **System User** üzerinden kalıcı bir
token üretmen lazım:

1. https://business.facebook.com → **Business Settings**.
2. **Users > System Users** → **Add** → isim ver, rol: **Admin**.
3. Oluşan System User'a tıkla → **Add Assets** → **Apps** sekmesinden bu Meta
   App'i seç, **Full Control** ver.
4. Aynı ekranda **Assets** kısmından WhatsApp hesabını (WABA) da bu System
   User'a ata.
5. **Generate New Token** → App olarak bu Meta App'i seç → izinler:
   `whatsapp_business_messaging`, `whatsapp_business_management` → **Generate
   Token**.
6. Çıkan token'ı **hemen kopyala** (bir daha gösterilmez) — bu, süresi
   dolmayan kalıcı token'ın.

**Buraya yapıştır:** Bu token'ı, adım 10.1'deki Phone Number ID ve WABA ID
ile birlikte uygulamadaki **Ayarlar > WhatsApp bağla** ekranına gir.

### 10.3 Gerçek işletme numarası ekleme (test numarası yerine)

1. **WhatsApp > API Setup** → **Add phone number**.
2. Görünen ad (display name), işletme kategorisi, açıklama gir.
3. Numaranı SMS veya sesli arama ile doğrula.
4. **Görünen ad onayı ayrı bir süreç** — Meta bunu birkaç gün içinde
   inceleyip onaylıyor/reddediyor (marka adına uygun olmalı, jenerik
   kelimeler reddedilebilir).

### 10.4 Webhook aboneliği

Aynı callback URL'i (adım 5'teki `instagramWebhook`) ve verify token'ı
kullan:

1. **WhatsApp > Configuration** → **Webhook** → **Edit**.
2. Callback URL + Verify Token'ı gir → **Verify and Save**.
3. **Webhook fields**'tan `messages`'ı işaretle.
4. Aynı sayfada, hangi **WhatsApp Business Account**'ın bu webhook'a
   abone olacağını seç (birden fazla numaran varsa hepsini ekle).

### 10.5 Business Verification (üretim ölçeği için gerekli)

Doğrulanmamış bir işletme, WhatsApp'ta çok düşük bir mesaj limitiyle
başlar (Tier 1: 24 saatte ~250 benzersiz kişi). Daha fazlası için:

1. **Business Settings > Security Center** → **Start Verification**.
2. Şirket belgesi/vergi levhası, adres kanıtı gibi belgeler istenir.
3. Onaylanınca mesaj limiti otomatik yükselir (kullanım kalitesine göre
   kademeli artar — Meta bunu "tier" sistemiyle otomatik yönetir, elle bir
   şey yapman gerekmez).

### 10.6 Mesaj Şablonları (Message Templates) — ileride broadcast için

**Önemli:** Mevcut kod (`sendWhatsAppMessage`) sadece **24 saatlik
mesajlaşma penceresi içinde** (kullanıcı sana yazdıktan sonra) serbest metin
gönderiyor — bu, şu anki "gelen mesaja otomatik cevap" özelliği için
yeterli, **şablon onayına ihtiyacın yok**.

Ama ileride "broadcast" (Instagram'daki gibi, pencere dışına da mesaj atma)
özelliğini WhatsApp'a da eklemek istersen, önce onaylı bir **Message
Template** gerekir:

1. **WhatsApp Manager > Message Templates** → **Create Template**.
2. Kategori seç: **Marketing** (tanıtım), **Utility** (sipariş/randevu
   bilgisi gibi), veya **Authentication** (OTP).
3. Şablon metnini `{{1}}`, `{{2}}` gibi değişkenlerle yaz, örnekler ver.
4. **Submit** — Meta genelde birkaç dakika–1 gün içinde onaylıyor/reddediyor.
5. Onaylanan şablonlar `sendWhatsAppMessage`'a `template` tipi mesaj olarak
   eklenmeli (şu an kodda yok, bu adıma gelince ayrıca eklenir).

### 10.7 Embedded Signup (gerçek kullanıcılar için — 10.1-10.2'nin yerini alır)

10.1-10.2'deki manuel ID/token yapıştırma yöntemi **sadece senin kendi
testin için**. Gerçek müşterilerin "WhatsApp'a Bağlan" deyip kendi
numaralarını girmesi için bu akış gerekiyor — kod tarafı hazır
(`ConnectWhatsAppScreen`'deki WebView + `exchangeWhatsAppEmbeddedSignupCode`).

1. App Dashboard → **Facebook Login for Business** → **Configurations** →
   **Create Configuration**.
2. Configuration adı ver (örn. "Chatterly WhatsApp Signup").
3. **Assets** kısmında **WhatsApp Business** seç, izinler:
   `whatsapp_business_management`, `whatsapp_business_messaging`.
4. Kaydet — çıkan **Configuration ID**'yi kopyala.

**Buraya yapıştır:** Bu ID'yi `app/.env` → `EXPO_PUBLIC_META_WHATSAPP_CONFIG_ID`
alanına yaz.

5. **App Review > Permissions and Features** → `whatsapp_business_management`
   iznini **Request** et (Business Verification — adım 10.5 — tamamlanmış
   olmalı, aksi halde bu izin talebi reddedilir).
6. Onaylanana kadar (genelde birkaç gün) uygulamadaki WhatsApp bağlama
   ekranı sadece **"Test WhatsApp Business Account"**ı görebilir — kendi
   gerçek numaranı test etmek için ekranın altındaki **"Gelişmiş: ID/token'ı
   manuel gir"** linkiyle 10.1-10.2'deki yöntemi kullanmaya devam edebilirsin.
7. Onay gelince Embedded Signup ekranı gerçek müşterilerin kendi
   numaralarını eklemesine izin verir — hiçbir ID/token görmezler.

---

## Özet: hangi değer nereye gidiyor

| Meta panelinden aldığın değer | Kod tarafında nereye |
|---|---|
| App ID | `app/.env` → `EXPO_PUBLIC_META_APP_ID` |
| App Secret | Cloud Functions secret → `META_APP_SECRET` |
| Webhook Verify Token (kendi ürettiğin) | Cloud Functions secret → `META_WEBHOOK_VERIFY_TOKEN` |
| OAuth Redirect URI | `app/.env` → `EXPO_PUBLIC_META_OAUTH_REDIRECT_URI` |
| WhatsApp Phone Number ID | Uygulama içi: Ayarlar > WhatsApp bağla ekranı |
| WhatsApp Business Account ID | Uygulama içi: Ayarlar > WhatsApp bağla ekranı |
| WhatsApp kalıcı erişim token'ı (System User) | Uygulama içi: Ayarlar > WhatsApp bağla ekranı |
| WhatsApp Embedded Signup Configuration ID | `app/.env` → `EXPO_PUBLIC_META_WHATSAPP_CONFIG_ID` |

Cloud Functions secret'larını ayarlamak için (CLAUDE.md'de de var):
```bash
cd functions
firebase functions:secrets:set META_APP_SECRET
firebase functions:secrets:set META_WEBHOOK_VERIFY_TOKEN
```
