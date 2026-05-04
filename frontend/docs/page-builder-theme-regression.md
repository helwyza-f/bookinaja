# Page Builder Theme Regression

Dokumen ini dipakai untuk audit visual preset, variant, dan sinkronisasi preview vs live di landing page tenant.

## Preset Goals

| Preset | Light Mode Goal | Dark Mode Goal | Risiko Utama |
| --- | --- | --- | --- |
| `bookinaja-classic` | bersih, aman, jelas | netral, kontras stabil | terlalu generik atau datar |
| `boutique` | warm, premium, lembut | intimate, elegan | terlalu kusam atau terlalu coklat |
| `playful` | segar, ringan, ramah | fresh tapi tetap tenang | terlalu hijau atau terlalu ramai |
| `dark-pro` | tajam, modern, techy | deep, cinematic, high-contrast | light mode ikut gelap dan berat |

## Variant Matrix

| Section | Variant | Expected Visual Effect | Audit Status |
| --- | --- | --- | --- |
| Hero | `immersive` | hero dominan, background sinematik, headline besar | active |
| Hero | `split` | teks dan visual seimbang dua kolom | active |
| Hero | `compact` | hero lebih cepat dorong ke katalog | active |
| Highlights | `pills` | chips ringkas, ringan | active |
| Highlights | `grid` | kartu kecil, lebih informatif | active |
| Catalog | `cards` | visual-first, cocok untuk browsing | active |
| Catalog | `list` | lebih padat, fokus informasi | active |
| Gallery | `bento` | editorial, dramatis | active |
| Gallery | `grid` | rapi, utilitarian | active |
| Testimonials | `cards` | seimbang dan netral | active |
| Testimonials | `spotlight` | satu testimoni utama lebih menonjol | active |
| FAQ | `accordion` | ritme editorial, cocok untuk jawaban panjang | active |
| FAQ | `cards` | lebih ringkas, scan cepat | active |
| About | `split` | story + visual | active |
| About | `centered` | fokus copy | active |
| Contact | `panel` | block informasi terpusat | active |
| Contact | `split` | pemisahan detail bisnis dan CTA | active |
| Booking Form | `sticky_cta` | high-conversion CTA panel | active |
| Booking Form | `inline_cta` | CTA tipis, menyatu dengan flow | active |

## Manual Audit Checklist

1. Preview draft dan live preview harus memakai renderer yang sama.
2. `dark-pro` light mode tidak boleh ikut terasa gelap.
3. Banner hero harus selalu `cover` dan `center`, tidak letterbox.
4. Logo navbar harus `cover` dan tetap rapi di radius kecil.
5. Resource image dan gallery image tidak boleh stretch.
6. `boutique` tetap punya kontras yang cukup di dark mode.
7. `playful` tidak boleh terlalu neon di light mode.
8. `sticky_cta` harus terasa jauh lebih berat dari `inline_cta`.
9. `spotlight` testimonial harus terasa berbeda nyata dari `cards`.
10. `accordion` FAQ dan `cards` FAQ tidak boleh terlihat seperti duplicate layout.

## Highest-Risk Combinations

Audit visual pertama menunjukkan kombinasi di bawah paling rentan terlihat jelek bila ada regression:

| Preset | Variant Combo | Risk |
| --- | --- | --- |
| `dark-pro` | `hero: immersive` + `gallery: bento` | mudah terlalu berat di light mode |
| `boutique` | `catalog: list` + `faq: cards` | bisa terasa terlalu datar jika border lemah |
| `playful` | `highlights: pills` + `booking_form: inline_cta` | mudah terlalu ringan dan kehilangan struktur |
| `bookinaja-classic` | `hero: compact` + `contact: panel` | bisa terlalu generik tanpa aksen cukup kuat |

## Screenshot Regression Set

Simpan set screenshot ini setiap kali ada perubahan besar pada renderer:

| Filename | Scenario |
| --- | --- |
| `classic-light-desktop.png` | preset classic, light mode, desktop |
| `classic-dark-desktop.png` | preset classic, dark mode, desktop |
| `boutique-light-desktop.png` | preset boutique, light mode, desktop |
| `boutique-dark-desktop.png` | preset boutique, dark mode, desktop |
| `playful-light-desktop.png` | preset playful, light mode, desktop |
| `playful-dark-desktop.png` | preset playful, dark mode, desktop |
| `dark-pro-light-desktop.png` | preset dark-pro, light mode, desktop |
| `dark-pro-dark-desktop.png` | preset dark-pro, dark mode, desktop |
| `classic-mobile.png` | classic, mobile preview |
| `dark-pro-mobile.png` | dark-pro, mobile preview |

## Review Flow

1. Set preset.
2. Toggle light mode dan dark mode.
3. Capture hero, catalog, gallery, booking CTA, navbar, dan footer.
4. Repeat untuk kombinasi `Highest-Risk`.
5. Bandingkan preview draft dengan live preview sebelum publish.
