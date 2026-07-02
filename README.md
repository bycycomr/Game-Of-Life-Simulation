# 🧬 Game of Life — Kendi Kendine Çalışan Hücresel Otomat

> **Canlı Demo:** [bycycomr.github.io/Game-Of-Life-Simulation](https://bycycomr.github.io/Game-Of-Life-Simulation/)

John Conway'in efsanevi **Game of Life** (Yaşam Oyunu) hücresel otomatının, tarayıcıda **kendi kendine çalışan**, sıfır bağımlılıklı bir web uygulaması olarak gerçeklenmesi. Saf JavaScript + HTML5 Canvas — framework yok, derleme adımı yok, paket yöneticisi yok. `index.html` dosyasını açman yeterli.

```text
                 ·  ■  ·
                 ·  ·  ■        ← planör (glider)
                 ■  ■  ■
```

---

## 🎯 Neden Bu Proje?

Game of Life, "basit kurallardan karmaşıklık nasıl doğar?" sorusunun en zarif cevabıdır. Sadece **dört kural** ile; hareket eden uzay gemileri, sonsuza dek planör üreten silahlar, kendi kendini kopyalayan yapılar ortaya çıkar. Hatta sistem **Turing-tam**dır — teoride her hesaplanabilir problem Game of Life içinde çözülebilir.

Bu depo üç amaçla yapıldı:

1. **Emergence (belirme) kavramını görselleştirmek** — merkezi bir plan olmadan, yalnızca yerel kurallarla küresel düzenin oluşumunu canlı izlemek.
2. **Sıfır bağımlılık disiplini** — modern web'de framework'süz, saf `Canvas 2D` ile performanslı bir simülasyonun nasıl yazılacağını göstermek. Tek bir `npm install` bile yok.
3. **"Kendi kendine çalışma"** — çoğu Game of Life demosu bir süre sonra durağanlaşıp ölür. Bu sürüm evrenin durağanlaştığını **kendisi algılar** ve otomatik olarak yeniden tohumlar; sekmeyi açık bıraktığında sonsuza dek yaşamaya devam eder. 🔁

---

## 📜 Oyunun Kuralları (B3/S23)

Evren, her hücresi **canlı** ya da **ölü** olan iki boyutlu bir ızgaradır. Her nesilde tüm hücreler, 8 komşusuna bakarak **aynı anda** güncellenir:

| # | Durum | Komşu Sayısı | Sonuç | Metafor |
|---|-------|-------------|-------|---------|
| 1 | Canlı | 0–1 | 💀 Ölür | Yalnızlık |
| 2 | Canlı | 2–3 | ✅ Yaşar | Denge |
| 3 | Canlı | 4+ | 💀 Ölür | Aşırı nüfus |
| 4 | Ölü | tam 3 | 🐣 Doğar | Üreme |

Kural adı **B3/S23**: *Birth* (doğum) 3 komşuyla, *Survival* (hayatta kalma) 2 veya 3 komşuyla. Hepsi bu. Oyuncu yok, rastgelelik yok (başlangıç hariç) — sadece deterministik evrim.

---

## ⚙️ Nasıl Çalışıyor? (Mimari)

Kod, birbirinden temiz ayrılmış üç katmandan oluşur:

```text
┌─────────────────────────────────────────────────────┐
│  main.js  — Uygulama Katmanı                        │
│  rAF döngüsü · kontroller · çizim etkileşimi ·      │
│  döngü algılama + otomatik yeniden tohumlama        │
├──────────────────────────┬──────────────────────────┤
│  engine.js               │  renderer.js             │
│  Saf simülasyon çekirdeği│  Canvas 2D çizim katmanı │
│  (DOM'a hiç dokunmaz)    │  (çağ-tabanlı renkler)   │
├──────────────────────────┴──────────────────────────┤
│  patterns.js — Klasik desen kütüphanesi             │
└─────────────────────────────────────────────────────┘
```

### 1. Motor — [`js/engine.js`](js/engine.js)

- Izgara, `Uint8Array` **typed array** olarak tutulur: `0 = ölü`, `1–255 = canlı` (değer hücrenin **yaşı**dır). Typed array'ler hem bellekte kompakt hem de JIT dostudur; ~35.000 hücrelik bir ızgara 60 FPS'de rahatça güncellenir.
- **Çift tampon (double buffering):** yeni nesil ayrı bir tampona yazılır, sonra tamponlar takas edilir — kopyalama maliyeti yok ve tüm hücreler "aynı anda" güncellenmiş olur (kuralların gerektirdiği gibi).
- **Sarmal kenarlar (torus):** varsayılan olarak ızgaranın sağı soluna, altı üstüne bağlanır; planörler kenardan çıkıp öbür taraftan girer. İstenirse kapatılıp "ölü duvar" moduna geçilebilir.
- `hash()` metodu, tahta durumunun **FNV-1a** özetini üretir — durağanlık algılamanın temelidir (aşağıda).

### 2. Çizim — [`js/renderer.js`](js/renderer.js)

- `devicePixelRatio` hesaba katılır; yüksek DPI ekranlarda hücreler kristal netliğinde çizilir.
- **Çağ-tabanlı "kor" paleti:** yeni doğan hücre parlak beyaz-pembe yanar, yaşadıkça kırmızının koyu tonlarına oturur. Böylece hangi bölgelerin *aktif kaos*, hangilerinin *yerleşik yapı* olduğu tek bakışta görülür.
- Hücreler renklerine göre kovalanıp (`bucket`) toplu çizilir — `fillStyle` değişimi kare başına yalnızca ~6 kez yapılır.

### 3. Uygulama — [`js/main.js`](js/main.js)

- `requestAnimationFrame` tabanlı döngü; **akümülatör deseni** ile çizim hızı (FPS) simülasyon hızından (nesil/sn) bağımsızdır. Hız kaydırıcısı 1–60 n/s arası ayarlanabilir.
- Fare/dokunmatik ile tuvale çizim: hızlı sürüklemelerde boşluk kalmaması için ardışık örnekler arası **Bresenham doğrusu** ile doldurulur.

### 🔁 "Kendi Kendine Çalışma" Nasıl Sağlanıyor?

Rastgele bir başlangıç ("çorba") tipik olarak birkaç bin nesil sonra ya tamamen ölür ya da yalnızca sabit bloklar + osilatörlerden oluşan durağan bir duruma çöker. Simülasyonun sonsuza dek ilginç kalması için:

1. Her nesilde tahtanın **FNV-1a özeti** hesaplanır ve son **60 özet** halka tamponda saklanır.
2. Güncel özet geçmişte varsa, tahta **periyodu ≤ 60 olan bir döngüye** girmiş demektir (sabit yapılar = periyot 1, çoğu osilatör = periyot 2–15). Hareket eden desenler özeti sürekli değiştirdiği için yanlış alarm vermez.
3. Bu tekrar **12 nesil üst üste** doğrulanırsa evren "durağan" ilan edilir, durum çipi `SIM: RESEEDING…` olur ve kısa bir bekleme sonrası tahta yeni bir rastgele çorba ile tohumlanır.
4. Popülasyon sıfıra düşerse (ör. *Diehard* deseni 130. nesilde tamamen yok olur) yeniden tohumlama daha da hızlı tetiklenir.

Bu davranış **OTO-YENİDEN BAŞLAT** anahtarıyla kapatılabilir.

---

## ✨ Özellikler

- ▶️ **Otomatik başlar** — sayfa açıldığı anda rastgele bir evren doğar.
- 🔁 **Durağanlık algılama + otomatik yeniden tohumlama** (kapatılabilir).
- 🖱️ **Canlı çizim** — simülasyon çalışırken bile tuvale hücre ekle/sil.
- 🧩 **8 klasik desen**: Planör, LWSS, Pulsar, Pentadecathlon, Gosper Planör Topu, R-Pentomino, Meşe Palamudu, Diehard.
- 🎛️ Hız (1–60 nesil/sn) ve tohum yoğunluğu (%5–40) kontrolü.
- 🌐 **Sarmal kenarlar** (torus topolojisi) — açılıp kapatılabilir.
- 🔥 **Çağ-tabanlı renklendirme** — genç hücreler parlak, yaşlılar közleşmiş.
- 📊 Canlı HUD: nesil sayacı, popülasyon, ölçülen hız, ızgara boyutu.
- ⌨️ Klavye kısayolları, 📱 duyarlı tasarım, ♿ `prefers-reduced-motion` desteği.
- 📦 **Sıfır bağımlılık** — yalnızca HTML + CSS + JS; internetsiz bile çalışır (fontlar hariç).

## ⌨️ Klavye Kısayolları

| Tuş | İşlev |
|-----|-------|
| `Space` | Başlat / Duraklat |
| `S` | Tek nesil ilerlet |
| `R` | Rastgele yeniden tohumla |
| `C` | Tuvali temizle |

---

## 🚀 Çalıştırma

**Seçenek 1 — Canlı demo:** [bycycomr.github.io/Game-Of-Life-Simulation](https://bycycomr.github.io/Game-Of-Life-Simulation/)

**Seçenek 2 — Dosyayı aç:** Depoyu klonla, `index.html`'e çift tıkla. Hepsi bu — derleme yok, sunucu gerekmez.

```bash
git clone https://github.com/bycycomr/Game-Of-Life-Simulation.git
cd Game-Of-Life-Simulation
start index.html        # Windows (macOS: open, Linux: xdg-open)
```

**Seçenek 3 — Yerel sunucu** (istersen):

```bash
python -m http.server 8000
# → http://localhost:8000
```

## 📁 Proje Yapısı

```text
Game-Of-Life-Simulation/
├── index.html          # Tek sayfa uygulama — giriş noktası
├── css/
│   └── style.css       # Koyu/crimson cyberpunk arayüz teması
├── js/
│   ├── engine.js       # Simülasyon çekirdeği (saf mantık, DOM'suz)
│   ├── renderer.js     # Canvas 2D çizim katmanı
│   ├── patterns.js     # Klasik desen kütüphanesi
│   └── main.js         # Uygulama: döngü, kontroller, oto-tohumlama
├── README.md
├── LICENSE             # MIT
└── .gitignore
```

## 🧩 Desen Kütüphanesi

| Desen | Tür | Not |
|-------|-----|-----|
| Planör (Glider) | Uzay gemisi | Çapraz süzülen en küçük gemi; periyot 4 |
| Hafif Uzay Gemisi (LWSS) | Uzay gemisi | Yatay ilerler; periyot 4 |
| Pulsar | Osilatör | En bilinen büyük osilatör; periyot 3 |
| Pentadecathlon | Osilatör | Periyot 15 |
| Gosper Planör Topu | Silah | Sonsuza dek planör üretir (1970) — nüfusun sınırsız büyüyebileceğinin ilk kanıtı |
| R-Pentomino | Metuşelah | 5 hücre → 1103 nesil kaos |
| Meşe Palamudu (Acorn) | Metuşelah | 7 hücre → 5206 nesil büyüme |
| Diehard | Metuşelah | Tam 130 nesil yaşar, sonra tamamen yok olur |

## 📚 Daha Fazlası

- [LifeWiki](https://conwaylife.com/wiki/) — Game of Life ansiklopedisi
- [Conway'in Kuralları — orijinal makale (Scientific American, 1970)](https://web.stanford.edu/class/sts145/Library/life.pdf)
- John Conway (1937–2020) anısına. *"Life must be interesting."*

## 📄 Lisans

[MIT](LICENSE) © 2026 Ömer Doğan — [`<Ömer Doğan/>`](https://github.com/bycycomr)
