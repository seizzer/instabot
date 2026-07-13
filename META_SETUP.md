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
URIs** alanına ikisini de ekle:
- Expo geliştirme (Expo Go ile test): `https://auth.expo.io/@<expo-kullanici-adin>/instabot`
- EAS Build ile üretilen standalone app: `instabot://`

`<expo-kullanici-adin>` senin Expo hesabındaki kullanıcı adın (`npx expo whoami`
ile görebilirsin).

**Buraya yapıştır:** Kullandığın redirect URI'yi `app/.env` →
`EXPO_PUBLIC_META_OAUTH_REDIRECT_URI` alanına yaz (boş bırakırsan kod otomatik
`instabot://` üretir, ama Expo Go ile test edeceksen açıkça yukarıdaki
`auth.expo.io` adresini gir).

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

## Özet: hangi değer nereye gidiyor

| Meta panelinden aldığın değer | Kod tarafında nereye |
|---|---|
| App ID | `app/.env` → `EXPO_PUBLIC_META_APP_ID` |
| App Secret | Cloud Functions secret → `META_APP_SECRET` |
| Webhook Verify Token (kendi ürettiğin) | Cloud Functions secret → `META_WEBHOOK_VERIFY_TOKEN` |
| OAuth Redirect URI | `app/.env` → `EXPO_PUBLIC_META_OAUTH_REDIRECT_URI` |

Cloud Functions secret'larını ayarlamak için (CLAUDE.md'de de var):
```bash
cd functions
firebase functions:secrets:set META_APP_SECRET
firebase functions:secrets:set META_WEBHOOK_VERIFY_TOKEN
```
