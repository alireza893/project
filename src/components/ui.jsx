import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { X, Check, AlertCircle, Search } from 'lucide-react'
import { toFa, toEn } from '../lib/utils'

export const spring = { type: 'spring', stiffness: 380, damping: 32 }

/* ---------- Button ---------- */
export function Button({ children, variant = 'default', size = 'md', className, ...props }) {
  const variants = {
    default: 'field-surface hover:brightness-110',
    primary:
      'border border-white/25 bg-gradient-to-br from-brand-400 to-brand-600 text-white ' +
      'shadow-lg shadow-brand-500/35 hover:brightness-110',
    ghost: 'border border-transparent bg-transparent hover:bg-[rgb(var(--field)/0.5)]',
    danger: 'border border-white/25 bg-gradient-to-br from-rose-500 to-rose-500/80 text-white shadow-lg shadow-rose-500/30',
    subtle: 'field-surface hover:brightness-110',
  }
  const sizes = { sm: 'px-3 py-1.5 text-[13px]', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      className={clsx(
        'no-drag inline-flex items-center justify-center gap-2 rounded-xl font-medium',
        'backdrop-blur-xl transition-all disabled:pointer-events-none disabled:opacity-40',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}

/* ---------- Glass card ----------
   Note: children are not wrapped in an extra element. When the card is a flex
   container (such as tables that need to scroll), an intermediate div breaks the
   height chain and overflow-auto stops working. */
export function Card({ children, className, delay = 0, glow, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay }}
      className={clsx('glass relative overflow-hidden rounded-macxl', className)}
      {...props}
    >
      {glow !== false && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-70"
          style={{ background: 'linear-gradient(135deg, rgb(20 24 34 / 0.05), transparent 45%, rgb(20 24 34 / 0.04))' }}
        />
      )}
      {children}
    </motion.div>
  )
}

/* ---------- Input ---------- */
export function Field({ label, hint, className, children }) {
  return (
    <label className={clsx('block', className)}>
      {label && <span className="mb-1.5 block text-[12.5px] font-medium text-(--text-dim)">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-(--text-dim)">{hint}</span>}
    </label>
  )
}

const fieldBase =
  'no-drag w-full rounded-xl field-surface px-3.5 py-2.5 text-sm outline-none backdrop-blur-xl ' +
  'transition placeholder:text-(--text-dim) placeholder:opacity-60 ' +
  'focus:border-brand-400 focus:ring-4 focus:ring-brand-400/20'

export function Input({ className, ...props }) {
  return <input className={clsx(fieldBase, className)} {...props} />
}

/** Numeric input that also accepts Persian digits and displays thousands separators */
export function NumberInput({ value, onChange, suffix, className, ...props }) {
  const display = value === '' || value === null || value === undefined
    ? ''
    : toFa(Number(value).toLocaleString('en-US'))
  return (
    <div className="relative">
      <input
        dir="ltr"
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          const raw = toEn(e.target.value).replace(/[^\d.]/g, '')
          onChange(raw === '' ? '' : Number(raw))
        }}
        className={clsx(fieldBase, 'fa-num text-right', className)}
        style={suffix ? { paddingLeft: '3rem' } : undefined}
        {...props}
      />
      {suffix && (
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[11px] text-(--text-dim)">
          {suffix}
        </span>
      )}
    </div>
  )
}

export function Select({ className, children, ...props }) {
  return (
    <select className={clsx(fieldBase, 'appearance-none', className)} {...props}>
      {children}
    </select>
  )
}

export function SearchBox({ value, onChange, placeholder = 'جستجو…', className }) {
  return (
    <div className={clsx('relative', className)}>
      {/* The icon sits above the input (z-10) and the input reserves enough room on
          the right. Padding is set directly so it does not clash with the base px. */}
      <Search
        size={15}
        className="pointer-events-none absolute right-3.5 top-1/2 z-10 -translate-y-1/2 text-(--text-dim)"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ paddingRight: '2.5rem' }}
      />
    </div>
  )
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, wide }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          onMouseDown={onClose}
        >
          <div
            className="absolute inset-0 backdrop-blur-md"
            style={{ background: 'rgb(var(--scrim) / var(--scrim-a))' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={spring}
            onMouseDown={(e) => e.stopPropagation()}
            className={clsx(
              'glass-strong relative max-h-[86vh] w-full overflow-hidden rounded-macxl',
              wide ? 'max-w-4xl' : 'max-w-lg'
            )}
          >
            <div className="flex items-center justify-between border-b border-[rgb(var(--stroke)/var(--stroke-a))] px-6 py-4">
              <h3 className="text-[15px] font-bold">{title}</h3>
              <Button variant="ghost" size="sm" onClick={onClose} className="px-2!"><X size={16} /></Button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Toast ---------- */
export function Toast({ toast }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 40, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={spring}
          className="glass-strong fixed bottom-7 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-medium"
        >
          {toast.kind === 'error'
            ? <AlertCircle size={16} className="text-rose-500" />
            : <Check size={16} className="text-mint-500" />}
          {toast.message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ---------- Empty state ---------- */
export function Empty({ icon: Icon, title, desc, action }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={spring}
      className="flex flex-col items-center justify-center gap-3 py-20 text-center"
    >
      {Icon && (
        <div className="glass mb-1 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Icon size={26} className="text-(--text-dim)" />
        </div>
      )}
      <p className="text-[15px] font-bold">{title}</p>
      {desc && <p className="max-w-sm text-[13px] leading-relaxed text-(--text-dim)">{desc}</p>}
      {action}
    </motion.div>
  )
}

export function Badge({ children, tone = 'default', className }) {
  const tones = {
    default: 'field-surface text-(--text-dim)',
    brand: 'border border-brand-500/35 bg-brand-500/15 text-brand-500',
    mint: 'border border-mint-500/35 bg-mint-500/15 text-mint-500',
    amber: 'border border-amber-500/35 bg-amber-500/15 text-amber-500',
    rose: 'border border-rose-500/35 bg-rose-500/15 text-rose-500',
  }
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium', tones[tone], className)}>
      {children}
    </span>
  )
}
