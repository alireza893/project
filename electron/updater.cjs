// Auto-update support.
//
// Windows: the app downloads the new installer in the background and applies it
// when the user quits, so they never have to be handed a new .exe by hand.
//
// macOS: Squirrel.Mac refuses to install an update that is not code-signed, and
// this app is not signed. Rather than fail silently, the Mac build only checks a
// version file and tells the user where to download the new .dmg.
const { app, dialog, shell, net } = require('electron')
const path = require('node:path')

const isMac = process.platform === 'darwin'

/** Base URL of the update server. Configured in config.cjs. */
const UPDATE_HOST = require('./config.cjs').UPDATE_HOST.replace(/\/+$/, '')

/** Wait this long after launch before checking, so startup stays fast. */
const FIRST_CHECK_DELAY = 3_000
/** Then re-check periodically, for machines that stay open for days. */
const CHECK_INTERVAL = 6 * 60 * 60 * 1000

/* ------------------------------------------------------------------ *
 * Windows
 * ------------------------------------------------------------------ */

function setupWindows(win) {
  const { autoUpdater } = require('electron-updater')

  // Ask before downloading. The installer is over 100 MB and the update server
  // is slow, so downloading silently leaves the app busy for a long time with
  // nothing on screen to explain it.
  autoUpdater.autoDownload = false
  // Installing on quit is the least disruptive moment: no forced restart.
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: `${UPDATE_HOST}/updates/win`,
  })

  const send = (channel, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
  }

  const mb = (n) => (n ? `${Math.round(n / 1048576)} مگابایت` : '')

  autoUpdater.on('update-available', async (info) => {
    send('update:available', { version: info.version })

    const size = mb(info.files?.[0]?.size)
    const { response } = await dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['دانلود و نصب', 'بعداً'],
      defaultId: 0,
      cancelId: 1,
      title: 'نسخه جدید موجود است',
      message: `نسخه ${info.version} منتشر شده است.`,
      detail: size
        ? `حجم دانلود: ${size}\n\nدانلود در پس‌زمینه انجام می‌شود و می‌توانید به کار خود ادامه دهید. بسته به سرعت اینترنت ممکن است چند دقیقه طول بکشد.`
        : 'دانلود در پس‌زمینه انجام می‌شود و می‌توانید به کار خود ادامه دهید.',
    })
    if (response === 0) autoUpdater.downloadUpdate().catch(() => {})
  })

  autoUpdater.on('download-progress', (p) => send('update:progress', { percent: Math.round(p.percent) }))

  autoUpdater.on('update-downloaded', (info) => {
    send('update:ready', { version: info.version })
    dialog
      .showMessageBox(win, {
        type: 'info',
        buttons: ['راه‌اندازی مجدد و نصب', 'بعداً'],
        defaultId: 0,
        cancelId: 1,
        title: 'به‌روزرسانی آماده است',
        message: `نسخه ${info.version} دانلود شد.`,
        detail: 'برای اعمال به‌روزرسانی، برنامه باید یک بار بسته و باز شود. اگر «بعداً» را بزنید، به‌روزرسانی هنگام بستن برنامه به‌طور خودکار نصب می‌شود.',
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall()
      })
  })

  // A failed check must never block the app: log it and carry on.
  autoUpdater.on('error', (err) => {
    console.error('[updater]', err?.message || err)
  })

  const check = () => autoUpdater.checkForUpdates().catch(() => {})
  setTimeout(check, FIRST_CHECK_DELAY)
  setInterval(check, CHECK_INTERVAL)
}

/* ------------------------------------------------------------------ *
 * macOS - notify only
 * ------------------------------------------------------------------ */

/** Compare two "1.2.3" strings. Returns true when b is newer than a. */
function isNewer(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0
    const y = pb[i] || 0
    if (y > x) return true
    if (y < x) return false
  }
  return false
}

/** Fetch a URL as text using Electron's own net stack. */
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = net.request(url)
    req.on('response', (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        reject(new Error(`HTTP ${res.statusCode}`))
        res.resume()
        return
      }
      let body = ''
      res.on('data', (c) => { body += c })
      res.on('end', () => resolve(body))
    })
    req.on('error', reject)
    req.end()
  })
}

async function setupMac(win) {
  const check = async () => {
    try {
      // A tiny JSON file the workflow writes next to the .dmg:
      //   { "version": "1.1.0", "url": "http://host/updates/mac/PishFaktor-1.1.0.dmg" }
      const raw = await fetchText(`${UPDATE_HOST}/updates/mac/latest-mac.json`)
      const info = JSON.parse(raw)
      if (!info?.version || !isNewer(app.getVersion(), info.version)) return

      if (win && !win.isDestroyed()) {
        win.webContents.send('update:available', { version: info.version, manual: true })
      }

      const { response } = await dialog.showMessageBox(win, {
        type: 'info',
        buttons: ['دانلود', 'بعداً'],
        defaultId: 0,
        cancelId: 1,
        title: 'نسخه جدید موجود است',
        message: `نسخه ${info.version} منتشر شده است.`,
        detail: 'نسخه مک به‌صورت خودکار نصب نمی‌شود. با زدن «دانلود»، فایل نصب در مرورگر باز می‌شود.',
      })
      if (response === 0 && info.url) shell.openExternal(info.url)
    } catch (err) {
      console.error('[updater:mac]', err?.message || err)
    }
  }

  setTimeout(check, FIRST_CHECK_DELAY)
  setInterval(check, CHECK_INTERVAL)
}

/* ------------------------------------------------------------------ */

/** Wire up updates for the current platform. Safe to call unconditionally. */
function initUpdater(win) {
  // In development there is no packaged app to replace, and the dev version
  // number is always ahead of what is published.
  if (!app.isPackaged) return
  if (!/^https?:\/\/.+/.test(UPDATE_HOST)) {
    console.warn('[updater] update host is not configured; updates are disabled')
    return
  }

  // Wait until the window is actually on screen. A modal dialog attached to a
  // window that has not been shown yet sits behind it, which is why an update
  // prompt could appear to arrive minutes late.
  const start = () => {
    try {
      if (isMac) setupMac(win)
      else setupWindows(win)
    } catch (err) {
      console.error('[updater] failed to start:', err?.message || err)
    }
  }

  if (!win || win.isDestroyed()) return
  if (win.isVisible()) start()
  else win.once('show', start)
}

module.exports = { initUpdater }
