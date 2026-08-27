# anti_security / Securify — Ödeme Dışı Kapsamlı Teknik Analiz

**İnceleme tarihi:** 21 Ağustos 2026**Repo:** [sandrotonal/anti_security][1]**Canlı site:** [securify.gucluyumhe.dev][2]**Kapsam notu:** Kullanıcının isteği doğrultusunda ödeme/Paddle/sandbox checkout konusu bu rapora dahil edilmemiştir.

## Kısa sonuç

Securify’nin temel fikri ve bazı teknik parçaları gerçek değer taşıyor: local secret scanner, Web Worker akışı, Rust CLI, Git hook iskeleti, OSV dependency auditor ve canlı header audit. Frontend production build’i tamamlanıyor; Rust CLI güncel toolchain ile derleniyor ve beş birim testi geçiyor. Canlı dependency auditor’da eski bir lodash sürümü için gerçek OSV sonuçları alındı.

Buna rağmen proje bugün güvenlik tarama ürünü olarak **güvenilir bir release seviyesinde değil**. Ödeme dışındaki en önemli sorunlar şunlar: domain scanner SSRF koruması literal localhost adresinde atlatılabiliyor; GitHub token akışı gerçek OAuth değil ve PAT’ı localStorage’a düz metin yazıyor; GitHub remote scan “tüm dosyalar” iddiasına rağmen yalnızca isimden şüpheli görünen dosyaları tarıyor; Rust `--staged` seçeneği fiilen uygulanmıyor; entropy filtresi gerçek secret formatlarını kaçırıyor; dependency auditor gerçek semver karşılaştırması yapmıyor; JavaScript CLI’nin SARIF/Markdown çıktı vaatleri uygulanmamış; CI workflow mevcut build çıktısıyla uyuşmuyor; frontend lint ve test altyapısı çalışmıyor; dashboard bazı gerçek sonuçlar yerine sabit/simüle metrikler gösteriyor.

> **Son karar:** Proje iyi bir güvenlik ürünü demosu ve MVP çekirdeği. Ancak “production-grade scanner”, “zero false positives”, “tüm repo taraması” veya kurumsal compliance aracı olarak konumlandırılmadan önce aşağıdaki P0/P1 maddeleri kapatılmalı.

## Test ve doğrulama özeti

Repo `/home/ubuntu/anti_security` altına çekildi. Kaynak dosyalarda kalıcı değişiklik yapılmadı; geçici fixture’lar `/tmp` altında kullanıldı. Aşağıdaki sonuçlar gerçek komut, local API, canlı API ve canlı site denemelerine dayanmaktadır.

| Kontrol | Sonuç | Açıklama |
| --- | --- | --- |
| `npm ci` | Başarılı | Frontend bağımlılıkları kuruldu |
| `npm run build` | Başarılı | `tsc -b` ve Vite production bundle tamamlandı |
| `npm run lint` | **Başarısız** | ESLint 9 flat-config, `extends` kullanan config’i reddetti |
| `npm test` | **Başarısız** | Root `package.json` içinde `test` script’i yok |
| `cargo check` | Başarılı | Rust 1.98 toolchain ile |
| `cargo test` | Başarılı | **5 passed, 0 failed** |
| Rust CLI `scan` | Kısmen başarılı | Komut çalışıyor; default entropy eşiği bazı gerçek formatları kaçırdı |
| Rust CLI JSON çıktı | Başarılı | Makine okunabilir çıktı üretildi |
| Rust `init-hook` | Başarılı | Pre-commit hook oluşturuldu |
| Rust `--staged` | **Başarısız davranış** | Staged olmayan secret fixture’ı da tarandı |
| Canlı OSV auditor | Başarılı | `lodash@4.17.15` için 6 advisory bulgusu alındı |
| Canlı domain audit | Kısmen başarılı | Backend sonuç üretti; homepage → dashboard sonucu görünür tab’a düşmedi |
| Local `scan-site` localhost testi | **Başarısız güvenlik kontrolü** | `127.0.0.1` için beklenen 403 yerine 200 döndü |
| Live `verify-secret` generic test | **Yanlış pozitif** | `not-a-secret` için `active: true` döndü |
| Root dependency audit | Dikkat gerektiriyor | Dev dependency ağacında 3 moderate, 1 high, 1 critical; `--omit=dev` sonucu temiz |

## Önceliklendirme tablosu

| Öncelik | Alan | Durum | Risk |
| --- | --- | --- | --- |
| P0 | Domain scanner SSRF | Literal private IP filtresi atlanıyor; redirect tekrar doğrulanmıyor | İç ağ/metadata erişimi, port tarama ve egress abuse |
| P0 | Generic secret verification | Bilinmeyen tipler otomatik active sayılıyor | Kullanıcıya yanlış güvenlik sonucu |
| P0 | GitHub PAT saklama | Manuel PAT localStorage’da düz metin | XSS veya aynı origin script’i ile token hırsızlığı |
| P1 | GitHub remote kapsamı | “ALL files” yazmasına rağmen dar dosya filtresi var | Secret’ların sessizce kaçması |
| P1 | Rust `--staged` | Flag parse edilip scanner’da yok sayılıyor | Pre-commit koruması vaat edildiği gibi çalışmıyor |
| P1 | Secret detection entropy | Eşleşme entropy düşükse tamamen atılıyor | Gerçek credential false negative |
| P1 | Dependency semver | `isVersionAffected` her aralığı affected kabul ediyor | False positive / yanlış remediation |
| P1 | JS CLI output | SARIF/Markdown tanımlı fakat uygulanmamış | CI entegrasyonu ve raporlama kırılıyor |
| P1 | CI workflow | `dist/lib` ve `glob` varsayımları build ile uyuşmuyor | CI güvenlik kapısı fiilen çalışmıyor |
| P1 | API abuse controls | Public endpoint’lerde gerçek rate limit/auth yok | Egress, provider quota ve maliyet abuse’u |
| P2 | Test/lint | Lint kırık, frontend test suite yok | Regresyonlar yakalanamıyor |
| P2 | Dashboard metrikleri | Süre, commit hash, hook sayısı gibi alanlar sabit/random | Rapor güvenilirliği zedeleniyor |
| P2 | Demo ve gerçek özellik ayrımı | Simulator/SCA/IaC akışlarının bir bölümü sabit veri | Kullanıcı gerçekte neyin tarandığını anlayamıyor |
| P2 | Veri saklama | Context ve sonuçlar IndexedDB/localStorage’da korunmasız | Hassas kod ve token kalıntısı |
| P2 | Dokümantasyon | Sürüm, mimari ve yetenek iddiaları uyumsuz | Yanlış kurulum ve yanlış güven beklentisi |

