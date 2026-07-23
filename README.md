# Securify

Securify, kod tabanlarındaki hassas veri sızıntılarını (API anahtarları, veri tabanı kimlik bilgileri, bulut erişim tokenları) yerel makinede tespit eden, güvenlik odaklı bir istemci taraflı statik kod analiz ve bağımlılık denetleme yazılımıdır. 

Yazılım hem bir komut satırı arayüzü (CLI) hem de gelişmiş bir web uygulamasından oluşur. Kod analizi, güvenlik taraması ve harici entegrasyonlar tamamen tarayıcı üzerinde ve yerel makinede çalışacak şekilde yapılandırılmıştır.

---
<img width="1919" height="861" alt="image" src="https://github.com/user-attachments/assets/6860a7c9-58f0-4886-ba73-a8fa8266cc1a" />


## Mimari Prensipler ve Güvenlik Tasarımı

Securify, OWASP Top 10 güvenlik standartlarına ve sıfır bilgi (Zero-Knowledge) prensibine uygun olarak tasarlanmıştır:

1. **Sıfır Bilgi Tabanlı Kod Analizi (Zero-Knowledge Analysis):** Taranan kaynak kodlar hiçbir şekilde uzak sunuculara gönderilmez. Düzenli ifade (regex) taramaları ve Shannon Entropi hesaplamaları tamamen kullanıcının tarayıcısında (Web Workers aracılığıyla) veya yerel CLI üzerinde gerçekleştirilir.
2. **Aktif Doğrulama Güvenliği (Active Token Verification):** Tespit edilen gizli anahtarların aktif olup olmadığını sorgulamak için tasarlanan sunucusuz işlevler (/api/verify-secret.ts), ilgili anahtarı doğrudan sağlayıcının (Stripe, AWS, GitHub vb.) resmi API uç noktalarıyla sunucu tarafında güvenli bir şekilde eşleştirir. Bu sayede tarayıcı tarafına hassas istemci sırları sızdırılmaz.
3. **SSRF (Server-Side Request Forgery) Koruması:** Web sitesi tarayıcısı API'si, hedef alan adlarını çözümlemek için dinamik DNS çözümlemesi uygular. Loopback (127.0.0.1, ::1) ve RFC 1918 kapsamındaki özel IP aralıklarına yapılan istekleri engelleyerek iç ağ taraması saldırılarını engeller.
4. **Kriptografik İşlem Doğrulama (Shopier Integration):** Tüm ödeme ve abonelik onay süreçleri HMAC-SHA256 imzaları ile güvence altına alınmıştır. Webhook geri çağrıları, sağlayıcının gizli token değeriyle doğrulanarak sahte sipariş onaylarının önüne geçilir.
5. **Erişim Kontrolü ve JWT:** Hesap doğrulama ve oturum yönetimi, sunucu tarafında oluşturulan kriptografik JWT (JSON Web Token) yapılarını kullanır.

---

<img width="1919" height="921" alt="image" src="https://github.com/user-attachments/assets/564f2526-b2a0-4f9f-abc1-846b669eae44" />


## Temel Özellikler ve Modüller

