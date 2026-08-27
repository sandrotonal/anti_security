# anti_security / Securify Teknik İnceleme Raporu

**Hazırlayan:** Manus AI**İnceleme tarihi:** 21 Ağustos 2026**İncelenen repo:** [sandrotonal/anti_security][1]**Canlı site:** [securify.gucluyumhe.dev][2]

## Yönetici özeti

Securify, görsel olarak güçlü bir güvenlik ürünü demosu ve çalışır bir MVP iskeleti. React/Vite tabanlı web arayüzü, Rust CLI, yerel secret taraması, Git hook, OSV bağımlılık denetimi, GitHub senkronizasyonu ve domain header audit gibi doğru ürün parçalarını bir araya getiriyor. Rust CLI’nin güncel toolchain ile derlenmesi ve beş birim testinin geçmesi, projenin tamamen sahte bir arayüzden ibaret olmadığını gösteriyor.

Bununla birlikte, **mevcut haliyle üretim ortamında gerçek güvenlik ürünü veya ödeme alan bir SaaS olarak güvenli kabul edilmemeli**. En ciddi konu ödeme doğrulamasında sandbox fallback’inin ödeme yapılmadan premium JWT üretebilmesi ve JWT secret’ın varsayılan sabit bir değere düşebilmesi. Buna ek olarak domain scanner’da localhost SSRF filtresinin atlatılabildiğini doğrudan test ettim. CI workflow’u mevcut frontend build çıktısıyla uyuşmuyor; JavaScript test script’i yok ve lint komutu ESLint 9 flat-config hatasıyla çalışmıyor.

> **Net karar:** Demo/MVP olarak değerli; ancak **P0/P1 güvenlik ve teslimat sorunları düzeltilmeden canlı satış, abonelik ve “production-grade security” iddiası için hazır değil.**

## Proje ne yapıyor?

README’ye göre proje, kaynak kodlarında API anahtarı, veritabanı bilgisi ve cloud token sızıntılarını yerelde tespit eden bir web uygulaması ve CLI’dan oluşuyor.[3] Kod tabanı pratikte dört ana yüzeye ayrılıyor: Vite + React + TypeScript frontend, Vercel-style serverless API fonksiyonları, OSV tabanlı dependency auditor ve Rust ile yazılmış `securify` CLI. README’de local browser scan, Web Worker, entropy analizi, Git hook, CVE sorgusu, GitHub entegrasyonu ve Paddle abonelik akışları birlikte pazarlanıyor.[3]

| Yüzey | Gerçek durum | Değerlendirme |
| --- | --- | --- |
| Web arayüzü | Vite build başarılı, canlı site erişilebilir | Görsel kalite yüksek; bazı state akışları kırık |
| Local secret scanner | TypeScript engine ve Web Worker mevcut | Kapsam geniş; entropy filtreleri false negative üretiyor |
| Rust CLI | Güncel Rust ile derleniyor; 5 test geçti | Temel iskelet sağlam; `--staged` gerçek anlamda kullanılmıyor |
| Dependency auditor | Canlı OSV sorgusu çalıştı | İşlevsel; lodash örneğinde 6 bulgu döndürdü |
| Domain security audit | Backend cevap veriyor | SSRF koruması eksik; frontend sonucu gizleyebiliyor |
| GitHub sync | Token ile GitHub API çağrısı var | Gerçek token kapsamı ve rate-limit davranışı dikkatle sınırlandırılmalı |
| Ödeme/abonelik | Paddle akışı ve JWT var | Kritik sandbox bypass ve default secret riski mevcut |
| CI/CD | Workflow dosyası var | Mevcut build çıktısıyla uyumsuz ve çalışması beklenmiyor |

## Gerçekleştirilen testler

Repo `/home/ubuntu/anti_security` altına çekildi. Kaynak dosyalarda kalıcı değişiklik yapılmadı; build çıktıları ve test fixture’ları izole geçici alanlarda tutuldu. Aşağıdaki sonuçlar gerçek komut çalıştırmalarına ve canlı site smoke testlerine dayanıyor.