## 1. P0 — Domain scanner SSRF koruması eksik

`api/scan-site.ts`, kullanıcıdan gelen URL’nin hostname’ini DNS ile çözerek private IP aralıklarını kontrol ediyor.[9] Ancak literal IP’nin `dns.Resolver.resolve4()`/`resolve6()` akışında boş sonuç bırakabilmesi nedeniyle `http://127.0.0.1:5173` doğrudan fetch aşamasına ulaşabildi. Local endpoint’e yapılan gerçek testte 403 yerine 200 ve tam audit JSON’u döndü.

Sorun yalnızca localhost değildir. DNS sonucu boşsa kod fail-open davranıyor; `ips.length === 0` durumunda istek reddedilmiyor. A kaydı varsa AAAA kaydına ayrıca bakılmıyor; A yoksa AAAA deneniyor. Böylece tüm adres ailesini ve çoklu DNS cevabını garanti eden bir kontrol yok. `redirect: 'follow'` kullanılıyor; ilk hostname public olsa bile redirect sonrası hedef yeniden private-IP kontrolünden geçirilmiyor. DNS rebinding senaryosu da aynı sınıfın içinde kalıyor.

HTTPS isteği başarısız olunca otomatik olarak HTTP’ye düşülmesi de güvenlik ve doğruluk sorunudur. Kullanıcı HTTPS denetimi isterken sistem daha zayıf HTTP endpoint’ini tarayabilir; ayrıca bu fallback yeni bir hedef için tekrar SSRF kontrolü yapmıyor. Endpoint GET isteği gönderiyor; bazı sistemlerde state değiştiren GET rotaları bulunduğu için salt header audit amacıyla GET kullanmak yan etki doğurabilir.

Endpoint’in public ve authentication’sız olması, rate limit veya concurrency sınırı bulunmaması da abuse yüzeyini büyütüyor. Saldırgan bu rotayı iç ağ adreslerini, cloud metadata adreslerini veya farklı portları yoklayan bir proxy gibi kullanmayı deneyebilir. Kullanıcı kotası localStorage’a dayanıyorsa tarayıcı verisi silinerek limit sıfırlanabilir.

**Gerekli düzeltme:** URL hostname’i DNS’e gitmeden önce `net.isIP` ile parse edilip tüm loopback, RFC1918, link-local, multicast, unspecified, IPv6 ULA ve cloud metadata aralıkları reddedilmeli. A ve AAAA kayıtlarının tamamı çözümlenmeli; `[]` sonucu güvenli kabul edilmemeli. Redirect kapatılmalı veya her hop aynı politika ile elle takip edilmeli. HTTPS → HTTP fallback kaldırılmalı. Server-side rate limit, concurrency kotası, timeout, egress firewall ve metadata engeli eklenmeli. SSRF regression testleri literal IP, decimal/octal IP, IPv6, DNS rebinding, redirect ve private port vakalarını içermeli.

## 2. P0 — Secret verification bilinmeyen türlerde yanlış pozitif

`api/verify-secret.ts`, GitHub, Stripe, Google ve Supabase türlerini ayrı ayrı doğrulamaya çalışıyor; bunun dışındaki tüm türlerde `active = true` atıyor.[10] Canlı endpoint’e `type: generic entropy key` ve `secret: not-a-secret` gönderildi. Endpoint 200 ile `{"active":true}` döndürdü. Bu, doğrulanamayan bir entropy veya custom secret bulgusunu aktif credential gibi gösterir.

Bu davranış ürünün risk skorunu yanlış yükseltir ve kullanıcıyı gereksiz credential rotation’a yönlendirebilir. Doğrulama yapılamayan tür “active” değil, `unknown` veya `unverified` olmalıdır. Provider’a özgü doğrulama, sadece kesin semantik bilindiğinde active/inactive sonucu üretmelidir.

Ayrıca handler `req.body` mevcut olsa bile raw request stream’ini tekrar okumaya çalışıyor. Local Vite API adapter body’yi önce tükettiği için geçerli JSON dummy payload’ları local testte `missing request body` ile 400 döndü. Canlı Vercel runtime’ı farklı davranabilse de handler tek bir body sözleşmesi kullanmalı; ya framework’ün parsed `req.body` alanı kullanılmalı ya da raw stream açıkça tek yerde parse edilmelidir.

Secret doğrulama işlemi gerçek credential’ı GitHub, Stripe, Google veya Supabase gibi üçüncü taraflara gönderiyor. Bu durum README’deki “hiçbir veri uzak sunucuya gönderilmez” ifadesiyle aynı kapsamda sunulamaz. Kullanıcı açıkça bilgilendirilmeli; secret’lar loglanmamalı; endpoint anonymous abuse, brute-force provider probing ve quota tüketimine karşı rate limit edilmelidir.

**Gerekli düzeltme:** Sonuç sözleşmesi `active | inactive | unknown` şeklinde ayrılmalı. Unknown provider’larda otomatik true kaldırılmalı. Request body parse tekleştirilmeli. Provider doğrulama endpoint’i server-side auth, rate limit, audit log redaction ve kısa timeout ile korunmalı. UI’da “active verification sends the detected secret to the provider” uyarısı bulunmalı.

## 3. P0/P1 — GitHub Personal Access Token akışı güvenli OAuth değil

`GithubAuthModal` gerçek GitHub OAuth authorization code flow kullanmıyor. Kullanıcı adı ve Personal Access Token alınıyor, doğrudan `api.github.com/user` çağrısıyla kontrol ediliyor; ardından “establishing secure oauth handshake” ve “requesting scopes” metinleri yalnızca progress animasyonu olarak gösteriliyor.[12] Gerçek OAuth redirect, state doğrulaması, PKCE veya server-side token exchange yok.

