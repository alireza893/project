// This file is deliberately CommonJS (.cjs extension): only in that mode does
// Electron inject its APIs into the 'electron' module. The rest of the project is ESM.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs/promises')
const crypto = require('node:crypto')

const DEV_URL = process.env.VITE_DEV_SERVER_URL
const isMac = process.platform === 'darwin'

/** All data lives in the userData folder so installs and updates do not erase it */
const dataDir = () => app.getPath('userData')
const dbFile = () => path.join(dataDir(), 'database.json')
const logoFile = (ext) => path.join(dataDir(), `logo${ext}`)

const EMPTY_DB = {
  products: [],
  customers: [],
  invoices: [],
  settings: {
    companyName: 'شرکت پخش',
    phone: '',
    address: '',
    economicCode: '',
    logoPath: null,
    defaultMargin: 0.15,
    defaultVat: 0,
    currency: 'ریال',
  },
  meta: { version: 1, lastInvoiceSeq: 0 },
}

async function readDb() {
  try {
    const raw = await fs.readFile(dbFile(), 'utf-8')
    const parsed = JSON.parse(raw)
    // Merge with the default shape so fields added in an update are always present
    return {
      ...EMPTY_DB,
      ...parsed,
      settings: { ...EMPTY_DB.settings, ...(parsed.settings || {}) },
      meta: { ...EMPTY_DB.meta, ...(parsed.meta || {}) },
    }
  } catch (err) {
    if (err.code === 'ENOENT') return structuredClone(EMPTY_DB)
    throw err
  }
}

/** Atomic write: write to a temp file first, then rename, so no half-written file appears */
async function writeDb(db) {
  const tmp = dbFile() + '.tmp'
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), 'utf-8')
  await fs.rename(tmp, dbFile())
  return true
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    // These options only make sense on macOS. On Windows, titleBarStyle would
    // leave the window with no close button at all, so they are applied conditionally.
    ...(isMac
      ? {
          titleBarStyle: 'hiddenInset',
          vibrancy: 'under-window',
          visualEffectState: 'active',
          backgroundColor: '#00000000',
          trafficLightPosition: { x: 18, y: 22 },
        }
      : {
          backgroundColor: '#f2f3f6',
        }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  // Open external links in the system browser rather than inside the app
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (DEV_URL) {
    win.loadURL(DEV_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
  return win
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

/* ---------------- IPC ---------------- */

/* ---------- Login ----------
   The username and password are kept as SHA-256 hashes, not plain text.
   This is a local lock against accidental access; since the app is offline
   and single-user, server-side validation would not mean anything here. */
const sha = (s) => crypto.createHash('sha256').update(String(s), 'utf8').digest('hex')

const CREDENTIALS = {
  user: sha('admin'),
  pass: sha('alireza4130'),
}

/** Constant-time comparison to avoid leaking information through timing */
function safeEqual(a, b) {
  const ba = Buffer.from(a, 'utf8')
  const bb = Buffer.from(b, 'utf8')
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
}

ipcMain.handle('auth:login', (_e, username, password) =>
  safeEqual(sha(username), CREDENTIALS.user) && safeEqual(sha(password), CREDENTIALS.pass)
)

ipcMain.handle('db:read', () => readDb())
ipcMain.handle('db:write', (_e, db) => writeDb(db))

/** Pick an Excel file and return its raw content for parsing in the renderer */
ipcMain.handle('dialog:openExcel', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'انتخاب فایل اکسل محصولات',
    properties: ['openFile'],
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls', 'csv'] }],
  })
  if (canceled || !filePaths[0]) return null
  const buf = await fs.readFile(filePaths[0])
  return { name: path.basename(filePaths[0]), data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) }
})

/** Pick a logo and copy it into userData so the app does not depend on the original path */
ipcMain.handle('dialog:openLogo', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'انتخاب لوگوی شرکت',
    properties: ['openFile'],
    filters: [{ name: 'تصویر', extensions: ['png', 'jpg', 'jpeg', 'svg', 'webp'] }],
  })
  if (canceled || !filePaths[0]) return null
  const src = filePaths[0]
  const ext = path.extname(src).toLowerCase()
  const dest = logoFile(ext)
  await fs.copyFile(src, dest)
  const buf = await fs.readFile(dest)
  const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
  return { path: dest, dataUrl: `data:${mime};base64,${buf.toString('base64')}` }
})

/** Read the stored logo while the app is starting up */
ipcMain.handle('logo:load', async (_e, p) => {
  if (!p) return null
  try {
    const buf = await fs.readFile(p)
    const ext = path.extname(p).toLowerCase()
    const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
})

/** Export the invoice to PDF by printing the current page */
ipcMain.handle('invoice:exportPdf', async (e, suggestedName) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'ذخیره پیش‌فاکتور',
    defaultPath: `${suggestedName || 'invoice'}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return null
  const pdf = await win.webContents.printToPDF({
    printBackground: true,
    pageSize: 'A4',
    margins: { marginType: 'none' },
  })
  await fs.writeFile(filePath, pdf)
  return filePath
})

ipcMain.handle('shell:showItem', (_e, p) => {
  if (p) shell.showItemInFolder(p)
})

/** Export all data to a JSON backup file */
ipcMain.handle('backup:export', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender)
  const stamp = new Date().toISOString().slice(0, 10)
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'خروجی کلی اطلاعات',
    defaultPath: `backup-pishfaktor-${stamp}.json`,
    filters: [{ name: 'فایل پشتیبان', extensions: ['json'] }],
  })
  if (canceled || !filePath) return null
  const db = await readDb()
  // The logo is stored inside the backup file itself so the backup is self-contained
  let logoData = null
  if (db.settings?.logoPath) {
    try {
      const buf = await fs.readFile(db.settings.logoPath)
      logoData = { ext: path.extname(db.settings.logoPath), base64: buf.toString('base64') }
    } catch { /* Logo not found; continue without it */ }
  }
  const payload = { ...db, _backup: { at: Date.now(), app: 'pishfaktor', version: 1 }, _logo: logoData }
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8')
  return filePath
})

/** Import data from a backup file */
ipcMain.handle('backup:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'ورود اطلاعات از فایل پشتیبان',
    properties: ['openFile'],
    filters: [{ name: 'فایل پشتیبان', extensions: ['json'] }],
  })
  if (canceled || !filePaths[0]) return null
  const raw = await fs.readFile(filePaths[0], 'utf-8')
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('فایل معتبر نیست')
  }
  if (!Array.isArray(data.products) || !Array.isArray(data.invoices)) {
    throw new Error('ساختار فایل پشتیبان درست نیست')
  }
  // Restore the logo if the backup carries one
  if (data._logo?.base64) {
    const dest = logoFile(data._logo.ext || '.png')
    await fs.writeFile(dest, Buffer.from(data._logo.base64, 'base64'))
    data.settings = { ...(data.settings || {}), logoPath: dest }
  }
  delete data._backup
  delete data._logo
  const merged = {
    ...EMPTY_DB,
    ...data,
    settings: { ...EMPTY_DB.settings, ...(data.settings || {}) },
    meta: { ...EMPTY_DB.meta, ...(data.meta || {}) },
  }
  await writeDb(merged)
  return { file: path.basename(filePaths[0]), db: merged }
})
