# 🔐 HomeGuardian Dashboard - Setup Guide

## ✅ Tamamlanan Adımlar

1. ✅ Next.js Dashboard kuruldu
2. ✅ Supabase client entegrasyonu
3. ✅ Authentication sistemi eklendi
4. ✅ Device kontrol paneli
5. ✅ Command gönderme (Lock PC, Kill Process, Send Message)

---

## 🚀 Kurulum Adımları

### 1. Supabase Email Authentication Aktifleştirme

Dashboard'da login yapabilmek için Supabase'de Email Authentication aktif olmalı:

1. **Supabase Dashboard** → https://supabase.com
2. **Authentication** → **Providers** sayfasına gidin
3. **Email** provider'ını bulun
4. **Enable Email provider** toggle'ını açın
5. **Confirm email** toggle'ını **KAPATIN** (test için)
6. Save yapın

### 2. Test Kullanıcısı Oluşturma

İki yöntem var:

#### Yöntem A: Dashboard'dan Sign Up

1. http://localhost:3000/login sayfasına gidin
2. "Sign Up" seçeneğine tıklayın
3. Email ve şifre girin (test@example.com / password123)
4. Sign Up'a tıklayın

#### Yöntem B: Supabase SQL (Hızlı)

```sql
-- Test user oluştur
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'parent@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '',
  NOW(),
  NOW()
);
```

### 3. Device Ekleme

Login yaptıktan sonra, device eklemek için:

```sql
-- User ID'nizi bulun
SELECT id, email FROM auth.users;

-- Device ekleyin
INSERT INTO devices (device_id, device_name, parent_id)
VALUES (
  'Batuhan-28cdc4b6f97c',  -- Python Agent'tan gelen Device ID
  'Batuhan''s PC',
  'YOUR_USER_ID_HERE'  -- Yukarıdaki query'den aldığınız ID
);
```

---

## 🎯 Kullanım

### 1. Dashboard Açma

```bash
cd c:\Users\taluc\Desktop\agentexe\dashboard
npm run dev
```

Dashboard: http://localhost:3000

### 2. Login

- **Email**: parent@example.com (ya da oluşturduğunuz email)
- **Password**: password123 (ya da oluşturduğunuz şifre)

### 3. Device Kontrolü

Dashboard'da device kartını göreceksiniz:

- **🟢 Online/Offline** durumu
- **Aktif Pencere** bilgisi
- **CPU & RAM** kullanımı
- **Kontrol Butonları**:
  - 🔒 **Lock PC** - Bilgisayarı kilitle
  - ❌ **Kill** - Uygulama kapat (process adı girin)
  - 💬 **Message** - Mesaj gönder

---

## 🧪 Test Senaryosu

### Tam Sistem Testi:

1. **Agent Başlat** (yönetici olarak):
   ```bash
   cd c:\Users\taluc\Desktop\agentexe
   python src/main.py
   ```

2. **Dashboard Aç**:
   - http://localhost:3000/login
   - Login yapın

3. **Device Görüntüle**:
   - Dashboard'da device kartını görün
   - Online durumunu kontrol edin
   - Aktif pencere bilgisini görün

4. **Komut Gönder**:
   - "Message" butonuna tıklayın
   - "Merhaba! Test mesajı" yazın
   - Send yapın
   - 3 saniye içinde bilgisayarda popup görün!

---

## 📊 Özellikler

### ✅ Tamamlandı

- ✅ Modern UI (Glassmorphism, gradients)
- ✅ Email authentication (Login/Signup)
- ✅ Protected routes (Middleware)
- ✅ Real-time device status
- ✅ Command controls (Lock, Kill, Message)
- ✅ Device statistics (CPU, RAM)
- ✅ Active window monitoring

### 🔄 Sırada (İsteğe Bağlı)

- [ ] Real-time heartbeat updates (auto-refresh)
- [ ] Command history page
- [ ] Device registration flow
- [ ] Multiple device support
- [ ] Activity logs

---

## 🔧 Troubleshooting

### "Please sign in" hatası
→ Supabase Auth aktif değil. Yukarıdaki adım 1'i yapın.

### Device görünmüyor
→ SQL ile device ekleyin. `parent_id` doğru user ID'ye sahip olmalı.

### Commands çalışmıyor
→ Python Agent çalışıyor mu kontrol edin. Device ID eşleşiyor mu?

### Port 3000 kullanımda
→ Zaten çalışıyor! http://localhost:3000 açın.

---

## 📝 Environment Variables

`.env.local` dosyası şu şekilde olmalı:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## 🎉 Başarı!

Artık tam çalışan bir Parental Control sisteminiz var:

✅ **Python Agent** - Windows PC'de çalışıyor  
✅ **Supabase** - Database ve real-time iletişim  
✅ **Next.js Dashboard** - Modern web arayüzü  

**Tebrikler! HomeGuardian hazır! 🚀**