Girilen PAT `localStorage` içindeki `securify_github_pat` anahtarına düz metin olarak yazılıyor.[12] `App.tsx` de `securify_github_user` nesnesini localStorage’dan okuyup token’ı React state’inde taşıyor.[20] Uygulamadaki herhangi bir XSS veya aynı origin’de çalışan kötü niyetli script token’ı okuyabilir. Browser profili paylaşılan bir bilgisayarda da token kalıcı olur.

Permission checkbox’ları gerçek GitHub OAuth scope talebi değildir; yalnızca UI state’idir. Token’ın gerçekten least-privilege olup olmadığı kontrol edilmiyor. Username’siz public fallback, GitHub API 403 rate-limit durumunda fallback profil akışına izin veriyor; bu bir authentication değil, kullanıcı adı doğrulama seviyesidir.

**Gerekli düzeltme:** Gerçek OAuth App/GitHub App + PKCE authorization flow kullanılmalı. Fine-grained read-only repository permission varsayılan olmalı. PAT browser’da kalıcı tutulmamalı; mümkünse backend kısa ömürlü encrypted session üretmeli. Token localStorage’da kalmaya devam edecekse en azından bunun riskleri açıkça belirtilmeli, logout tüm kopyaları temizlemeli ve CSP/XSS koruması sıkılaştırılmalı. Scope checkbox’ları gerçek OAuth scope ile eşleştirilmeli; token type/expiry/revocation durumu izlenmeli.

## 4. P1 — GitHub remote scan tüm repo’yu taramıyor

Dashboard kodu progress mesajlarında repo filesystem tree ve “scan ALL files” izlenimi veriyor; ancak gerçek `filesToAudit` filtresi yalnızca `.env`, `config.js`, `config.ts`, `package.json` veya path’inde `credentials`/`secret` geçen dosyaları seçiyor.[11] `src/settings.ts`, `config.yaml`, `deploy.yml`, sıradan isimli bir `.py` dosyası veya farklı isimli bir kaynak dosyası bu remote scan’den kaçabilir. Buna rağmen `totalScanned` olarak tüm `repoFiles.length` gösteriliyor. Bu ölçüm, gerçekten taranan dosya sayısını olduğundan yüksek raporluyor.

Git tree API yanıtındaki `truncated` alanı kontrol edilmiyor. GitHub büyük ağaçlarda recursive tree sonucunu kısaltabilir; uygulama eksik tree’yi tam tarama yapılmış gibi işleyebilir. `src/lib/githubScanner.ts` içinde de aynı recursive tree yaklaşımı görülüyor.[13]

Remote scan dosya içeriklerini sırayla indiriyor. Her fetch için AbortController/timeout yok. Raw URL path’i ayrıca encode edilmiyor; `#`, `?`, özel karakter veya bazı Unicode path’lerinde yanlış içerik çağrılabilir. Public raw fetch başarısız olursa API fallback’i kullanılıyor; ancak büyük repo, rate limit, binary/large file ve API partial response durumları için belirgin bir “incomplete scan” state’i yok.

Commit tarafı da tam tarihçe taraması değil. İlk aşamada yalnızca son 10 commit çekiliyor; commit mesajları ayrı regex setiyle analiz ediliyor. Diff analizi kullanıcı bir commit açtığında yapılıyor. “Latest commits” veya “all repository” ifadesi, secret’ın eski commitlerde veya açılmamış commit’lerde tarandığı anlamına gelmiyor.

Ayrıca dashboard sonucu içinde `commitsCount` için 104 default değeri, `duration` için 4200 sabit değeri, `activeHooks: 1` değeri ve `commitHash` için `Math.random( )` kullanılıyor.[11] Bunlar gerçek repo ölçümü değil; analytics ve compliance ekranını güvenilmez kılıyor. `safeFix` de gerçek dosyaya patch uygulamıyor, yalnızca sabit bir öneri metni üretiyor.

**Gerekli düzeltme:** Tüm scannable dosyalar gerçekten taranmalı veya UI açıkça “heuristic candidate files only” demeli. Tree truncation durumunda pagination/alternative archive strategy uygulanmalı ve sonuç `incomplete` işaretlenmeli. Her network request timeout/cancel desteğine sahip olmalı. Gerçek commit count, gerçek duration, gerçek HEAD SHA ve gerçek hook durumu kullanılmalı. Eski history scan ile current tree scan ayrı sonuçlar olarak gösterilmeli.

## 5. P1 — Secret engine false negative ve detector tutarsızlığı

TypeScript engine’de bir regex eşleşmesi entropy eşiğinin altında kalırsa bulgu tamamen atılıyor.[4] Rust scanner’da da default entropy threshold 4.5 bits/symbol.[6] İzole fixture’da AWS Access Key ID, Stripe key, PostgreSQL bağlantı string’i ve GitHub token benzeri değerler default config ile tarandığında 0 leak döndü; entropy threshold 0.0 yapıldığında AWS, Stripe ve PostgreSQL bulguları ortaya çıktı. Bu, regex’in var olup sonucun entropy kapısında sessizce kaybolduğunu gösteriyor.

Entropy, kesin biçimli provider token’larında veto olarak değil confidence sinyali olarak kullanılmalı. Aksi halde yapısal olarak düşük entropy’li ama yine de geçerli credential’lar atlanır. Tersine, yalnızca entropy’ye dayanmak da normal hash, UUID, test fixture veya build artifact’lerini false positive yapabilir.

Detectors katmanlar arasında aynı değil. TypeScript engine geniş bir pattern listesine sahipken GitHub commit mesajı taramasında ayrı ve çok daha dar regex’ler kullanılıyor. GitHub commit regex’inde `sk_test_[51|0c]` ifadesindeki köşeli parantez bir character class’tır; “51 veya 0c prefix” anlamına gelmez, `5`, `1`, `|`, `0` veya `c` karakterlerinden yalnızca birini eşleştirir. Bu, pattern’in amaçlanan formatı doğru uygulamadığını gösteren somut bir örnektir.