| Test | Sonuç | Not |
| --- | --- | --- |
| `npm ci` | Başarılı | Bağımlılıklar kuruldu |
| `npm run build` | Başarılı | TypeScript derlemesi ve Vite production bundle tamamlandı |
| `npm run lint` | **Başarısız** | ESLint 9, `extends` kullanan config’i flat-config olarak kabul etmedi |
| `npm test` | **Başarısız** | `package.json` içinde `test` script’i yok |
| `cargo check` | Başarılı | Rust 1.98.0 ile |
| `cargo test` | Başarılı | **5 passed, 0 failed** |
| Rust CLI `scan` | Kısmen başarılı | Komut çalışıyor; varsayılan eşik bilinen örnekleri kaçırdı |
| Rust CLI `--format json` | Başarılı | Makine okunabilir rapor üretiyor |
| Rust CLI `init-hook` | Başarılı | `.git/hooks/pre-commit` oluşturuyor |
| Rust CLI `--staged` | **Hatalı davranış** | Untracked secret dosyasını da taradı; flag ana kodda yok sayılıyor |
| Canlı OSV auditor | Başarılı | `lodash@4.17.15`: 1 vulnerable package, 6 issue, yaklaşık 2.7 saniye |
| Canlı domain audit | Kısmen başarılı | Backend sonucunu üretiyor; homepage → dashboard akışında sonuç tab’ı gizleniyor |
| Local `verify-paddle-checkout` | **Kritik açık doğrulandı** | Sahte transaction ile premium token üretildi |
| Live `verify-secret` | Kısmen hatalı | Generic secret türü dummy değer için `active: true` döndü |
| Local `scan-site` localhost testi | **SSRF filtresi atlandı** | `127.0.0.1` için 403 yerine 200 audit cevabı döndü |

### Rust CLI false-negative testi

İzole fixture’da AWS Access Key ID, Stripe secret key, PostgreSQL connection string ve GitHub token örnekleri bulunan `src/secrets.js` tarandı. Varsayılan `entropy_threshold = 4.5` ile CLI **0 leak ve exit code 0** verdi. Aynı fixture’a geçici `entropy_threshold = 0.0` konduğunda AWS, Stripe ve PostgreSQL bulguları çıktı; CLI **3 leak ve exit code 1** verdi. Bu, kural regex’lerinin var olduğunu fakat entropy kapısının biçimsel olarak gerçek görünen bazı anahtarları sessizce filtrelediğini gösteriyor.

Daha sonra yalnızca temiz `src/clean.js` dosyası staged, secret dosyası untracked iken `scan . --staged` çalıştırıldı. Sonuç yine untracked secret dosyasını taradı ve düşük eşikte 3 bulgu üretti. Bunun nedeni `main.rs` içinde `staged: _` ile parametrenin açıkça yok sayılmasıdır.[4]

### Canlı dependency auditor testi

Canlı auditor ekranında `lodash` ve `4.17.15` ile quick query çalıştırıldı. Sistem bir paketi audit etti, paketi vulnerable olarak işaretledi ve altı OSV bulgusu gösterdi. ReDoS ve prototype pollution bulguları için 4.17.21, 4.17.23 ve 4.18.0 gibi remediation sürümleri sunuldu. Bu akış, ürünün en hazır ve doğrulanabilir parçalarından biri.[2] [8]

## Kritik güvenlik bulguları

### P0 — Ödeme yapılmadan premium token üretilebiliyor

`api/verify-paddle-checkout.ts`, `environment === 'sandbox' && !PADDLE_API_KEY` durumunda Paddle’a transaction doğrulaması göndermeden doğrudan JWT üretip `success: true` döndürüyor.[5] Aynı dosyada `JWT_SECRET` tanımsızsa sabit bir development secret kullanılıyor. Yerel API’ye gerçek olmayan `txn_fake_without_payment` transaction ID’si, sahte e-posta ve `Agency` planı gönderildi; endpoint 200 ile token üretti. Üretilen token daha sonra `verify-token` endpoint’inde `valid: true` ve `plan: Agency` olarak kabul edildi.

