import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Package, Users, FileText, Settings as SettingsIcon, ArrowRight, LogOut, ChevronUp } from 'lucide-react'
import { useStore } from './store/useStore'
import Scene3D from './components/Scene3D'
import Dashboard from './components/Dashboard'
import Products from './components/Products'
import Customers from './components/Customers'
import Invoices from './components/Invoices'
import InvoiceEditor from './components/InvoiceEditor'
import Settings from './components/Settings'
import Login from './components/Login'
import { Toast, Button, spring } from './components/ui'

const USER_NAME = 'علیرضا طائریان'

/** Generic avatar: a head-and-shoulders silhouette, tinted to the app accent. */
function Avatar({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0" aria-hidden="true">
      <circle cx="20" cy="20" r="20" className="fill-brand-500/15" />
      <circle cx="20" cy="15.5" r="6" className="fill-brand-600" />
      <path d="M8.5 33a11.5 11.5 0 0 1 23 0z" className="fill-brand-600" />
    </svg>
  )
}

/** Sidebar profile with a menu holding the only action there is: sign out. */
function Profile({ username, version, onLogout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on an outside click or Escape, the way a native menu behaves.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative mt-auto" ref={ref}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className="glass absolute bottom-full right-0 left-0 mb-2 overflow-hidden rounded-xl p-1 shadow-lg"
          >
            <button
              onClick={() => { setOpen(false); onLogout() }}
              className="no-drag flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-right text-[13px] text-rose-500 transition hover:bg-rose-500/10"
            >
              <LogOut size={15} />
              <span>خروج</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        className="no-drag flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-right transition hover:bg-black/5"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold leading-tight">{USER_NAME}</p>
          <p className="truncate text-[10px] text-[var(--text-dim)]" dir="ltr">
            {username || '—'}
          </p>
        </div>
        <ChevronUp
          size={14}
          className={`shrink-0 text-[var(--text-dim)] transition-transform ${open ? '' : 'rotate-180'}`}
        />
      </button>

      <p className="px-2 pb-1 text-[10px] text-[var(--text-dim)]" dir="ltr">
        {version ? `v${version}` : ''}
      </p>
    </div>
  )
}

const NAV = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'products', label: 'محصولات', icon: Package },
  { id: 'customers', label: 'مشتریان', icon: Users },
  { id: 'invoices', label: 'پیش‌فاکتورها', icon: FileText },
  { id: 'settings', label: 'تنظیمات', icon: SettingsIcon },
]

export default function App() {
  const { ready, init, toast, settings, logoDataUrl } = useStore()
  const [authed, setAuthed] = useState(false)
  const [tab, setTab] = useState('dashboard')
  const [editingInvoice, setEditingInvoice] = useState(null)
  const [appVersion, setAppVersion] = useState('')
  const [username, setUsername] = useState('')

  useEffect(() => { init() }, [])

  // Read once at startup; both come from the main process, not the bundle, so
  // the version always reflects the installed build.
  useEffect(() => {
    window.api?.appVersion?.().then(setAppVersion).catch(() => {})
    window.api?.username?.().then(setUsername).catch(() => {})
  }, [])

  const go = (target) => {
    if (target === 'new-invoice') { setEditingInvoice({ fresh: true }); setTab('invoices') }
    else setTab(target)
  }

  const openEditor = (inv) => setEditingInvoice(inv)
  const closeEditor = () => setEditingInvoice(null)

  if (!authed) {
    return (
      <div className="h-full" dir="rtl">
        <Login onSuccess={() => setAuthed(true)} />
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center">
        <Scene3D />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-3xl px-10 py-8 text-center"
        >
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-brand-500/25 border-t-brand-500" />
          <p className="text-[13px] text-[var(--text-dim)]">در حال بارگذاری…</p>
        </motion.div>
      </div>
    )
  }

  const inEditor = !!editingInvoice
  const current = NAV.find((n) => n.id === tab)

  return (
    <div className="flex h-full" dir="rtl">
      <Scene3D />

      {/* Sidebar, with a drop shadow on the right side of the screen */}
      <aside className="sidebar-shadow no-print glass m-3 flex w-[210px] shrink-0 flex-col rounded-[var(--radius-macxl)] p-3">
        {/* Space for the window buttons is only needed on macOS. Windows has its
            own separate title bar, which makes this gap unnecessary there. */}
        <div className={window.api?.platform === 'darwin' ? 'drag h-8' : 'drag h-2'} />

        <div className="mb-4 flex items-center gap-2.5 px-2">
          {logoDataUrl
            ? <img src={logoDataUrl} alt="" className="h-9 w-9 rounded-xl object-contain" />
            : <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-[13px] font-black text-brand-600">پ</div>}
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight">{settings.companyName}</p>
            <p className="text-[11px] text-[var(--text-dim)]">سامانه پیش‌فاکتور</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = tab === n.id && !inEditor
            return (
              <button
                key={n.id}
                onClick={() => { setEditingInvoice(null); setTab(n.id) }}
                className="no-drag relative flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-[13px] transition"
              >
                {active && (
                  <motion.div
                    layoutId="nav-active"
                    transition={spring}
                    className="nav-active-pill absolute inset-0 rounded-xl"
                  />
                )}
                <n.icon size={16} className={`relative z-10 ${active ? 'text-brand-600' : 'text-[var(--text-dim)]'}`} />
                <span className={`relative z-10 ${active ? 'font-bold' : 'text-[var(--text-dim)]'}`}>{n.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Pinned to the bottom: who is signed in, the version that is
            running, and the one action available here. */}
        <Profile username={username} version={appVersion} onLogout={() => setAuthed(false)} />

      </aside>

      {/* Content */}
      <main className="flex min-w-0 flex-1 flex-col p-3 pr-0">
        <header className="drag no-print mb-3 flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2">
            {inEditor && (
              <Button variant="ghost" size="sm" onClick={closeEditor} className="!px-2">
                <ArrowRight size={16} />
              </Button>
            )}
            <h1 className="text-[17px] font-black">
              {inEditor ? (editingInvoice.fresh ? 'پیش‌فاکتور جدید' : `ویرایش ${editingInvoice.number}`) : current?.label}
            </h1>
          </div>
        </header>

        <div className="min-h-0 flex-1 pl-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={inEditor ? 'editor' : tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {inEditor ? (
                <InvoiceEditor
                  initial={editingInvoice.fresh ? null : editingInvoice}
                  onDone={() => { setEditingInvoice(null); setTab('invoices') }}
                />
              ) : tab === 'dashboard' ? <Dashboard go={go} />
                : tab === 'products' ? <Products />
                : tab === 'customers' ? <Customers />
                : tab === 'invoices' ? <Invoices onNew={() => setEditingInvoice({ fresh: true })} onEdit={openEditor} />
                : <Settings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Toast toast={toast} />
    </div>
  )
}