README ve FAQ 200+ veya 40+ pattern ve “zero false positives” gibi iddialar yapıyor; ancak kodda gerçek provider coverage, fixture seti, precision/recall ölçümü veya benchmark raporu bulunmuyor. Private key, JWT, generic secret ve database URL pattern’leri de bağlama çok duyarlı. Test dosyası yokluğu nedeniyle her provider regex’inin kabul/red davranışı regression test ile korunmuyor.

**Gerekli düzeltme:** Ortak tek scanner library kullanılmalı; browser, Rust, GitHub commit ve CLI aynı rule manifestini paylaşmalı. Pattern’ler provider format fixture’larıyla test edilmeli. Entropy rule severity’yi düşüren confidence alanı olmalı, kesin pattern’i veto etmemeli. Finding başına `confidence`, `source`, `ruleVersion` ve `verificationStatus` tutulmalı. “Zero false positives” iddiası ölçüm olmadan kaldırılmalı.

## 6. P1 — Rust `--staged` flag’i çalışmıyor

Rust CLI hook sabit olarak `securify scan --staged` çağırıyor.[5] Ancak `main.rs` içinde staged seçeneği parse edilse de scanner tarafında `_` ile yok sayılıyor; `scan_path` verilen klasörün tamamını `WalkDir` ile geziyor.[6] İzole Git fixture’ında yalnızca temiz dosya staged, secret içeren dosya untracked iken `--staged` çalıştırıldı. Secret dosyası yine bulundu.

Bu, pre-commit korumasının iki yönde sorunlu olduğu anlamına gelir: Kullanıcı “sadece staged değişiklikleri kontrol et” beklerken untracked dosyalar taranır; ayrıca staged olmayan bir secret’ın sonucu commit’i gereksiz yere engelleyebilir. Daha önemlisi, dokümantasyon ve hook davranışı ile gerçek scanner davranışı birbirini tutmuyor.

**Gerekli düzeltme:** `git diff --cached --name-only --diff-filter=ACMR` ile staged dosya listesi çıkarılmalı ve yalnızca bu liste taranmalı. Rename/delete/submodule durumları açıkça ele alınmalı. Repo dışında `--staged` için anlamlı hata dönmeli. Clean staged + untracked secret, staged secret + clean untracked, deleted file ve rename fixture’ları test edilmelidir.

## 7. P1 — Rust config alanlarının bir bölümü boşa çıkıyor

`TomlConfig` içinde `scanners` bölümü ve AWS, Stripe, GitHub, GCP, Slack, Postgres, SSH gibi alt alanlar tanımlı olsa da `merge_config` yalnızca engine ve exclude alanlarını uyguluyor.[7] Kullanıcı `scanners.aws = false` yazsa bile bu ayarın scanner davranışını değiştirdiğine dair bir uygulama yok.

`engine.fail_on_severity` de config’e alınıyor, fakat scanner sonucunun exit code kararında kullanılmıyor. Bu, CI’da “high bulunduğunda fail et”, “critical dışında devam et” gibi beklenen politika ayarlarını etkisiz bırakır. `exclude.directories` ve `exclude.extensions` tanımlandığında default exclude listesini genişletmek yerine doğrudan değiştiriyor; kullanıcı yalnızca bir custom directory verdiğinde `node_modules`, `.git` veya `target` gibi default dışlamalar geri kaybolabilir.

**Gerekli düzeltme:** Config şeması uygulama koduyla aynı kaynaktan üretilmeli. Her alan için unit test bulunmalı. Scanner toggle’ları rule registry’ye bağlanmalı. `fail_on_severity` gerçek exit code politikasına bağlanmalı. Custom exclude değerleri default güvenli exclude’larla merge edilmeli; kullanıcı isterse `--no-default-excludes` gibi açık seçenek kullanmalı.

## 8. P1 — JavaScript CLI vaat edilen çıktıları üretmiyor

`src/cli/index.ts` CLIOptions içinde `json`, `sarif`, `markdown` ve `text` formatları tanımlı; help ekranı da SARIF/Markdown export vaat ediyor.[8] Fakat `outputResults` yalnızca `json` ve `text` dallarını gerçekten uyguluyor. `--format sarif` veya `--format markdown` verildiğinde beklenen çıktı yazılmıyor.

Exit code davranışı da formata bağlı olarak bozuk. Critical/high için `process.exit(1)` yalnızca text branch’inde çalışıyor. JSON formatında secret bulguları stdout’a yazılıp süreç 0 ile bitebilir; CI bunu başarılı tarama sanabilir. SARIF/Markdown branch’i olmadığı için bu formatlarda hem çıktı hem de policy enforcement yok.

CLI parseArgs bilinmeyen argümanları sessizce yok sayıyor, eksik option değerlerini doğrulamıyor ve format/severity değerlerini enum olarak kontrol etmiyor. `--format typo`, `--severity nonsense` veya değersiz `--output` için kullanıcıya erken ve anlaşılır hata verilmesi gerekir.

Directory ignore mantığı glob kütüphanesi yerine pattern’den `*` karakterini silip substring araması yapıyor.[8] Bu gerçek `.gitignore` semantiği değildir; `**`, anchored path, negation, directory-only pattern ve escaped character davranışları bozulabilir. `--exclude "*.test.js"` örneği beklenmedik dosyaları dahil edebilir veya hariç bırakabilir.

**Gerekli düzeltme:** SARIF 2.1.0 ve Markdown writer gerçek implementasyonla eklenmeli. Exit code kararları çıktı formatından bağımsız ortak policy fonksiyonunda yapılmalı. Argüman validation ve `--help` testleri eklenmeli. Ignore tarafında proven bir gitignore/glob parser kullanılmalı veya desteklenen pattern sözleşmesi açıkça sınırlandırılmalı.

## 9. P1 — Dependency auditor gerçek sürüm etkilenmesini garanti etmiyor

`src/lib/cveDatabase.ts` içindeki `isVersionAffected` fonksiyonu gerçek semver karşılaştırması yapmıyor; range boş değilse her sürümü affected kabul ediyor.[14] Dosyada açıkça bunun placeholder olduğu belirtilmiş. GitHub Advisory sorgusu bir pakete ait advisories döndürdüğünde, güvenlik aralığı mevcut sürümle eşleşmese bile sonuç vulnerable kabul edilebilir.

