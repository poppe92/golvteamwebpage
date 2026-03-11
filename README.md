# Golvteam i Valje AB — Website

Customer-facing website for **Golvteam i Valje AB**, a flooring company based in Sölvesborg, Sweden. The company has been operating since 1972 and specialises in laying plastic sheeting, laminate, hardwood floors, bathroom wet-room matting, tiles, and clinker.

Live site: [golvteam.se](https://golvteam.se)

---

## Pages

| File | URL | Description |
|------|-----|-------------|
| `index.html` | `/` | Landing page — company introduction and overview of services |
| `subpages/ourOffers.html` | `/subpages/ourOffers.html` | Detailed list of the company's offerings |
| `subpages/history.html` | `/subpages/history.html` | Company history |
| `subpages/previousWork.html` | `/subpages/previousWork.html` | Photo gallery of completed jobs |
| `subpages/contact.html` | `/subpages/contact.html` | Contact information |
| `404.html` | — | Custom 404 error page |

---

## Project structure

```
golvteamwebpage/
├── index.html              # Landing page
├── subpages/               # Inner pages
│   ├── ourOffers.html
│   ├── history.html
│   ├── previousWork.html
│   └── contact.html
├── styles/                 # Per-page CSS files + shared lightbox styles
│   ├── index.css
│   ├── ourOffers.css
│   ├── history.css
│   ├── previousWork.css
│   ├── contact.css
│   ├── lightbox.css        # Styles for the image lightbox
│   └── 404.css
├── scripts/
│   └── lightbox.js         # Vanilla JS image lightbox (no dependencies)
├── images/                 # Photo assets used across the site
├── icons/                  # Logo and UI icons
└── CNAME                   # GitHub Pages custom domain (golvteam.se)
```

---

## Tech stack

- Plain HTML, CSS, and a small amount of vanilla JavaScript — no frameworks, no build step.
- Hosted on **GitHub Pages** with the custom domain `golvteam.se` (configured via `CNAME`).
- Icons via [Font Awesome](https://fontawesome.com/) (loaded from CDN).

---

## Image lightbox

The gallery on the *Tidigare Arbeten* (previous work) page uses a custom lightweight lightbox written in vanilla JS (`scripts/lightbox.js`, ~6 KB unminified). It has no dependencies and replaced a previously bundled jQuery + Lightbox2 file.

**How to add an image to the gallery:**

```html
<a href="images/your-photo.jpg"
   data-lightbox="gallery-name"
   data-title="A short description of the photo">
  <img src="images/your-photo.jpg" alt="" />
</a>
```

- `data-lightbox` — groups images into a navigable gallery; all items sharing the same value become part of one gallery.
- `data-title` — optional caption shown above the image in the lightbox.
- Keyboard: **← →** to navigate, **Esc** to close.

---

## Development

No build tools are required. Open any `.html` file directly in a browser, or serve the root directory with any static file server, for example:

```bash
npx serve .
```
