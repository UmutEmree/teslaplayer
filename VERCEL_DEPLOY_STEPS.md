# Vercel Frontend Deployment Adımları

## ⚠️ ÖNEMLİ: Backend'i önce deploy et!

Backend URL'ine ihtiyacın olacak (örn: `https://teslaplayer-backend.onrender.com`)

---

## Adım 1: Vercel'e Git
https://vercel.com/new adresine git ve GitHub ile giriş yap

## Adım 2: Repository Import Et
1. **Import Git Repository** seç
2. Repository ara: `UmutEmree/teslaplayer`
3. **Import** butonuna tıkla

## Adım 3: Project Settings

### Configure Project

- **Framework Preset**: `Next.js` (otomatik seçilir)
- **Root Directory**: `apps/web` YAZMALSIN (önemli!)
  - **Edit** tıkla
  - `apps/web` yaz
  - **Continue** tıkla

### Build Settings (otomatik dolu)
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## Adım 4: Environment Variables

**Environment Variables** bölümünde şunları ekle:

**Name**: `NEXT_PUBLIC_API_URL`
**Value**: `https://YOUR-BACKEND-URL.onrender.com` (backend URL'ini buraya yaz)

**Name**: `NEXT_PUBLIC_WS_HOST`
**Value**: `YOUR-BACKEND-URL.onrender.com` (https:// olmadan)

Örnek:
```
NEXT_PUBLIC_API_URL=https://teslaplayer-backend.onrender.com
NEXT_PUBLIC_WS_HOST=teslaplayer-backend.onrender.com
```

## Adım 5: Deploy Et

1. **Deploy** butonuna tıkla
2. Build başlayacak (2-3 dakika)
3. Deploy bitince **Visit** tıkla

## Adım 6: Test Et

1. Ana sayfada 3 kart görmelisin: Filmler, Diziler, Canlı TV
2. **Filmler** tıkla → Film listesi yüklenecek
3. Bir filme tıkla → Video açılacak
4. **Canlı TV** tıkla → Ülkelere göre kanallar listelenecek

---

## ✅ Frontend Hazır!

Vercel URL'in: `https://teslaplayer-XXXXX.vercel.app`

---

## 🔧 Eğer CORS Hatası Alırsan

Backend'e geri dön:
1. Render Dashboard → `teslaplayer-backend` → **Environment**
2. `CORS_ORIGINS` değişkenini bul
3. Vercel URL'ini ekle:
   ```
   CORS_ORIGINS=https://teslaplayer-XXXXX.vercel.app,https://teslaplayer-*.vercel.app
   ```
4. **Save Changes** → Backend otomatik redeploy olacak

---

## 📊 Memory Test

1. Frontend'i aç
2. Chrome DevTools (F12) → **Performance** → **Memory**
3. Heap Snapshot al
4. Ana sayfa: ~10-20 MB olmalı
5. Filmler sayfası: ~100-250 MB olmalı (49K kanal yükleniyor)
6. Geri gelince memory temizlenmeli ✓
