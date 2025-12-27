# Render.com Backend Deployment Adımları

## Adım 1: Render'a Git
https://render.com/ adresine git ve GitHub ile giriş yap

## Adım 2: New Web Service Oluştur
1. **Dashboard** → **New** → **Web Service** tıkla
2. **Connect** butonuna tıkla (GitHub repository)

## Adım 3: Repository Seç
- Repository: `UmutEmree/teslaplayer` seç
- **Connect** butonuna tıkla

## Adım 4: Ayarları Yapılandır

### Basic Settings
- **Name**: `teslaplayer-backend` (veya istediğin bir isim)
- **Region**: Frankfurt (veya en yakın bölge)
- **Branch**: `main`
- **Root Directory**: `apps/server`
- **Runtime**: `Node`

### Build & Deploy
- **Build Command**:
  ```
  npm install && npm run build
  ```

- **Start Command**:
  ```
  npm start
  ```

### Instance Type
- **Free** seçebilirsin (15 dakika sonra uyur ama yeterli)
- Veya **Starter ($7/ay)** - her zaman aktif kalır

## Adım 5: Environment Variables

**Environment** bölümünde **Add Environment Variable** tıkla ve şunları ekle:

```
NODE_ENV=production
PORT=4000
USE_M3U8=true
CORS_ORIGINS=https://teslaplayer.vercel.app,https://teslaplayer-*.vercel.app
```

## Adım 6: Deploy Et

1. **Create Web Service** butonuna tıkla
2. Deploy başlayacak (3-5 dakika sürer)
3. Deploy tamamlanınca **URL'i kopyala** (örn: `https://teslaplayer-backend.onrender.com`)

## Adım 7: Test Et

Deploy bitince tarayıcıda aç:
```
https://YOUR-BACKEND-URL.onrender.com/api/content/movies
```

JSON response görmelisin (41K+ film).

---

## ✅ Backend Hazır!

Backend URL'ini kopyala, frontend deployment için lazım olacak.

Örnek: `https://teslaplayer-backend.onrender.com`
