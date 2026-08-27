import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Package, Users, FileText, Settings as SettingsIcon, ArrowRight } from 'lucide-react'
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

  useEffect(() => { init() }, [])

  // Read once at startup; comes from the main process, not the bundle, so it
  // always reflects the installed build.
  useEffect(() => {
    window.api?.appVersion?.().then(setAppVersion).catch(() => {})
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

        {/* Pushed to the bottom: confirms at a glance which version is running,
            so an applied update is visible without opening anything. */}
        <p className="mt-auto px-3 pb-1 text-[11px] text-[var(--text-dim)]" dir="ltr">
          {appVersion ? `v${appVersion}` : ''}
        </p>

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