Bu fallback yalnızca tamamen izole local development için korunacaksa bile production deploy’da kesin bir fail-closed kontrolü bulunmalı. Ortam yanlışlıkla sandbox kalırsa veya `PADDLE_API_KEY` yüklenmezse saldırgan ödeme yapmadan Pro/Agency token alabilir.

**Düzeltme:** Production’da `PADDLE_API_KEY`, `JWT_SECRET`, Paddle environment ve server-side price mapping yoksa endpoint 500 ile durmalı; sandbox bypass yalnızca ayrı bir local flag ile ve production build’den tamamen dışlanarak çalışmalı. Gelen `plan`, `billing` ve transaction içindeki gerçek price ID ayrıca karşılaştırılmalı. Default secret kaldırılmalı ve mevcut secret’lar döndürülmelidir.

### P0 — Varsayılan JWT secret token sahteciliğine açık kapı bırakıyor

Hem ödeme doğrulama hem token doğrulama tarafında `process.env.JWT_SECRET || 'securify-local-development-secret-key-2026'` biçiminde sabit fallback bulunuyor.[5] [9] Bir production ortamında `JWT_SECRET` unutulursa, saldırgan kaynak kodda görünen secret ile kendi e-posta, plan ve expiry alanlarını imzalayabilir. Bu yalnızca “development kolaylığı” değildir; premium yetkilendirme mekanizmasının temel güven köküdür.

**Düzeltme:** Secret yoksa uygulama başlatılmamalı; environment validation ile deploy başarısız olmalı. JWT için key rotation, kısa ömürlü access token, server-side subscription lookup ve mümkünse token içine plan bilgisini tek yetki kaynağı olarak koymama yaklaşımı kullanılmalı.

### P0/P1 — Domain scanner’da localhost SSRF filtresi atlatılabiliyor

`api/scan-site.ts` önce hostname’i DNS ile çözümleyip private IP aralıklarını kontrol ediyor; ancak literal IP’nin DNS resolver’dan boş dönebildiği durumda `127.0.0.1` doğrudan bu kontrolden geçebiliyor. Testte local Vite API’ye `url=http://127.0.0.1:5173` gönderildi ve beklenen 403 yerine 200 ile tam audit JSON’u döndü.[4]

Ek olarak fetch `redirect: 'follow'` kullanıyor ve her redirect hedefi için yeniden IP doğrulaması yapmıyor. Public bir hostname’in private adrese yönlendirilmesi veya DNS rebinding senaryosu bu kontrolü aşabilir. IPv4 çözümlemesi varsa IPv6 fallback’ine hiç bakılmaması da ek bir eksiklik.

**Düzeltme:** Önce URL hostname’inin kendisini `net.isIP` ile parse edip literal private/loopback IP’leri reddedin. A ve AAAA kayıtlarının tamamını çözün; her adresi RFC1918, loopback, link-local, multicast, metadata ve IPv6 özel aralıklarıyla karşılaştırın. Redirect’leri kapatıp elle takip edin ve her hop’ta tekrar doğrulayın. Production egress firewall ile RFC1918, loopback, link-local ve cloud metadata adreslerini ayrıca engelleyin.

### P1 — CI workflow mevcut build ile çalışmıyor

`.github/workflows/securify-scan.yml`, tarama adımında `require('./dist/lib/scanEngine.js' )` ve `require('glob')` bekliyor.[6] Mevcut `npm run build` ise `dist/assets/...` bundle’ları üretiyor; `dist/lib/scanEngine.js` üretmiyor. Root `node_modules` altında `glob` paketi de yok. Bu nedenle workflow’un gerçek scanner adımında module-not-found hatası vermesi bekleniyor. Üstelik adım `continue-on-error: true` ile işaretlenmiş; sonraki SARIF adımı dosya üretilememiş olsa bile çalışmaya çalışıyor.