Manifest parser da gerçek çözülmüş sürümü değil, çoğu zaman `package.json` veya benzeri dosyadaki version range’in kaba biçimde kesilmiş halini kullanıyor. `^4.17.15`, `~4.17.15`, `>=4.17.15`, `workspace:*`, `file:`, `git:` ve `latest` gibi değerler aynı güvenilirlikte “version” değildir. `cleanVersion` sayısal olmayan aralıkları `0.0.0` olarak döndürebiliyor. package-lock, yarn.lock veya pnpm-lock üzerinden gerçek installed/transitive sürüm ağacı çözülmüyor.

`DependencyTree` arayüzünde direct, transitive ve devDependencies alanları tanımlı olsa da parser’lar gerçek transitive tree üretmiyor. `package.json` parser’ı yalnızca dependencies ve devDependencies kayıtlarını okuyor. Bu nedenle “dependency scanner” doğrudan bağımlılık beyanı denetimi ile gerçek kurulu dependency audit’ini birbirine karıştırıyor.

OSV veya GitHub API hatalarında fonksiyon `[]` döndürüyor.[14] Bu fail-open davranışta internet kesintisi, rate limit veya API schema değişikliği “zero vulnerabilities” gibi görünebilir. CVE cache fonksiyonları IndexedDB tarafında tanımlı olsa da ana dependency query akışında kullanılmadığı doğrulandı; aynı paketler tekrar tekrar sorgulanıyor.

OSV kayıtlarında severity bazen string, bazen CVSS objeleri array’i olarak geliyor. Parser database-specific severity yoksa array’i string bekleyen `mapSeverity` fonksiyonuna verebilir ve query sonucu exception ile boş listeye düşebilir. Bu durum gerçek vulnerability sonucunu “no result” haline getirebilir.

**Gerekli düzeltme:** `semver` veya ecosystem’e uygun resmi version matcher kullanılmalı. Lockfile parser/resolver eklenmeli ve direct/transitive/dev ayrımı gerçek veriye dayanmalı. OSV primary source olarak seçilecekse GitHub Advisory ile duplicate merge politikası netleştirilmeli. API hata sonucu `unknown/error` olarak UI’a taşınmalı; empty vulnerability list anlamına gelmemeli. Cache gerçekten kullanılmalı ve TTL, source version, query error state tutulmalı.

## 10. P1 — CI workflow mevcut build çıktısıyla uyuşmuyor

`.github/workflows/securify-scan.yml`, build sonrasında `require('./dist/lib/scanEngine.js')` ve `require('glob')` bekliyor.[19] Mevcut `npm run build` ise Vite bundle’larını `dist/assets/` altında üretiyor; `dist/lib/scanEngine.js` oluşturmuyor. Root `node_modules` altında workflow’un beklediği `glob` bağımlılığı da manifestoda bulunmuyor.

Bu yüzden workflow’un gerçek scanner adımı temiz checkout’ta module-not-found veya missing artifact ile başarısız olması bekleniyor. Ayrıca adım `continue-on-error: true` olduğu için güvenlik taraması başarısız olsa bile workflow’un ilerlemesi mümkün. Sonraki SARIF upload adımı dosya gerçekten oluşmadan çalışırsa sonuç raporlanamaz.

**Gerekli düzeltme:** CI tek bir gerçek scanner seçmeli: Rust binary veya ayrı build edilmiş Node scanner. Vite browser bundle’ı Node require hedefi olarak kullanılmamalı. `glob` gerçekten gerekiyorsa manifestoya eklenmeli; daha iyisi scanner giriş noktası library/CLI olarak paketlenmeli. `continue-on-error` kaldırılmalı. SARIF dosyasının varlığı, schema doğrulaması ve critical/high policy’si pipeline’da test edilmeli.

## 11. P1 — Test ve kalite kapısı yok

Frontend için `npm run build` başarılı olsa da `npm run lint` ESLint 9 flat-config uyumsuzluğu nedeniyle çalışmıyor. `eslint.config.js` içinde `extends` kullanılmış; ESLint 9 flat config bunu bu biçimde kabul etmiyor. Root `package.json` içinde `test` script’i yok. Bu nedenle React state akışları, API contract’ları, parser’lar, scanner regex’leri, SSRF koruması ve export formatları otomatik regression test ile korunmuyor.

Rust tarafında beş unit test geçmesi olumlu; ancak staged davranışı, gerçek Git hook, config merge, threshold false negative, report JSON ve cross-platform hook senaryoları için yeterli fixture bulunmuyor. `cargo audit`/`cargo deny` gibi dependency policy araçları CI’da görünmüyor. Node dev dependency ağacında npm audit uyarıları bulunması da güncel tutulması gereken bir kalite işidir.

**Gerekli düzeltme:** `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` ve `cargo test` zorunlu CI gate olmalı. Vitest veya Jest ile frontend/unit test suite kurulmalı. Playwright/Cypress ile en az homepage → dashboard, local scan, auditor, GitHub error ve export akışları test edilmeli. Security regression fixture’ları repo içinde sentetik ve açıkça test-only secret’larla tutulmalı.

## 12. P1/P2 — Dashboard ölçümleri gerçek veriyi temsil etmiyor

GitHub scan sonucu içinde sabit/random alanlar kullanılıyor: `commitHash` gerçek HEAD SHA yerine `Math.random()` ile üretiliyor, `duration` sabit 4200, `activeHooks` 1, `commitsCount` ise Link header parse edilemezse 104 olarak başlıyor.[11] Kullanıcı bu değerleri enterprise analytics veya compliance raporu gibi okursa yanlış bilgi alır.

Progress döngüsü repo dosyalarını tarıyormuş gibi ilerliyor, fakat gerçek içerik scan’i dar `filesToAudit` kümesinde yapılıyor. Sonuçta “scanned files” sayısı ile gerçekten analiz edilen dosya sayısı farklı. Grade de yalnızca leak sayısına göre `A+`, `B`, `C`, `F` olarak hesaplanıyor; severity, confidence, file coverage, unverified files ve dependency exposure hesaba katılmıyor.

