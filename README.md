<p align="center">
  <img src="https://img.shields.io/badge/Electron-43-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite"/>
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind"/>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/Platform-macOS%20|%20Windows-lightgrey?style=for-the-badge" alt="Platform"/>
  <img src="https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge" alt="Version"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
</p>

<p align="center">
  <img src="./build/icon.png" width="200" alt="PishFaktor Logo"/>
</p>

<h1 align="center">🧾 PishFaktor</h1>
<h3 align="center">A Desktop Proforma Invoicing System</h3>

<p align="center">
  <em>Manage products, customers, and proforma invoices entirely offline — powered by Electron and React.</em>
</p>

---

## 👤 Author

**Alireza Mosavi** — Solo Developer

> PishFaktor was designed and implemented to give small distributors a fast, fully
> offline invoicing tool that speaks their language — Persian, right-to-left, with
> Jalali dates and Persian numerals throughout.

---

## 📖 About

**PishFaktor** is a self-contained desktop application for issuing proforma invoices,
built on **Electron** with a **React** interface. Every screen is Persian and
right-to-left, using Jalali dates and Persian numerals.

It is not a thin wrapper around a web page; it is a complete business tool with a
local database, Excel import and export, PDF generation, and full backup support.

- A polished, animated interface (React, Tailwind, Framer Motion, Three.js).
- Automatic selling-price calculation from purchase price and profit margin.
- Excel import that detects column headers in two different sheet layouts.
- Atomic local JSON storage that survives crashes and power loss.
- Clean separation between the Electron main process and the renderer.

No servers, no accounts, no internet connection — a pure native desktop experience
for **macOS and Windows**.

---

## ✨ Features at a Glance

| Feature | Description |
|---------|-------------|
| 📊 **Dashboard** | Overall statistics, total sales, and best-selling products at a glance |
| 📦 **Products** | Manual entry plus Excel import, with automatic selling-price calculation |
| 👥 **Customers** | Customer book with full purchase history, broken down per product |
| 🧾 **Invoices** | Create, save, edit, print, and export to both PDF and Excel |
| 💾 **Offline First** | All data lives on your machine in a local JSON database — nothing is uploaded |
| 🛡️ **Local Sign-In** | SHA-256 hashed credentials with constant-time comparison |
| 🔄 **Backup & Restore** | One-file export and import, with the company logo embedded inside |

---

## 🧰 Tech Stack

| Component | Technology |
|-----------|-----------|
| Desktop Shell | Electron 43 (`contextIsolation` enabled, no `nodeIntegration`) |
| UI Framework | React 19 + Tailwind CSS 4 |
| Build Tool | Vite 8 |
| Animation | Framer Motion + Three.js (`@react-three/fiber`) |
| State | Zustand with debounced autosave |
| Spreadsheets | SheetJS (`xlsx`) |
| Packaging | electron-builder (DMG + NSIS) |

---

## 📂 Project Structure

```
Calculation-System/
├── .github/workflows/
│   └── build.yml             # CI: builds the macOS and Windows installers
├── build/                    # Packaging resources
│   └── icon.png              # Application icon
├── electron/                 # Electron main process
│   ├── main.cjs              # Window, IPC handlers, database I/O
│   └── preload.cjs           # Secure context bridge
├── src/                      # React renderer
│   ├── components/           # Screens and shared UI
│   ├── lib/                  # Excel parsing, number and date helpers
│   ├── store/                # Zustand store
│   ├── styles/               # Global styles and fonts
│   ├── assets/fonts/         # Vazirmatn (OFL)
│   └── main.jsx              # Renderer entry point
├── index.html                # Vite entry point
├── vite.config.js            # Vite configuration
├── BUILD.md                  # Build and installation guide
└── package.json              # Dependencies and electron-builder config
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js 22+** installed

### Setup Environment
```bash
# Clone the repository, then install dependencies
npm install
```

> **Note:** if you see an `Electron failed to install correctly` error, the Electron
> binary was not downloaded. Run `node node_modules/electron/install.js` once — it
> pulls about 100 MB from `github.com` and needs unrestricted internet access.

### Run in Development
```bash
npm run dev
```
*Starts Vite and Electron together with hot reloading.*

### Run the Production Build
```bash
npm start
```

### Build the Installers
```bash
npm run dist:mac     # macOS   → release/PishFaktor-1.0.0.dmg
npm run dist:win     # Windows → release/PishFaktor-Setup-1.0.0.exe
```
*Each platform can only build its own installer locally. To produce both at once,
use the GitHub Actions workflow described in [BUILD.md](BUILD.md).*

---

## 💾 Data Storage

Everything is stored locally and works with no internet connection:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/pishfaktor/` |
| Windows | `%APPDATA%\pishfaktor\` |

Writes are atomic — a temporary file followed by a rename — so a crash or power
loss can never leave a half-written database behind.

---

## 🔤 Font

IRANYekan is a commercial font and may not be redistributed with software, so
**Vazirmatn** (free OFL license) is bundled instead; its letterforms are very close.

If you hold an IRANYekan license, place the `woff2` files in `src/assets/fonts/`
and update the `@font-face` blocks in `src/styles/index.css`. `IRANYekanX` and
`IRANYekan` are already in the font stack, so a system-installed copy is picked up
automatically.

---

## 📄 License

MIT License.

---

<p align="center">
  <em>Built with ⚡, Electron, and React.</em>
</p>