### 1. Gerçek Zamanlı CVE Veritabanı Entegrasyonu
- OSV.dev ve GitHub Advisory API'leri ile doğrudan entegrasyon.
- Projedeki bağımlılıkların güvenlik açıklarını paralel sorgularla (10'lu paketler halinde) analiz eden mekanizma.
- Farklı veri tabanlarından dönen açıkların çakışmasını engelleyen tekilleştirme ve önceliklendirme algoritması.

### 2. Çoklu Dil Bağımlılık Ayrıştırıcısı (Dependency Parser)
Aşağıdaki manifest dosyalarını yerel olarak ayrıştırarak kütüphane adı, sürüm ve ekosistem bilgisini çıkarır:
- **npm / yarn / pnpm:** package.json
- **Python pip / pipenv:** requirements.txt, Pipfile.lock
- **Go Modules:** go.mod
- **Rust Crates:** Cargo.toml
- **Java Maven:** pom.xml
- **PHP Composer:** composer.json
- **Ruby:** Gemfile.lock

### 3. Web Worker Tabanlı Eşzamanlı Tarama Motoru
- Büyük dizinlerin taranması sırasında ana tarayıcı arayüzünün (main thread) kilitlenmesini önlemek için arka planda çalışan çoklu Web Worker yapısı.
- Dizin taramalarında `.gitignore` ve `.securifyignore` kurallarını otomatik olarak Regex desenlerine dönüştürerek hariç tutulacak dosyaları süzebilen glob parser yapısı.

### 4. Gelişmiş Şifreleme ve Entropi Analizi
- Rastgele, kriptografik olarak güvenli (CSPRNG) gizli anahtar oluşturucu.
- Parola ve anahtarların Shannon Entropi değerini hesaplayarak karmaşıklık analizi yapan araç.
- Olası kaba kuvvet (brute-force) kırılma sürelerini hesaplayan tahminleme algoritması.

### 5. Özelleştirilmiş Fiyatlandırma ve Performans Simülatörü
- Kullanıcılara yerel taramanın hızını görselleştiren, kod tabanı boyutuna bağlı olarak yerel tarayıcı motoru ile bulut tabanlı tarayıcıların performansını karşılaştıran interaktif simülasyon aracı.
- Paddle entegrasyonu ve abonelik durumu kaybolduğunda geri yükleme sağlayan doğrulama mekanizması.

---
<img width="1916" height="920" alt="image" src="https://github.com/user-attachments/assets/c1477a2d-e302-43cd-b257-e089f49c139f" />


## Proje Dizini Yapısı

```
/
├── api/                  # Vercel Sunucusuz (Serverless) Fonksiyonları
│   └── verify-secret.ts  # Aktif API anahtarı doğrulama servisi
├── cli/                  # Rust CLI Kod Tabanı
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs       # CLI giriş noktası
│       ├── scanner.rs    # Dosya tarama motoru
│       ├── rules.rs      # Gizli veri tespit kuralları
│       ├── entropy.rs    # Shannon entropi hesaplayıcısı
│       ├── hook.rs       # Git commit hook yöneticisi
│       ├── report.rs     # Rapor biçimlendirici
│       └── config.rs     # TOML yapılandırma ayrıştırıcısı
├── src/                  # React + TypeScript Frontend Uygulaması
│   ├── components/       # Kullanıcı Arayüzü Bileşenleri
│   ├── lib/              # Çekirdek Kütüphaneler (CVE, Analiz, Ayrıştırıcı vb.)
│   ├── workers/          # Web Worker Tarama Motoru
│   └── ...
├── index.html
├── package.json
└── vite.config.ts
```

---

## Kurulum ve Geliştirme Ortamı

### İstemci Uygulaması (Frontend)

Gerekli paketleri yüklemek için:
```bash
npm install
```

Yerel geliştirme sunucusunu başlatmak için:
```bash
npm run dev
```

Üretim derlemesi (Production build) almak için:
```bash
npm run build
```

---

## CLI Kurulumu ve Kullanımı

### Cargo (Rust)
```bash
cargo install securify
```

### npm
```bash
npm install -g @securify/cli
```

### Temel CLI Komutları
```bash
# Bulunulan dizinde hassas veri taraması başlatır
securify scan .

# Taramayı JSON formatında dışa aktarır
securify scan ./src --format json

# Git pre-commit kancasını aktif eder
securify init-hook

# Belirli bir dize için entropi analizi yapar
securify entropy "sk_test_51N34ghJkL90"
```

---

## Son Yapılan İyileştirmeler ve Hata Düzeltmeleri

1. **Vite Runtime Import Hatalarının Çözümü:** İstemci tarafında yalnızca tip/arayüz olarak kullanılan `PackageVersion` gibi yapıların runtime modülü olarak algılanıp hata vermesini engellemek için tüm dosyalarda tip tanımlı import modeline (`import type`) geçilmiştir.
2. **verbatimModuleSyntax ve Derleme Hataları:** TypeScript'in katı modül sözdizimi kuralları gereği oluşan derleme hataları temizlenmiştir. Web Worker ve analiz motorlarındaki tip dışa aktarımları standartlaştırılmıştır.
3. **Kullanılmayan Kodların Temizlenmesi:** Proje genelindeki gereksiz import bildirimleri, kullanılmayan parametreler ve atıl kalmış arayüzler temizlenerek derleme süresi ve bundle boyutu optimize edilmiştir.
4. **Syntax Hatalarının Çözümü:** `storage.ts` üzerinde yer alan yazım hataları düzeltilerek derleyicinin dosyayı sorunsuz işlemesi sağlanmıştır.

---

## Lisans

MIT