**Gerekli düzeltme:** Her metrik gerçek kaynaktan alınmalı. `scanned`, `candidate`, `skipped`, `failed`, `incomplete` sayıları ayrı gösterilmeli. Grade açıklanabilir bir policy modelinden üretilmeli; random veya sabit değerler yalnızca demo modunda ve “simulation” etiketiyle kullanılmalı.

## 13. P2 — Sandbox ve simulator ile gerçek ürün özelliği ayrılmamış

Homepage `SecurifySimulator` sabit `mockFiles` içeriğini local state üzerinde tarıyor. Commit işlemi gerçek Git repository’ye gitmiyor; UI içinde zamanlayıcıyla ilerliyor. Auto-fix gerçek kullanıcının dosyasını değiştirmiyor, editördeki demo metnini değiştirip tarayıcıdan statik `.env.example` indiriyor.[18]

Dashboard exploit simulation bölümü gerçek exploit veya penetration test çalıştırmıyor; sabit senaryo logları üretiyor. Bu yaklaşım demo için kabul edilebilir, fakat kullanıcıya gerçek saldırı doğrulaması yapılmış gibi sunulmamalı. “Active exfiltration simulation” gibi ifadeler güvenlik ürünü açısından gereksiz biçimde agresif ve yanlış anlaşılabilir.

Sandbox dependency SCA akışında küçük ve sabit bir `scaDb` tablosu bulunuyor; `runDependencyScan` `setTimeout` sonrası bu tabloyu kullanıyor, canlı OSV/GitHub Advisory sorgusu yapmıyor.[18] Sandbox’taki lodash, axios, express, jsonwebtoken ve benzeri sonuçlar demo verisi; auditor ekranındaki gerçek OSV akışıyla aynı şey değil. Kullanıcıya iki ekranın veri kaynağı açıkça ayrılmalı.

**Gerekli düzeltme:** Demo bileşenleri “interactive demo / simulated output” olarak etiketlenmeli. Gerçek local scan ve gerçek dependency audit tek bir shared engine kullanmalı. Auto-fix için gerçek dosya sistemi seçimi, preview diff, explicit confirmation, backup ve rollback gerekir; aksi halde özellik “downloadable remediation template” olarak adlandırılmalı.

## 14. P2 — Veri saklama ve gizlilik modeli eksik

`storage.ts` scan history kayıtlarının `results` alanını IndexedDB’ye yazıyor.[16] Dashboard sonuçlarında context lines, repo adı, path, line ve bulgu metadata’sı bulunuyor; bazı context satırları secret’ın çevresindeki kaynak kodunu da taşıyabilir. Bu veriler browser profilinde şifrelenmeden duruyor.

`clearOldScans` fonksiyonu mevcut olsa da bunun her başlangıçta veya düzenli aralıkta otomatik çağrıldığına dair kullanım bulunamadı. Retention varsayılanı bu nedenle belirsiz. Kullanıcı tarama geçmişini silse bile localStorage’daki GitHub PAT, webhook secret veya sayaçlar ayrı kalabilir.

`webhooks.ts` webhook URL’si ve secret’ı localStorage’da saklıyor.[17] Webhook POST’larında timeout, retry/backoff, delivery ID, replay protection, payload size limit veya ortak hata sözleşmesi yok. Kullanıcı kendi endpoint’ini girdiği için browser CORS kısıtları devreye girebilir; UI başarısız teslimi kalıcı bir delivery status olarak göstermiyor.

**Gerekli düzeltme:** Secret değerleri ve full context history varsayılan olarak tutulmamalı; redacted context seçeneği kullanılmalı. IndexedDB retention otomatik çalışmalı ve clear/export politikası açık olmalı. Local storage kullanımının XSS tehdit modeli dokümante edilmeli. Webhook secret’ları mümkünse backend secret store’da tutulmalı; delivery timeout, retry, idempotency key, replay window ve delivery log eklenmeli.

## 15. P2 — CORS, rate limit ve API sınırları yetersiz

`scan-site.ts` ve `verify-secret.ts` gibi endpoint’ler `Access-Control-Allow-Origin: *` ve `Access-Control-Allow-Credentials: true` yayıyor.[9] [10] Bu yapı güvenli bir origin allowlist yerine gereksiz geniş bir politika kullanıyor. Credential forwarding tarayıcı tarafından kısıtlanabilse de API’nin internetten çağrılabilirliği ve abuse yüzeyi devam ediyor.

Domain audit, secret verification, OSV proxy gibi işlemler için IP/user/session bazlı rate limit, concurrency limit ve provider quota yönetimi görünmüyor. Client-side localStorage sayaçları güvenlik sınırı değildir; kullanıcı storage’ı silebilir, farklı browser kullanabilir veya API’yi doğrudan çağırabilir.

**Gerekli düzeltme:** Uygulamanın gerçek origin’i allowlist’e alınmalı; credentials yalnızca ihtiyaç varsa açılmalı. Server-side rate limiting, request body/URL size limit, per-user quota, circuit breaker ve provider timeout’ları uygulanmalı. Abuse response’ları güvenlik bilgisi sızdırmadan standartlaştırılmalı.

## 16. P2 — Finding filtreleme sözleşmesi tamamlanmamış

`filterUtils.ts` içinde `FilterOptions` için `excludeIgnored` alanı tanımlı, ancak `filterFindings` bu alanı uygulamıyor.[15] IndexedDB’de `ignoreFinding`, `isIgnored` ve `getIgnoredFindings` fonksiyonları bulunmasına rağmen filtre ile entegre çağrı yolu görünmüyor. Kullanıcı bir bulguyu ignore ettiğinde sonraki filtreleme/raporlama ekranlarında bunun gerçekten dışarıda bırakılacağı garanti değil.

Aynı dosyada file pattern “glob-like” olarak regex’e çevriliyor ama regex metacharacter’ları escape edilmiyor. Kullanıcı `[` veya `(` gibi bir pattern girdiğinde `new RegExp()` exception fırlatabilir. Desteklenen glob semantiği yalnızca `*` ile sınırlı ve `?`, `**`, path separator, negation davranışları yok.

