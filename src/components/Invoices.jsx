import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Plus, Trash2, Eye, Printer } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fmt, invoiceTotals } from '../lib/utils'
import { Button, Card, Empty, Badge, SearchBox, Modal, spring } from './ui'
import InvoicePrint from './InvoicePrint'

export default function Invoices({ onNew, onEdit }) {
  const invoices = useStore((s) => s.invoices)
  const settings = useStore((s) => s.settings)
  const { removeInvoice } = useStore()
  const [query, setQuery] = useState('')
  const [viewing, setViewing] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return invoices
    return invoices.filter((i) => i.number.includes(q) || i.customerName?.includes(q) || i.date?.includes(q))
  }, [invoices, query])

  const grand = useMemo(
    () => invoices.reduce((s, i) => s + (i.totals?.total ?? invoiceTotals(i.items, i).total), 0),
    [invoices]
  )

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchBox value={query} onChange={setQuery} placeholder="جستجوی شماره، مشتری یا تاریخ…" className="min-w-[240px] flex-1" />
        <Badge tone="brand"><FileText size={16} /> {fmt(invoices.length)} پیش‌فاکتور</Badge>
        <Badge tone="mint">جمع کل: {fmt(Math.round(grand))}</Badge>
        <Button variant="primary" onClick={onNew}><Plus size={16} /> پیش‌فاکتور جدید</Button>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {filtered.length === 0 ? (
          <Empty
            icon={FileText}
            title={invoices.length ? 'موردی پیدا نشد' : 'هنوز پیش‌فاکتوری ثبت نشده'}
            desc="پیش‌فاکتورهای ذخیره‌شده اینجا نگهداری می‌شوند و همیشه قابل مشاهده و چاپ مجدد هستند."
            action={!invoices.length && <Button variant="primary" onClick={onNew} className="mt-2"><Plus size={16} /> صدور اولین پیش‌فاکتور</Button>}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-right text-[13px]">
              <thead className="sticky top-0 z-10 bg-[rgb(var(--field)/0.55)] backdrop-blur-2xl">
                <tr className="border-b border-[rgb(var(--stroke)/var(--stroke-a))] text-[13px] text-[var(--text-dim)]">
                  <th className="px-3 py-3 font-medium">شماره</th>
                  <th className="px-3 py-3 font-medium">تاریخ</th>
                  <th className="px-3 py-3 font-medium">مشتری</th>
                  <th className="px-3 py-3 font-medium">اقلام</th>
                  <th className="px-3 py-3 font-medium">تعداد کل</th>
                  <th className="px-3 py-3 font-medium">مبلغ نهایی</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((inv) => {
                    const t = inv.totals ?? invoiceTotals(inv.items, inv)
                    return (
                      <motion.tr
                        key={inv.id}
                        layout
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.18 }}
                        className="group cursor-pointer border-b border-[rgb(var(--stroke)/calc(var(--stroke-a)*0.6))] hover:bg-[rgb(var(--field)/0.45)]"
                        onClick={() => onEdit(inv)}
                      >
                        <td className="fa-num px-3 py-2.5 font-bold">{inv.number}</td>
                        <td className="fa-num px-3 py-2.5 text-[var(--text-dim)]">{inv.date}</td>
                        <td className="px-3 py-2.5">{inv.customerName || '—'}</td>
                        <td className="fa-num px-3 py-2.5 text-[var(--text-dim)]">{fmt(inv.items?.length || 0)}</td>
                        <td className="fa-num px-3 py-2.5">{fmt(t.count)}</td>
                        <td className="fa-num px-3 py-2.5 font-bold text-brand-600">{fmt(Math.round(t.total))}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                            <Button variant="ghost" size="sm" className="!px-2" onClick={(e) => { e.stopPropagation(); setViewing(inv) }}><Eye size={16} /></Button>
                            <Button variant="ghost" size="sm" className="!px-2 text-rose-500" onClick={(e) => { e.stopPropagation(); removeInvoice(inv.id) }}><Trash2 size={16} /></Button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Print preview */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing ? `پیش‌فاکتور ${viewing.number}` : ''} wide>
        {viewing && (
          <>
            <div className="origin-top scale-[0.72] overflow-hidden rounded-xl border border-[rgb(var(--stroke)/var(--stroke-a))]" style={{ height: 560 }}>
              <InvoicePrint inv={viewing} totals={viewing.totals ?? invoiceTotals(viewing.items, viewing)} settings={settings} />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="subtle" onClick={() => window.print()}><Printer size={15} /> چاپ</Button>
              <Button variant="primary" onClick={() => { onEdit(viewing); setViewing(null) }}>ویرایش</Button>
            </div>
          </>
        )}
      </Modal>

      {/* Print version of the selected invoice */}
      {viewing && (
        <div className="hidden print:block">
          <InvoicePrint inv={viewing} totals={viewing.totals ?? invoiceTotals(viewing.items, viewing)} settings={settings} />
        </div>
      )}
    </div>
  )
}
