import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, User, Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react'
import { Button } from './ui'

/**
 * Login screen with an animated grid background.
 * Note: this is a local lock against accidental access, not a server-side
 * security system.
 */
export default function Login({ onSuccess }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const userRef = useRef(null)

  useEffect(() => { userRef.current?.focus() }, [])

  const submit = async (e) => {
    e?.preventDefault()
    setError('')
    setBusy(true)
    // Short delay to make repeated guessing harder
    await new Promise((r) => setTimeout(r, 320))
    const ok = await window.api?.login(username.trim(), password)
    setBusy(false)
    if (ok) onSuccess()
    else {
      setError('نام کاربری یا رمز عبور نادرست است')
      setPassword('')
    }
  }

  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden">
      <GridBackdrop />

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="glass-strong relative z-10 w-[400px] rounded-macxl p-8"
      >
        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 20 }}
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ background: 'linear-gradient(140deg, #2c3444, #10141d)' }}
        >
          <Lock size={26} className="text-white" />
        </motion.div>

        <h1 className="text-center text-[19px] font-black">سامانه پیش‌فاکتور</h1>
        <p className="mt-1 mb-6 text-center text-[12.5px] text-[var(--text-dim)]">
          برای ادامه وارد حساب کاربری شوید
        </p>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-[var(--text-dim)]">نام کاربری</span>
          <div className="relative">
            <User size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              ref={userRef}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              dir="ltr"
              className="field-surface w-full rounded-xl py-2.5 pr-10 pl-3.5 text-right text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-400/20"
              placeholder="admin"
            />
          </div>
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-[var(--text-dim)]">رمز عبور</span>
          <div className="relative">
            <Lock size={16} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              dir="ltr"
              className="field-surface w-full rounded-xl py-2.5 pr-10 pl-10 text-right text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-400/20"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-[var(--text-dim)] transition hover:bg-black/5"
              aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'}
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        {error && (
          <motion.p
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
            transition={{ duration: 0.4 }}
            className="mb-3 flex items-center gap-2 rounded-xl bg-rose-500/12 px-3.5 py-2.5 text-[12.5px] text-rose-500"
          >
            <ShieldAlert size={15} className="shrink-0" />
            {error}
          </motion.p>
        )}

        <Button type="submit" variant="primary" size="lg" disabled={busy} className="w-full">
          {busy
            ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            : <><LogIn size={17} /> ورود</>}
        </Button>
      </motion.form>
    </div>
  )
}

/**
 * Login background: a black-and-white technical grid.
 * Deliberately colorless, matching the app's formal theme.
 */
function GridBackdrop() {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(165deg, #fafbfc, #eceef2 52%, #e2e4e9)' }}
    >
      {/* Perspective horizon grid */}
      <motion.div
        className="absolute inset-x-[-60%] bottom-[-34%] top-[46%]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(28,34,48,.30) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(28,34,48,.22) 1px, transparent 1px)',
          backgroundSize: '58px 58px',
          transform: 'perspective(560px) rotateX(70deg)',
          maskImage: 'linear-gradient(to bottom, transparent, #000 34%, transparent 92%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 34%, transparent 92%)',
        }}
        animate={{ backgroundPositionY: ['0px', '58px'] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'linear' }}
      />

      {/* Fine background grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(28,34,48,.09) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(28,34,48,.09) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at 50% 42%, #000 12%, transparent 76%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 42%, #000 12%, transparent 76%)',
        }}
      />

      {/* Coarser grid with stronger lines, for a technical-drawing feel */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(28,34,48,.16) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(28,34,48,.16) 1px, transparent 1px)',
          backgroundSize: '140px 140px',
          maskImage: 'radial-gradient(ellipse at 50% 42%, #000 20%, transparent 82%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 42%, #000 20%, transparent 82%)',
        }}
      />

      {/* Crosshair marks at the intersections */}
      {[
        { x: '18%', y: '22%' }, { x: '82%', y: '20%' },
        { x: '12%', y: '74%' }, { x: '88%', y: '70%' },
        { x: '50%', y: '14%' },
      ].map((c, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ left: c.x, top: c.y, width: 18, height: 18, marginLeft: -9, marginTop: -9 }}
          animate={{ opacity: [0.18, 0.45, 0.18] }}
          transition={{ duration: 3.4, repeat: Infinity, delay: i * 0.5, ease: 'easeInOut' }}
        >
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2" style={{ background: 'rgba(28,34,48,.5)' }} />
          <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2" style={{ background: 'rgba(28,34,48,.5)' }} />
        </motion.div>
      ))}

      {/* Horizontal scan line */}
      <motion.div
        className="absolute inset-x-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(28,34,48,.42), transparent)' }}
        animate={{ top: ['14%', '86%', '14%'] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Soft gray halo behind the card, for depth */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(255,255,255,.85), rgba(255,255,255,0) 66%)',
          filter: 'blur(24px)',
        }}
      />

      {/* Edge vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 42%, rgba(22,26,36,.14) 100%)' }}
      />
    </div>
  )
}