`searchWithRegex` geçersiz regex’te exception’ı yutup boş sonuç döndürüyor. Kullanıcıya “invalid pattern” denmediği için gerçek filtre hatası ile “sonuç bulunamadı” durumu karışıyor.

**Gerekli düzeltme:** Ignore state’i finding kimliği, rule version ve path normalization ile filtreye bağlanmalı. Glob parser güvenli hale getirilmeli veya kullanıcıya literal search ile regex search ayrımı sunulmalı. Geçersiz pattern açık hata olarak gösterilmeli.

## 17. P2 — Dependency parser kapsaması yüzeysel

`dependencyParser.ts` birçok ecosystem adı desteklese de parser’lar çoğunlukla regex ve satır tabanlıdır.[14] Cargo parser yalnızca `[dependencies]` bölümünün basit şekillerini ele alıyor; target-specific, build-dependencies, workspace dependencies, multiline table ve feature kaynaklı sürümler eksik kalabilir. Python requirements parser editable install, environment marker, extras, URL/VCS ve hash satırlarını doğru modellemiyor. Maven XML regex’i property substitution ve profile/multi-module yapısını güvenilir biçimde çözmüyor. Gemfile.lock parser yalnızca belirli indentation biçimine bağlı.

Bu nedenle “çoklu dil dependency parser” ifadesi temel manifest keşfi için doğru olsa da tam ecosystem resolution anlamına gelmiyor. Desteklenmeyen veya parse edilemeyen dosya sessizce boş liste döndürürse kullanıcı dependency audit yapılmadığını fark etmeyebilir.

**Gerekli düzeltme:** Her ecosystem için resmi parser/lockfile formatı kullanılmalı veya destek sınırları dokümante edilmeli. Parse error ile “0 dependency” ayrılmalı. Her parser için golden fixture, malformed input, range, workspace, transitive ve lockfile testleri eklenmeli.

## 18. P2 — Dokümantasyon, sürüm ve iddia tutarsızlıkları

Root package `0.0.0`, Rust crate `0.1.0`, TypeScript CLI help `1.0.0` gösteriyor; canlı site/dokümanlarda farklı bir ürün sürümü ve “2.4.0” benzeri release anlatımı bulunuyor.[3] README’de “40+ pattern”, FAQ’da “200+ curated regex” ve “zero false positives” iddiaları geçiyor; bunları destekleyen ölçüm, benchmark veya test raporu bulunmuyor.[3] [8]

README “kodlar hiçbir şekilde uzak sunucuya gönderilmez” cümlesini geniş biçimde kullanıyor; oysa local folder scan’in browser’da kalması, GitHub API’ye repo içeriklerinin gitmesi, OSV/GitHub Advisory sorguları ve aktif secret verification’ın provider’lara credential göndermesi farklı veri akışlarıdır. Bu akışlar veri sınıflandırması ve kullanıcı izniyle ayrılmalı.

Site üzerindeki “SOC 2 Type II compliant”, “GDPR verified”, “PCI-DSS compliant”, kullanıcı sayısı, puan ve finansal risk kartları için repo içinde bağımsız kanıt bulunamadı. Bunlar gerçek audit/certification yoksa demo metni veya illustrative estimate olarak açıkça etiketlenmeli. Security scanner’ın kendi raporu da sabit finansal zarar aralıklarını resmi hukuki/finansal görüş gibi sunmamalı.

**Gerekli düzeltme:** Tek canonical version source kullanılmalı. README, website, CLI help ve release metadata aynı capability matrisinden üretilmeli. “Zero-knowledge”, “zero false positives”, “200+ patterns”, “compliant/verified” gibi iddialar kanıtla sınırlandırılmalı. Privacy policy; local scan, GitHub sync, dependency API, secret verification, analytics, webhook ve browser storage veri akışlarını ayrı ayrı açıklamalı.

## 19. P2 — Kullanılabilirlik ve teslimat eksikleri

Canlı sitede homepage’den `example.com` ile domain audit başlatıldığında dashboard’a geçildi ve progress 1/9’dan 9/9’a ulaştı; website usage `1 / 3` arttı. Ancak dashboard local scanner tab’ında kaldı ve domain audit raporu görünmedi. Kaynakta initial URL effect’i `setScanTab('website')` yaparken guest initialization effect’i aynı mount sırasında `setScanTab('local')` yapıyor.[11] Bu bir state ordering bug’ıdır; işlem backend’de başarılı olsa bile kullanıcı sonuç göremez.

Pricing ekranı Free tier website audits için günlük 3 gösterirken dashboard veya başka UI parçalarında farklı limit metinleri bulunuyor. Limitler localStorage ile okunup yazılıyorsa kullanıcı veya browser bazlı sayaçlar birbiriyle karışabilir; server-side enforcement ödeme dışı olsa bile ürün planlarının doğruluğu için gereklidir.

Site görsel dili güçlü, fakat operasyonel durumlar yeterince ayrışmıyor: API error, timeout, partial scan, rate limit, truncated repo, unsupported manifest ve no findings aynı başarı/boş state’e yaklaşabiliyor. Security product arayüzünde “clean”, “not scanned”, “scan failed”, “unknown” ve “incomplete” kesinlikle farklı durumlar olmalı.

## 20. Uygulanması gereken sıra

| Aşama | İşler | Kabul kriteri |
| --- | --- | --- |
| 1 | SSRF rework, API rate limit, unknown verification, body parse | Private IP/redirect/rebinding testleri geçiyor; unknown active olmuyor; API abuse sınırlı |
| 2 | GitHub PAT/OAuth ve remote scan kapsamı | Gerçek least-privilege auth; token localStorage’da değil; tüm desteklenen dosyalar veya açık coverage raporu |
| 3 | Rust staged/config/exit policy | `--staged` yalnız staged dosyaları tarıyor; config toggle ve severity policy testli |
| 4 | Ortak scanner/rule manifesti ve entropy düzeltmesi | Browser/Rust/GitHub aynı fixture sonuçlarını veriyor; gerçek format false negative yok |
| 5 | Dependency resolver | Lockfile/transitive semver; API error unknown; cache aktif; parser fixture’ları mevcut |
| 6 | CLI/CI kalite kapısı | SARIF/Markdown gerçek; JSON critical/high exit 1; lint/test/CI temiz checkout’ta geçiyor |
| 7 | Dashboard ve demo ayrımı | Sabit/random metrik yok; demo özellikleri etiketli; domain sonucu doğru tab’da görünür |
| 8 | Privacy, retention, docs | Local storage tehdidi, provider data flow, retention ve capability matrisi belgeli |