**Düzeltme:** CI’da ya Rust CLI binary’sini derleyip çağırın ya da TypeScript scanner’ı ayrı bir Node library build’i olarak paketleyin. `glob` bağımlılığını manifestoya ekleyin veya Node 20’nin mevcut dosya API’lerini kullanın. `continue-on-error` kaldırılmalı; sonuç dosyası üretilmeden SARIF/upload adımı çalışmamalı. Workflow’a temiz checkout üzerinde gerçek bir secret fixture ve temiz fixture testi eklenmeli.

### P1 — `--staged` gerçekten staged dosyaları taramıyor

Rust CLI `main.rs` içinde `staged` alanı destructuring sırasında `_` ile atılıyor ve scanner her zaman verilen path’in tamamını WalkDir ile geziyor.[4] Bu, pre-commit hook’un untracked ve ignored olmayan tüm dosyaları taramasına yol açıyor. Daha önemlisi ürün dokümantasyonundaki “staged files” vaadi ile uygulama davranışı uyuşmuyor.

**Düzeltme:** `git diff --cached --name-only --diff-filter=ACMR` çıktısını alıp yalnızca staged dosyaları scanner’a verin. Git repo dışında `--staged` için açık hata döndürün. Bu davranış için gerçek git fixture testi ekleyin.

### P1 — Secret detection entropy filtresi gerçek anahtarları kaçırıyor

TypeScript engine’de çok sayıda pattern’den sonra entropy filtresi uygulanıyor.[10] Rust CLI’da varsayılan eşik 4.5 bits/symbol.[4] AWS access key ID gibi yapısı büyük ölçüde sabit alfanümerik olan gerçek görünümlü değerler bu eşiği geçmeyebiliyor. Test fixture’ı bu problemi doğrudan gösterdi: default config 0 leak, threshold 0 config ise AWS/Stripe/PostgreSQL bulguları verdi.

**Düzeltme:** Provider-specific pattern eşiklerini secret formatının gerçek entropy dağılımına göre ayarlayın; biçimsel olarak güçlü tanımlayıcılarda entropy’yi veto değil confidence sinyali yapın. Regex eşleşmesini düşük güvenli warning olarak raporlayıp dosyayı rule severity’ye göre işaretleyin. Canary ve test fixture’ları gerçek provider formatlarını kapsamalı.

### P1 — `verify-secret` generic türlerde otomatik yanlış pozitif üretiyor

`api/verify-secret.ts`, GitHub, Stripe, Google ve Supabase dışındaki her tür için `active = true` yapıyor.[7] Canlı endpoint’e `type: generic entropy key` ve `secret: not-a-secret` gönderildi; cevap `{"active":true}` oldu. Bu, generic entropy bulgusunu “aktif anahtar” gibi gösterir ve dashboard’daki risk değerlendirmesini yanlış yükseltir.

Ayrıca local Vite API adapter request body’sini önceden tükettiği için endpoint raw stream’i yeniden okumaya çalışıyor; local testte geçerli JSON body bile `missing request body` ile 400 döndü. Live Vercel deploy’da bu kısım farklı davranabilir, fakat handler’ın `req.body` ile raw stream arasında tek bir sözleşmeye indirilmesi gerekir.

**Düzeltme:** Doğrulanamayan tiplerde `active: unknown` veya `verified: false` döndürün; “active” yalnızca sağlayıcının kesin 2xx/401 semantiğiyle atanmalı. Secret’ları provider API’sine gönderdiğiniz açıkça belirtilmeli ve raw request/body parse tek biçime indirilmeli.

### P1 — Homepage → dashboard domain audit sonucu kullanıcıdan gizlenebiliyor

`SecurifyHomeScanner` callback’i `initialWebsiteUrl` set edip dashboard’a geçiyor. Dashboard effect’i önce `setScanTab('website')` ve `performSiteScan()` çağırıyor; ancak guest kullanıcı için başka bir mount effect’i `setScanTab('local')` yapıyor.[11] Canlı testte Enter ile gönderim gerçekten dashboard’a geçti, progress 1/9’dan 9/9’a ulaştı ve website usage `1 / 3` oldu; fakat ekran local scanner tab’ında kaldı ve site report görünmedi.

