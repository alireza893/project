import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Trash2, Pencil, Phone, MapPin, Receipt, Boxes, Wallet } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fmt, toFa } from '../lib/utils'
import { Button, Card, Input, Field, Modal, Empty, Badge, SearchBox, spring } from './ui'

const emptyDraft = () => ({ name: '', shopName: '', phone: '', city: '', address: '', note: '' })

export default function Customers() {
  const customers = useStore((s) => s.customers)
  const customerStats = useStore((s) => s.customerStats)
  const { addCustomer, updateCustomer, removeCustomer, notify } = useStore()

  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [detail, setDetail] = useState(null)

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return customers
    return customers.filter(
      (c) => c.name.includes(q) || c.shopName?.includes(q) || c.phone?.includes(q) || c.city?.includes(q)
    )
  }, [customers, query])

  const openNew = () => { setDraft(emptyDraft()); setEditing('new') }
  const openEdit = (c) => {
    setDraft({ name: c.name, shopName: c.shopName || '', phone: c.phone || '', city: c.city || '', address: c.address || '', note: c.note || '' })
    setEditing(c.id)
  }

  const save = () => {
    if (!draft.name.trim()) return notify('نام مشتری را وارد کنید', 'error')
    if (editing === 'new') { addCustomer(draft); notify('مشتری اضافه شد') }
    else { updateCustomer(editing, draft); notify('اطلاعات به‌روزرسانی شد') }
    setEditing(null)
  }

  const stats = detail ? customerStats(detail.id) : null

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchBox value={query} onChange={setQuery} placeholder="جستجوی نام، فروشگاه، تلفن یا شهر…" className="min-w-[240px] flex-1" />
        <Badge tone="brand"><Users size={16} /> {fmt(customers.length)} مشتری</Badge>
        <Button onClick={openNew} variant="primary"><Plus size={16} /> مشتری جدید</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="flex flex-1 items-center justify-center">
          <Empty
            icon={Users}
            title={customers.length ? 'مشتری‌ای پیدا نشد' : 'هنوز مشتری ثبت نشده'}
            desc="مشتریان را اینجا ثبت کنید تا هنگام صدور پیش‌فاکتور بتوانید آن‌ها را انتخاب کنید."
            action={!customers.length && <Button onClick={openNew} variant="primary" className="mt-2"><Plus size={16} /> افزودن مشتری</Button>}
          />
        </Card>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false}>
              {filtered.map((c, i) => {
                const st = customerStats(c.id)
                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ ...spring, delay: Math.min(i * 0.02, 0.2) }}
                    whileHover={{ y: -3 }}
                    onClick={() => setDetail(c)}
                    className="glass group cursor-pointer rounded-[var(--radius-macxl)] p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold">{c.name}</p>
                        {c.shopName && <p className="truncate text-[12.5px] text-[var(--text-dim)]">{c.shopName}</p>}
                      </div>
                      <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(c) }} className="!px-1.5"><Pencil size={15} /></Button>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeCustomer(c.id) }} className="!px-1.5 text-rose-500"><Trash2 size={15} /></Button>
                      </div>
                    </div>

                    <div className="mb-3 space-y-1 text-[12px] text-[var(--text-dim)]">
                      {c.phone && <p className="fa-num flex items-center gap-1.5"><Phone size={15} /> <bdi>{toFa(c.phone)}</bdi></p>}
                      {(c.city || c.address) && <p className="flex items-center gap-1.5 truncate"><MapPin size={15} /> {[c.city, c.address].filter(Boolean).join('، ')}</p>}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 border-t border-[rgb(var(--stroke)/var(--stroke-a))] pt-3">
                      <Stat icon={Receipt} label="فاکتور" value={fmt(st.invoiceCount)} />
                      <Stat icon={Boxes} label="واحد" value={fmt(st.units)} />
                      <Stat icon={Wallet} label="مبلغ" value={fmt(st.amount)} small />
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Add / edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'مشتری جدید' : 'ویرایش مشتری'}>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="نام مشتری"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
          <Field label="نام فروشگاه"><Input value={draft.shopName} onChange={(e) => setDraft({ ...draft, shopName: e.target.value })} /></Field>
          <Field label="تلفن"><Input dir="ltr" className="text-right" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} /></Field>
          <Field label="شهر"><Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></Field>
          <Field label="آدرس" className="col-span-2"><Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></Field>
          <Field label="یادداشت" className="col-span-2"><Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>انصراف</Button>
          <Button variant="primary" onClick={save}>ذخیره</Button>
        </div>
      </Modal>

      {/* Customer purchase history */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `کارنامه خرید ${detail.name}` : ''} wide>
        {detail && stats && (
          <>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <BigStat label="تعداد پیش‌فاکتور" value={fmt(stats.invoiceCount)} />
              <BigStat label="مجموع واحد فروخته‌شده" value={fmt(stats.units)} />
              <BigStat label="مبلغ کل (ریال)" value={fmt(stats.amount)} />
            </div>
            {stats.products.length === 0 ? (
              <Empty icon={Receipt} title="هنوز خریدی ثبت نشده" desc="پس از صدور اولین پیش‌فاکتور، ریز اقلام اینجا نمایش داده می‌شود." />
            ) : (
              <div className="max-h-80 overflow-auto rounded-xl border border-[rgb(var(--stroke)/var(--stroke-a))]">
                <table className="w-full text-right text-[12.5px]">
                  <thead className="sticky top-0 bg-[rgb(var(--field)/0.8)] backdrop-blur-xl">
                    <tr className="text-[13px] text-[var(--text-dim)]">
                      <th className="px-3 py-2 font-medium">کالا</th>
                      <th className="px-3 py-2 font-medium">واحد</th>
                      <th className="px-3 py-2 font-medium">تعداد کل</th>
                      <th className="px-3 py-2 font-medium">مبلغ کل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.products.map((p) => (
                      <tr key={p.name} className="border-t border-[rgb(var(--stroke)/var(--stroke-a))]">
                        <td className="px-3 py-1.5 font-medium">{p.name}</td>
                        <td className="px-3 py-1.5 text-[var(--text-dim)]">{p.unit}</td>
                        <td className="fa-num px-3 py-1.5">{fmt(p.qty)}</td>
                        <td className="fa-num px-3 py-1.5 text-brand-600">{fmt(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

function Stat({ icon: Icon, label, value, small }) {
  return (
    <div className="text-center">
      <Icon size={16} className="mx-auto mb-1 text-[var(--text-dim)]" />
      <p className={`fa-num font-bold ${small ? 'text-[13px]' : 'text-[13px]'}`}>{value}</p>
      <p className="text-[11px] text-[var(--text-dim)]">{label}</p>
    </div>
  )
}

function BigStat({ label, value }) {
  return (
    <div className="rounded-xl bg-brand-500/10 px-4 py-3 text-center">
      <p className="fa-num text-[17px] font-bold text-brand-600">{value}</p>
      <p className="mt-0.5 text-[13px] text-[var(--text-dim)]">{label}</p>
    </div>
  )
}
