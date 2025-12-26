# Tesla Player - Deployment Guide

## 🚀 Deployment Yapılandırması

### Frontend - Vercel Deployment

1. **Vercel'e Git**: https://vercel.com/new
2. **GitHub repo'nuzu import edin**: `UmutEmree/teslaplayer`
3. **Ayarları yapılandırın**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

4. **Environment Variables ekleyin**:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   NEXT_PUBLIC_WS_HOST=your-backend-url.onrender.com
   ```

5. **Deploy** butonuna tıklayın

---

### Backend - Render.com Deployment

1. **Render'a Git**: https://render.com/
2. **New → Web Service** seçin
3. **GitHub repo'nuzu bağlayın**: `UmutEmree/teslaplayer`
4. **Ayarları yapılandırın**:
   - **Name**: `teslaplayer-backend`
   - **Root Directory**: `apps/server`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free (veya Starter $7/month)

5. **Environment Variables** ekleyin:
   ```
   NODE_ENV=production
   PORT=4000
   M3U8_URLS=https://raw.githubusercontent.com/Free-IPTV/Countries/main/TR01_TURKEY.m3u8,https://iptv-org.github.io/iptv/countries/tr.m3u8
   USE_M3U8=true
   CORS_ORIGINS=https://teslaplayer.vercel.app
   ```

   **Not**: `CORS_ORIGINS` değerini Vercel URL'iniz ile güncelleyin!

6. **Create Web Service** butonuna tıklayın

7. **Backend URL'i kopyalayın** (örn: `https://teslaplayer-backend.onrender.com`)

---

### Backend URL'i Frontend'e Bağlama

1. Vercel Dashboard'a geri dönün
2. Projenize gidin → **Settings** → **Environment Variables**
3. `NEXT_PUBLIC_API_URL` değerini backend URL'iniz ile güncelleyin:
   ```
   NEXT_PUBLIC_API_URL=https://teslaplayer-backend.onrender.com
   NEXT_PUBLIC_WS_HOST=teslaplayer-backend.onrender.com
   ```
4. **Redeploy** edin (Deployments → en son deployment → ⋯ → Redeploy)

---

## 🎯 Deployment Sonrası Kontroller

### Frontend Testi
1. Vercel URL'inizi açın (örn: `https://teslaplayer.vercel.app`)
2. Ana sayfada 3 kategori kartının göründüğünü kontrol edin
3. Her kategoriye tıklayıp sayfaların yüklendiğini test edin

### Backend Testi
```bash
curl https://your-backend-url.onrender.com/api/content/movies
```

### Memory Optimizasyonu Doğrulama
- Chrome DevTools açın (F12)
- **Performance** → **Memory** tab'ı
- Ana sayfa: ~10-20 MB
- Movies/Series/Live sayfaları: ~100-250 MB
- Sayfalar arası navigasyon: Eski sayfa memory'si temizleniyor ✓

---

## ⚙️ Opsiyonel: Custom Domain

### Vercel'de Custom Domain Ekleme
1. Vercel Dashboard → Projeniz → **Settings** → **Domains**
2. Domain adınızı girin (örn: `teslaplayer.com`)
3. DNS kayıtlarını domain provider'ınızda yapılandırın
4. Vercel otomatik SSL sertifikası ekleyecek

---

## 📊 Beklenen Deployment Sonuçları

| Metric | Değer |
|--------|-------|
| **Frontend Deploy Süresi** | 2-3 dakika |
| **Backend Deploy Süresi** | 3-5 dakika |
| **Initial Page Load** | < 2 saniye |
| **Memory Usage** | 50-250 MB (sayfa başına) |
| **Free Tier Limitleri** | Vercel: 100 GB bandwidth, Render: 750 saat/ay |

---

## 🔧 Troubleshooting

### Frontend'de API Bağlantı Hatası
- Environment variables'ı kontrol edin
- CORS ayarlarını backend'de kontrol edin
- Browser console'da network hatalarını inceleyin

### Backend'de 503 Service Unavailable (Render Free Tier)
- Render free tier 15 dakika inaktif sonra uyur
- İlk request 30-60 saniye sürebilir (cold start)
- Çözüm: Starter plan ($7/month) ile her zaman aktif

### Memory Hala Yüksek
- Browser cache'i temizleyin
- Hard reload yapın (Cmd+Shift+R / Ctrl+Shift+F5)
- Chrome DevTools'da memory snapshot alıp analiz edin

---

## 🎉 Production URL'ler

Deployment tamamlandığında:
- **Frontend**: `https://teslaplayer.vercel.app` (veya custom domain)
- **Backend**: `https://teslaplayer-backend.onrender.com`

---

## 📝 Notlar

- **Render Free Tier**: Backend 15 dakika sonra uyur, ilk istek yavaş olabilir
- **Vercel**: Otomatik Git integration, her push otomatik deploy
- **Environment Variables**: Production'da hassas bilgileri `.env` dosyasına koymayın, platform dashboard'larından ekleyin
- **CORS**: Backend'de frontend domain'inizi whitelist'e ekleyin