**Düzeltme:** Initial website scan state’ini tek effect içinde yönetin; guest initialization effect’i scan tab’ını resetlememeli. Scan sonucu geldikten sonra tab’ı koşulsuz tekrar `website` yapın ve API hata state’ini görünür kılın.

## Orta seviye güvenilirlik ve ürün bulguları

### Lint ve test altyapısı eksik

`npm run lint`, ESLint 9 flat-config sisteminde `extends` kullanan `eslint.config.js` nedeniyle çalışmıyor. Root `package.json` içinde `test` script’i yok; bu yüzden frontend için otomatik test suite’i bulunmuyor. TypeScript build’in başarılı olması olumlu, fakat build tek başına UI state, API sözleşmesi veya güvenlik davranışlarını doğrulamaz.

Önerilen minimum pipeline `typecheck`, `lint`, unit tests, API contract tests, Rust tests, fixture-based secret tests, SSRF regression tests ve clean production build’den oluşmalı. `npm test` komutu mutlaka gerçek bir test runner’a bağlanmalı.

### Kullanım limitleri ve localStorage sayaçları tutarsız

Pricing ekranında Free plan için günde 5 scan yazarken dashboard local directory scan’i unlimited gösteriyor.[2] Ayrıca `websiteScanCount` kullanıcı suffix’iyle okunurken scan tamamlandığında `securify_usage_website` anahtarına suffix olmadan yazılıyor. Bu nedenle kullanıcılar arasında kullanım sayacı karışabilir ve limit enforcement güvenilirliğini kaybedebilir.

**Düzeltme:** Plan limitlerini tek bir shared config’ten üretin. Kullanıcı bazlı sayaçları aynı key formatıyla okuyup yazın; gerçek SaaS limitlerini yalnızca client-side localStorage’a bırakmayın, server-side kullanıcı/abonelik kimliğiyle uygulayın.

### README ile implementation arasında tutarsızlıklar var

README, ödeme kısmında Shopier integration ifadesi kullanırken canlı site ve kaynak kod Paddle kullanıyor.[3] README aktif secret verification ve SSRF korumasını güvenlik prensibi olarak sunuyor; testler ise generic verification’ın her şeyi active sayabildiğini ve localhost filtresinin atlanabildiğini gösterdi. README’deki “kod ve konfigürasyonlar hiçbir şekilde uzak sunucuya gönderilmez” iddiası da domain scan, OSV sorgusu, GitHub API, Paddle ve provider secret verification akışlarıyla aynı kapsamda okunmamalı.[3] Local dosya scan’in browser’da yapılması ile aktif provider doğrulamasının secret’ı üçüncü taraf API’ye göndermesi farklı şeylerdir.

### CORS ve veri minimizasyonu

Birçok API endpoint’i `Access-Control-Allow-Origin: *` ile birlikte `Access-Control-Allow-Credentials: true` yayıyor.[4] [5] [7] Bu kombinasyon tarayıcıların credential paylaşımında kısıtlanabilse de gereksiz geniş bir CORS politikasıdır ve endpoint’leri açık internetten çağrılabilir bırakır. Kullanılan endpoint’e göre yalnızca kendi origin’inizi allowlist’e almak, OPTIONS davranışını sınırlamak ve server-side rate limit uygulamak daha güvenli olur.

`verify-token` token’ı Authorization header yerine query parameter’dan da kabul ediyor.[9] JWT’nin URL’de taşınması access log, browser history ve Referer sızıntısı riskini artırır. Bu fallback kaldırılmalı; token yalnızca Authorization header veya HttpOnly, Secure, SameSite cookie ile taşınmalıdır.

### Frontend’in ürün sunumu güçlü, fakat bazı pazarlama iddiaları ölçümle desteklenmiyor

Canlı site görsel olarak tutarlı bir dark terminal estetiğine, anlaşılır navigasyona, pricing kartlarına, auditor’a ve dashboard’a sahip. OSV auditor gerçekten çalışıyor. Buna karşın “1,200+ developers trust”, “4.9/5”, “0 leaks”, “SOC 2 Type II certified” ve “GDPR verified” gibi metrik/uyumluluk ifadeleri için repo içinde doğrulanabilir kanıt bulunamadı. Bunlar gerçek denetim veya müşteri kanıtı olmadan kullanılıyorsa güven ve hukuki risk oluşturabilir.

