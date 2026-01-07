# DeviceCard.tsx Türkçeleştirme Rehberi

## Buton Etiketleri (label prop'ları)
Aşağıdaki satırlardaki "label" değerlerini bulun ve değiştirin:

### Satır ~440-505 (Action Buttons)
```tsx
label="Lock"     → label="Kilitle"
label="Shot"     → label="Ekran"
label="Cam"      → label="Kamera"
label="Sound"    → label="Ses"
label="Msg"      → label="Mesaj"
label="Speak"    → label="Konuş"
label="Files"    → label="Dosyalar"
label="Task Mgr" → label="Görev Yön."
label="Block Site" → label="Site Engelle"
label="Allowlist" → label="İzin Listesi"
label="Shutdown" → label="Kapat"
label="Restart"  → label="Yeniden Başlat"
label="Guide"    → label="Kılavuz"
label="Stop Agent" → label="Agent'ı Durdur"
```

## Dialog Başlıkları ve Metinler

### Process Manager Dialog (~610-620)
```tsx
"Process Manager" → "Görev Yöneticisi"
"Search apps (e.g. chrome)..." → "Uygulama ara (örn: chrome)..."
"No processes match" → "Eşleşen işlem yok"
"No processes loaded" → "İşlem yüklenmedi"
"Processes" → "İşlem"
```

### Screenshot/Webcam Dialog (~890-920)
```tsx
"Download" → "İndir"
"Live" → "Canlı"
```

### Volume Dialog (~750-790)
```tsx
"Volume Control" → "Ses Kontrolü"
"Mute" → "Sessiz"
"Max" → "Maksimum"
```

### Universal Dialogs (~690-780)
```tsx
"Kill Process" → "İşlemi Sonlandır"
"Force stop a running application" → "Çalışan uygulamayı zorla durdur"
"Block Site" → "Site Engelle"
"Restrict access to a website" → "Web sitesine erişimi kısıtla"
"Speak" → "Konuş"
"Send voice command to device" → "Cihaza ses komutu gönder"
"Message" → "Mesaj"
"Send a popup notification" → "Açılır bildirim gönder"
"Enter value..." → "Değer girin..."
"Send" → "Gönder"
"Sending..." → "Gönderiliyor..."
"Cancel" → "İptal"
```

### Allowlist Dialog (~950-970)
```tsx
"Application Allowlist Manager" → "Uygulama İzin Listesi Yöneticisi"
```

## Status Indicators (~395-405)
```tsx
"● Online" → "● Çevrimiçi"
"○ Offline" → "○ Çevrimdışı"
"Active Window" → "Aktif Pencere"
"Unknown" → "Bilinmiyor"
```

## Otomatik Toplu Değiştir Önerileri
VS Code'da Find & Replace (Ctrl+H) kullanarak:

1. `"Online"` → `"Çevrimiçi"`
2. `"Offline"` → `"Çevrimdışı"`
3. `"Active Window"` → `"Aktif Pencere"`
4. `"Unknown"` → `"Bilinmiyor"`
5. `"Download"` → `"İndir"`
6. `"Refresh"` → `"Yenile"`
7. `"Live"` → `"Canlı"`