## Son karar

Ödeme konusu bir kenara bırakıldığında da ana karar değişmiyor: **Securify iyi bir prototip, fakat henüz güvenilir bir güvenlik ürünü değil.** Rust CLI ve OSV auditor gibi gerçek çalışan parçalar korunmalı; ancak SSRF, token saklama, remote scan coverage, staged scan, entropy, semver, CLI output, CI ve test altyapısı düzeltilmeden kullanıcıya “repo temiz”, “tüm dosyalar tarandı” veya “compliance doğrulandı” mesajı verilmemeli.

En doğru ürün konumlandırması şu aşamada **local-first developer security preflight / secret scanner MVP** olur. Büyük kapsamlı compliance, active exploit veya kurumsal risk/finans kartları; ölçüm, gerçek provider coverage, güvenilir policy engine ve bağımsız kanıt oluşana kadar ikincil/demo olarak tutulmalı.

## References

[1]: [https://github.com/sandrotonal/anti_security](https://github.com/sandrotonal/anti_security) — anti_security GitHub repository[2]: [https://securify.gucluyumhe.dev/](https://securify.gucluyumhe.dev/) — canlı Securify web uygulaması[3]: [https://github.com/sandrotonal/anti_security/blob/main/README.md](https://github.com/sandrotonal/anti_security/blob/main/README.md) — README, mimari ve ürün iddiaları[4]: [https://github.com/sandrotonal/anti_security/blob/main/src/lib/scanEngine.ts](https://github.com/sandrotonal/anti_security/blob/main/src/lib/scanEngine.ts) — TypeScript secret patterns ve entropy engine’i[5]: [https://github.com/sandrotonal/anti_security/blob/main/cli/src/main.rs](https://github.com/sandrotonal/anti_security/blob/main/cli/src/main.rs) — Rust CLI giriş, flag ve komut akışı[6]: [https://github.com/sandrotonal/anti_security/blob/main/cli/src/scanner.rs](https://github.com/sandrotonal/anti_security/blob/main/cli/src/scanner.rs) — Rust scanner, staged davranışı ve entropy policy[7]: [https://github.com/sandrotonal/anti_security/blob/main/cli/src/config.rs](https://github.com/sandrotonal/anti_security/blob/main/cli/src/config.rs) — Rust TOML config merge mantığı[8]: [https://github.com/sandrotonal/anti_security/blob/main/src/cli/index.ts](https://github.com/sandrotonal/anti_security/blob/main/src/cli/index.ts) — TypeScript CLI seçenekleri, output ve exit code[9]: [https://github.com/sandrotonal/anti_security/blob/main/api/scan-site.ts](https://github.com/sandrotonal/anti_security/blob/main/api/scan-site.ts) — domain audit, SSRF ve response header analizi[10]: [https://github.com/sandrotonal/anti_security/blob/main/api/verify-secret.ts](https://github.com/sandrotonal/anti_security/blob/main/api/verify-secret.ts) — aktif secret verification endpoint’i[11]: [https://github.com/sandrotonal/anti_security/blob/main/src/components/SecurifyDashboard.tsx](https://github.com/sandrotonal/anti_security/blob/main/src/components/SecurifyDashboard.tsx) — GitHub scan, dashboard state ve site audit akışı[12]: [https://github.com/sandrotonal/anti_security/blob/main/src/components/GithubAuthModal.tsx](https://github.com/sandrotonal/anti_security/blob/main/src/components/GithubAuthModal.tsx) — GitHub PAT/manual auth modalı[13]: [https://github.com/sandrotonal/anti_security/blob/main/src/lib/githubScanner.ts](https://github.com/sandrotonal/anti_security/blob/main/src/lib/githubScanner.ts) — GitHub tree ve file scanner[14]: [https://github.com/sandrotonal/anti_security/blob/main/src/lib/cveDatabase.ts](https://github.com/sandrotonal/anti_security/blob/main/src/lib/cveDatabase.ts) — OSV/GitHub Advisory query ve semver placeholder’ı[15]: [https://github.com/sandrotonal/anti_security/blob/main/src/lib/filterUtils.ts](https://github.com/sandrotonal/anti_security/blob/main/src/lib/filterUtils.ts) — finding filtreleme ve ignore sözleşmesi[16]: [https://github.com/sandrotonal/anti_security/blob/main/src/lib/storage.ts](https://github.com/sandrotonal/anti_security/blob/main/src/lib/storage.ts) — IndexedDB scan history ve cache[17]: [https://github.com/sandrotonal/anti_security/blob/main/src/lib/webhooks.ts](https://github.com/sandrotonal/anti_security/blob/main/src/lib/webhooks.ts) — webhook manager ve dış entegrasyonlar[18]: [https://github.com/sandrotonal/anti_security/blob/main/src/components/SecurifySandbox.tsx](https://github.com/sandrotonal/anti_security/blob/main/src/components/SecurifySandbox.tsx) — sandbox demo ve statik SCA akışı[19]: [https://github.com/sandrotonal/anti_security/blob/main/.github/workflows/securify-scan.yml](https://github.com/sandrotonal/anti_security/blob/main/.github/workflows/securify-scan.yml) — GitHub Actions workflow’u[20]: [https://github.com/sandrotonal/anti_security/blob/main/src/App.tsx](https://github.com/sandrotonal/anti_security/blob/main/src/App.tsx) — GitHub user/token state ve dashboard routing[21]: [https://osv.dev/vulnerability/GHSA-29mw-wpgm-hmr9](https://osv.dev/vulnerability/GHSA-29mw-wpgm-hmr9) — OSV lodash advisory örneği