Domain scanner’ın finansal risk kartları da gerçek bir hukuki/finansal değerlendirme değil, kod içine yazılmış model metinleri ve sabit aralıklardır.[4] Bu bölüm “illustrative estimate” olarak açıkça etiketlenmeli; garanti, resmi compliance sertifikası veya kesin ceza tahmini gibi sunulmamalı.

## Güçlü taraflar

İlk güçlü taraf ürün fikrinin anlaşılır olmasıdır: secret leak detection, pre-commit gate, dependency audit ve live header audit tek bir deneyimde birleştirilmiş. İkinci güçlü taraf local scan iddiasının önemli bir kısmının gerçekten client-side Web Worker ve Rust CLI ile desteklenmesidir. Üçüncü güçlü taraf Rust CLI’nin güncel Rust 1.98 ile derlenmesi, beş unit testin geçmesi, terminal/JSON çıktı üretmesi ve hook oluşturabilmesidir. Dördüncü güçlü taraf dependency auditor’ın canlı OSV sorgusunun gerçek eski bir lodash sürümünde beklenen bulguları göstermesidir. Beşinci güçlü taraf ise frontend build’inin 1.814 modül transform edip production bundle üretebilmesidir.

Bu nedenle proje çöpe atılacak bir prototip değil. Doğru önceliklendirmeyle güvenlik aracı olarak işe yarayan bir çekirdek çıkarılabilir; fakat şu anki durum “security product” iddiasından çok “security product prototype” seviyesindedir.

## Öncelikli düzeltme planı

| Öncelik | Yapılacak iş | Kabul kriteri |
| --- | --- | --- |
| 0 | Paddle sandbox bypass ve default JWT secret kaldırılmalı | Sahte transaction hiçbir ortamda premium token üretmiyor; secret yoksa deploy fail ediyor |
| 0 | JWT yetkilendirmesi server-side subscription state’e bağlanmalı | Plan yalnızca doğrulanmış Paddle price/status üzerinden veriliyor |
| 0 | SSRF engeli yeniden tasarlanmalı | Literal/private IPv4-IPv6, redirect, DNS rebinding ve metadata adresleri testleri 403 veriyor |
| 1 | CI workflow gerçek build ile uyumlu hale getirilmeli | Temiz checkout’ta workflow fail/success durumu doğru; SARIF dosyası gerçekten üretiliyor |
| 1 | Rust `--staged` uygulanmalı | Staged clean + untracked secret fixture’ında scan exit 0 |
| 1 | Entropy veto olmaktan çıkarılmalı | Gerçek format fixture’ları default config ile bulunuyor; false negative regression testleri var |
| 1 | `verify-secret` unknown sonucu düzeltmeli | Generic dummy secret `active: true` dönmüyor; `unknown` ayrı gösteriliyor |
| 1 | Domain result tab race düzeltilmeli | Homepage’den gönderilen domain audit sonucu otomatik website tab’ında görünüyor |
| 2 | ESLint config migrate edilmeli ve JS test runner eklenmeli | `npm run lint` ve `npm test` temiz checkout’ta başarılı |
| 2 | Plan ve sayaç mantığı tek kaynağa alınmalı | Free/Pro limitleri pricing, dashboard ve backend’de aynı |
| 2 | README, privacy ve compliance metinleri gerçek implementation’a göre güncellenmeli | Shopier/Paddle ve zero-upload ifadeleri doğru kapsamda |

## Son karar

**Kabak değil; fikir ve demo seviyesi iyi.** Özellikle local secret scanner, Rust CLI ve OSV auditor gerçek değer taşıyor. Ancak güvenlik ürünü güvenlik açığı barındırmamalı: ödeme bypass’ı, varsayılan JWT secret ve SSRF filtresi çözülmeden bu repo canlıda güvenlik/abonelik ürünü olarak kullanılmamalı.

Kullanım önerim şudur: öğrenme, demo, iç araç veya kontrollü open-source MVP olarak kullanılabilir. Üretim deploy’undan önce P0/P1 maddeleri kapatılmalı, ardından gerçek fixture’lar ve API contract testleri eklenmeli. Bu düzeltmelerden sonra ürünün “developer security preflight” veya “local-first secret scanner” olarak konumlandırılması, şu anki geniş ve kanıtlanmamış compliance/financial risk iddialarından daha güvenilir olur.

## References

[1]: [https://github.com/sandrotonal/anti_security](https://github.com/sandrotonal/anti_security) — anti_security GitHub repository[2]: [https://securify.gucluyumhe.dev/](https://securify.gucluyumhe.dev/) — canlı Securify web uygulaması[3]: [https://github.com/sandrotonal/anti_security/blob/main/README.md](https://github.com/sandrotonal/anti_security/blob/main/README.md) — proje README ve mimari iddiaları[4]: [https://github.com/sandrotonal/anti_security/blob/main/cli/src/main.rs](https://github.com/sandrotonal/anti_security/blob/main/cli/src/main.rs) — Rust CLI komutları ve `--staged` işleme akışı[5]: [https://github.com/sandrotonal/anti_security/blob/main/api/verify-paddle-checkout.ts](https://github.com/sandrotonal/anti_security/blob/main/api/verify-paddle-checkout.ts) — Paddle transaction doğrulama ve JWT üretimi[6]: [https://github.com/sandrotonal/anti_security/blob/main/.github/workflows/securify-scan.yml](https://github.com/sandrotonal/anti_security/blob/main/.github/workflows/securify-scan.yml) — GitHub Actions secret scan workflow’u[7]: [https://github.com/sandrotonal/anti_security/blob/main/api/verify-secret.ts](https://github.com/sandrotonal/anti_security/blob/main/api/verify-secret.ts) — aktif secret doğrulama endpoint’i[8]: [https://osv.dev/vulnerability/GHSA-29mw-wpgm-hmr9](https://osv.dev/vulnerability/GHSA-29mw-wpgm-hmr9) — OSV: lodash ReDoS advisory[9]: [https://github.com/sandrotonal/anti_security/blob/main/api/verify-token.ts](https://github.com/sandrotonal/anti_security/blob/main/api/verify-token.ts) — JWT token doğrulama endpoint’i[10]: [https://github.com/sandrotonal/anti_security/blob/main/src/lib/scanEngine.ts](https://github.com/sandrotonal/anti_security/blob/main/src/lib/scanEngine.ts) — TypeScript secret pattern ve entropy engine’i[11]: [https://github.com/sandrotonal/anti_security/blob/main/src/components/SecurifyDashboard.tsx](https://github.com/sandrotonal/anti_security/blob/main/src/components/SecurifyDashboard.tsx) — dashboard scan state ve website audit effect’leri

## Ödeme dışı ek doğrulamalar

Ayrıntılı ikinci incelemede TypeScript CLI’nin `format` tipinde `sarif` ve `markdown` seçenekleri tanımlı olmasına rağmen çıktı fonksiyonunda yalnızca `json` ve `text` dallarının bulunduğu doğrulandı. `--format sarif` veya `--format markdown` verildiğinde beklenen dosya/çıktı üretilmiyor; ayrıca kritik/high bulgular için çıkış kodu yalnızca `text` dalında ayarlanıyor. CLI’nin help ekranı “40+ patterns”, “multiple export formats”, “GitHub Actions” ve “zero false positives” gibi özellikleri vaat ediyor, fakat bu özelliklerin bir bölümü eksik veya farklı katmanlarda yalnızca kısmen uygulanmış durumda.

GitHub remote scan handler, repo ağacını alırken “ALL files” mesajı gösterse de gerçek `filesToAudit` filtresi yalnızca `.env`, `config.js`, `config.ts`, `package.json` veya adında `credentials`/`secret` geçen dosyaları seçiyor. Böylece örneğin `src/settings.ts`, `config.yaml`, `deploy.yml` veya sıradan isimli kaynak dosyalarındaki secret’lar remote scan’den kaçabilir. Git tree yanıtındaki `truncated` alanı da kontrol edilmiyor; büyük repolarda eksik ağaç sessizce tamamlanmış gibi işlenebilir.

GitHubAuthModal gerçek OAuth akışı başlatmıyor; kullanıcı adı ve isteğe bağlı Personal Access Token alıp doğrudan `api.github.com/user` çağrısıyla doğruluyor, sonrasında “establishing secure oauth handshake” gibi yalnızca progress animasyonları gösteriyor. PAT `localStorage` içindeki `securify_github_pat` anahtarına düz metin olarak yazılıyor. Bu davranış, browser’daki XSS veya aynı origin’de çalışan kötü niyetli bir script için token çalınabilirliği ve OAuth iddiası açısından risklidir. Kullanıcıdan en dar fine-grained token kapsamı istenmeli, token browser’da kalıcı tutulmamalı veya kısa ömürlü backend oturumu kullanılmalı.

Dependency auditor’da GitHub Advisory tarafındaki `isVersionAffected` fonksiyonu gerçek semver karşılaştırması yapmıyor; range boş değilse her sürümü affected kabul ediyor. Ayrıca `cleanVersion` aralıkları kaba biçimde kesiyor ve `workspace:*`, `latest`, `file:`, `git:` veya değişkenli sürümler gibi gerçek manifest değerlerini doğru temsil etmiyor. OSV sorgusu hatasında `[]` dönüldüğü için veri kaynağı kesintisi “açık yok” gibi görünebilir. API yanıtındaki `severity` alanının bazı advisory kayıtlarında array, bazılarında string olması da parser’ın database-specific severity bulunmayan kayıtlarda hata üretme riski taşır.

Homepage simulator gerçek repo veya Git hook üzerinde çalışmıyor; sabit `mockFiles` içeriğini ve local state’i tarıyor, commit’i yalnızca UI içinde simüle ediyor. “Auto-fix” gerçek projedeki dosyayı düzeltmek yerine editördeki demo kodunu değiştirip tarayıcıdan sabit bir `.env.example` indiriyor. Site audit içindeki exploit simülasyonu da gerçek exploit çalıştırmıyor; sabit senaryo logları üretiyor. Bu demolar değerli UX parçalarıdır ancak production scanner, auto-remediation veya penetration test özelliği gibi sunulmamalıdır.

Webhook manager webhook URL’si, secret’ı ve yapılandırmayı `localStorage`’ta tutuyor; dış endpoint’lere timeout, retry/backoff, SSRF/CORS açıklaması, delivery ID veya replay protection olmadan tarama payload’ı gönderiyor. Slack/Teams/Discord sınıfları fetch sonucunu ortak bir hata sözleşmesiyle doğrulamıyor. Kullanıcı URL’leri doğrulanmalı, payload’da secret veya kaynak kodu bulunmadığı garanti edilmeli ve gerçek entegrasyonlar backend queue/secret store üzerinden çalıştırılmalıdır.

Tarama geçmişi IndexedDB’de `results` alanını geniş biçimde saklıyor. GitHub sonuçları context lines ve repo metadata’sı içeriyor; bu veriler browser profilinde şifrelenmeden kalıyor. “No backend” ifadesi local persistence’ın veri riskini ortadan kaldırmaz. Hassas eşleşmelerin yalnızca redacted biçimde tutulması, retention/clear/export politikasının açık olması ve browser storage’ın tehdit modelinin belgelenmesi gerekir.

README, site ve source arasında Rust CLI, TypeScript CLI ve browser scanner olmak üzere üç farklı davranış katmanı oluşmuş. Sürümler ve komutlar da tutarsız: root package `0.0.0`, Rust crate `0.1.0`, TypeScript CLI help `1.0.0`, site dokümanı `2.4.0` gösteriyor; README’de npm paketi `@securify/cli` olarak yazılırken root package private ve yayınlama metadata’sı bulunmuyor. Tek bir canonical CLI seçilmeli veya her katmanın sınırı, sürümü ve kurulum yöntemi açıkça belgelenmelidir.