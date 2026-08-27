import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Search, Save, Printer, FileDown, X, ShoppingCart } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fmt, parseNum, sellPrice, todayJalali, invoiceTotals, numToWords, uid, download } from '../lib/utils'
import { exportInvoice } from '../lib/excel'
import { Button, Card, Input, NumberInput, Select, Field, Empty, Badge, spring } from './ui'
import InvoicePrint from './InvoicePrint'

export default function InvoiceEditor({ initial, onDone }) {
  const products = useStore((s) => s.products)
  const customers = useStore((s) => s.customers)
  const settings = useStore((s) => s.settings)
  const { saveInvoice, nextInvoiceNumber, notify, addCustomer } = useStore()

  const [inv, setInv] = useState(() => initial || {
    id: null,
    number: nextInvoiceNumber(),
    date: todayJalali(),
    customerId: null,
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    items: [],
    discount: 0,
    discountType: 'amount',
    vat: settings.defaultVat * 100 || 0,
    validity: '۳ روز',
    payment: 'نقدی',
    note: '',
    status: 'draft',
  })

  const [picker, setPicker] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const printRef = useRef(null)

  const totals = useMemo(
    () => invoiceTotals(inv.items, { discount: inv.discount, discountType: inv.discountType, vat: inv.vat }),
    [inv.items, inv.discount, inv.discountType, inv.vat]
  )

  const patch = (p) => setInv((s) => ({ ...s, ...p }))

  const searchResults = useMemo(() => {
    const q = pickerQuery.trim()
    const list = q ? products.filter((p) => p.name.includes(q) || p.company?.includes(q)) : products
    return list.slice(0, 80)
  }, [products, pickerQuery])

  /* ---------- Line items ---------- */
  const addItem = (p) => {
    const exists = inv.items.find((it) => it.productId === p.id)
    if (exists) {
      patch({ items: inv.items.map((it) => (it.productId === p.id ? { ...it, qty: it.qty + 1 } : it)) })
    } else {
      patch({
        items: [...inv.items, {
          key: uid(),
          productId: p.id,
          name: p.name,
          company: p.company,
          unit: p.unit,
          qty: 1,
          unitPrice: Math.round(p.sellPriceOverride ?? sellPrice(p.buyPrice, p.margin)),
        }],
      })
    }
    notify(`${p.name} اضافه شد`)
  }

  /** Manual row, for an item that is not in the product catalog */
  const addBlankItem = () => patch({
    items: [...inv.items, { key: uid(), productId: null, name: '', company: '', unit: 'عدد', qty: 1, unitPrice: 0 }],
  })

  const updateItem = (key, p) => patch({ items: inv.items.map((it) => (it.key === key ? { ...it, ...p } : it)) })
  const removeItem = (key) => patch({ items: inv.items.filter((it) => it.key !== key) })

  /* ---------- Customer ---------- */
  const pickCustomer = (id) => {
    if (!id) return patch({ customerId: null, customerName: '', customerPhone: '', customerAddress: '' })
    const c = customers.find((x) => x.id === id)
    if (c) patch({ customerId: c.id, customerName: c.name, customerPhone: c.phone || '', customerAddress: [c.city, c.address].filter(Boolean).join('، ') })
  }

  /* ---------- Save and export ---------- */
  const doSave = () => {
    if (!inv.items.length) return notify('حداقل یک کالا اضافه کنید', 'error')
    if (!inv.customerName.trim()) return notify('نام مشتری را وارد کنید', 'error')

    // If a new customer was typed in, also add them to the customer book
    let customerId = inv.customerId
    if (!customerId && inv.customerName.trim()) {
      const created = addCustomer({ name: inv.customerName.trim(), phone: inv.customerPhone, address: inv.customerAddress })
      customerId = created.id
    }
    const saved = saveInvoice({ ...inv, customerId, status: 'saved', totals })
    notify(`پیش‌فاکتور ${saved.number} ذخیره شد`)
    onDone?.(saved)
  }

  const doPrint = () => window.print()

  const doExcel = () => {
    if (!inv.items.length) return notify('ابتدا کالا اضافه کنید', 'error')
    const buf = exportInvoice(inv, totals)
    download(`${inv.number}.xlsx`, new Blob([buf], { type: 'application/octet-stream' }))
    notify('فایل اکسل ساخته شد')
  }

  const doPdf = async () => {
    if (!inv.items.length) return notify('ابتدا کالا اضافه کنید', 'error')
    const saved = await window.api?.exportPdf(inv.number)
    if (saved) notify('PDF ذخیره شد')
  }

  return (
    <>
      {/* Print version, visible only while printing */}
      <div className="hidden print:block">
        <InvoicePrint inv={inv} totals={totals} settings={settings} ref={printRef} />
      </div>

      <div className="no-print flex h-full flex-col gap-4 xl:flex-row">
        {/* Right column: line items */}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Card className="p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="شماره پیش‌فاکتور">
                <Input value={inv.number} onChange={(e) => patch({ number: e.target.value })} className="fa-num" />
              </Field>
              <Field label="تاریخ">
                <Input value={inv.date} onChange={(e) => patch({ date: e.target.value })} className="fa-num" />
              </Field>
              <Field label="نحوه پرداخت">
                <Select value={inv.payment} onChange={(e) => patch({ payment: e.target.value })}>
                  {['نقدی', 'چک', 'اعتباری', 'کارت به کارت'].map((p) => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="اعتبار پیش‌فاکتور">
                <Input value={inv.validity} onChange={(e) => patch({ validity: e.target.value })} />
              </Field>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Field label="انتخاب مشتری">
                <Select value={inv.customerId || ''} onChange={(e) => pickCustomer(e.target.value)}>
                  <option value="">— مشتری جدید —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.shopName ? ` (${c.shopName})` : ''}</option>)}
                </Select>
              </Field>
              <Field label="نام مشتری">
                <Input value={inv.customerName} onChange={(e) => patch({ customerName: e.target.value, customerId: null })} />
              </Field>
              <Field label="تلفن">
                <Input dir="ltr" className="text-right" value={inv.customerPhone} onChange={(e) => patch({ customerPhone: e.target.value })} />
              </Field>
              <Field label="آدرس">
                <Input value={inv.customerAddress} onChange={(e) => patch({ customerAddress: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-[rgb(var(--stroke)/var(--stroke-a))] px-4 py-3">
              <h3 className="text-[14px] font-bold">اقلام پیش‌فاکتور</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="subtle" onClick={addBlankItem}><Plus size={16} /> ردیف دستی</Button>
                <Button size="sm" variant="primary" onClick={() => setPicker(true)}><Search size={16} /> انتخاب از محصولات</Button>
              </div>
            </div>

            {inv.items.length === 0 ? (
              <Empty
                icon={ShoppingCart}
                title="هنوز کالایی اضافه نشده"
                desc="از بانک محصولات انتخاب کنید یا یک ردیف دستی بسازید."
                action={<Button variant="primary" onClick={() => setPicker(true)} className="mt-2"><Search size={15} /> انتخاب کالا</Button>}
              />
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-right text-[13px]">
                  <thead className="sticky top-0 z-10 bg-[rgb(var(--field)/0.55)] backdrop-blur-2xl">
                    <tr className="border-b border-[rgb(var(--stroke)/var(--stroke-a))] text-[13px] text-[var(--text-dim)]">
                      <th className="px-2 py-2.5 font-medium">#</th>
                      <th className="px-2 py-2.5 font-medium">شرح کالا</th>
                      <th className="px-2 py-2.5 font-medium">واحد</th>
                      <th className="w-24 px-2 py-2.5 font-medium">تعداد</th>
                      <th className="w-36 px-2 py-2.5 font-medium">قیمت واحد</th>
                      <th className="px-2 py-2.5 font-medium">مبلغ کل</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {inv.items.map((it, i) => (
                        <motion.tr
                          key={it.key}
                          layout
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.16 }}
                          className="group border-b border-[rgb(var(--stroke)/calc(var(--stroke-a)*0.6))] hover:bg-[rgb(var(--field)/0.4)]"
                        >
                          <td className="fa-num px-2 py-1.5 text-[var(--text-dim)]">{fmt(i + 1)}</td>
                          <td className="px-2 py-1.5">
                            {it.productId ? (
                              <div>
                                <p className="font-medium">{it.name}</p>
                                {it.company && <p className="text-[11px] text-[var(--text-dim)]">{it.company}</p>}
                              </div>
                            ) : (
                              <Input value={it.name} onChange={(e) => updateItem(it.key, { name: e.target.value })} placeholder="شرح کالا" className="!py-1.5 !text-[12.5px]" />
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <Select value={it.unit} onChange={(e) => updateItem(it.key, { unit: e.target.value })} className="!py-1.5 !text-[12.5px]">
                              {['عدد', 'کارتن', 'بسته', 'کیسه', 'بطری', 'کیلوگرم', 'شانه'].map((u) => <option key={u}>{u}</option>)}
                            </Select>
                          </td>
                          <td className="px-2 py-1.5">
                            <NumberInput value={it.qty} onChange={(v) => updateItem(it.key, { qty: v === '' ? 0 : v })} className="!py-1.5 !text-[12.5px]" />
                          </td>
                          <td className="px-2 py-1.5">
                            <NumberInput value={it.unitPrice} onChange={(v) => updateItem(it.key, { unitPrice: v === '' ? 0 : v })} className="!py-1.5 !text-[12.5px]" />
                          </td>
                          <td className="fa-num px-2 py-1.5 font-bold text-brand-600">{fmt(parseNum(it.qty) * parseNum(it.unitPrice))}</td>
                          <td className="px-1">
                            <button onClick={() => removeItem(it.key)} className="rounded-lg p-1.5 text-rose-500 opacity-0 transition hover:bg-rose-500/10 group-hover:opacity-100">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Left column: totals */}
        <Card className="flex w-full shrink-0 flex-col gap-3 p-4 xl:w-80">
          <h3 className="text-[14px] font-bold">جمع‌بندی</h3>

          <Row label="جمع جزء" value={fmt(totals.subtotal)} />

          <div className="grid grid-cols-2 gap-2">
            <Field label="تخفیف">
              <NumberInput value={inv.discount} onChange={(v) => patch({ discount: v === '' ? 0 : v })} />
            </Field>
            <Field label="نوع">
              <Select value={inv.discountType} onChange={(e) => patch({ discountType: e.target.value })}>
                <option value="amount">مبلغ</option>
                <option value="percent">درصد</option>
              </Select>
            </Field>
          </div>
          <Row label="مبلغ تخفیف" value={fmt(totals.discountAmount)} tone="rose" />

          <Field label="مالیات بر ارزش افزوده (٪)">
            <NumberInput value={inv.vat} onChange={(v) => patch({ vat: v === '' ? 0 : v })} suffix="٪" />
          </Field>
          <Row label="مبلغ مالیات" value={fmt(totals.vatAmount)} />

          <div className="mt-1 rounded-xl bg-brand-500/12 px-4 py-3">
            <p className="text-[13px] text-[var(--text-dim)]">مبلغ نهایی</p>
            <p className="fa-num text-[22px] font-black text-brand-600">{fmt(Math.round(totals.total))}</p>
            <p className="text-[11px] text-[var(--text-dim)]">{settings.currency}</p>
          </div>

          {totals.total > 0 && (
            <p className="rounded-xl bg-[rgb(var(--field)/0.45)] px-3 py-2 text-[13px] leading-relaxed text-[var(--text-dim)]">
              به حروف: {numToWords(Math.round(totals.total))} {settings.currency}
            </p>
          )}

          <Field label="توضیحات">
            <Input value={inv.note} onChange={(e) => patch({ note: e.target.value })} placeholder="اختیاری" />
          </Field>

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <Button variant="primary" onClick={doSave}><Save size={15} /> ذخیره پیش‌فاکتور</Button>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="subtle" onClick={doPrint}><Printer size={16} /> چاپ</Button>
              <Button size="sm" variant="subtle" onClick={doPdf}><FileDown size={16} /> PDF</Button>
              <Button size="sm" variant="subtle" onClick={doExcel}><FileDown size={16} /> اکسل</Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Product picker */}
      <AnimatePresence>
        {picker && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="no-print fixed inset-0 z-50 flex items-start justify-center p-6 pt-20"
            onMouseDown={() => setPicker(false)}
          >
            <div className="absolute inset-0 bg-black/25 backdrop-blur-md" />
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={spring}
              onMouseDown={(e) => e.stopPropagation()}
              className="glass-strong relative flex max-h-[70vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-macxl)]"
            >
              <div className="flex items-center gap-2 border-b border-[rgb(var(--stroke)/var(--stroke-a))] p-3">
                <Search size={16} className="text-[var(--text-dim)]" />
                <input
                  autoFocus
                  value={pickerQuery}
                  onChange={(e) => setPickerQuery(e.target.value)}
                  placeholder="نام محصول یا شرکت…"
                  className="flex-1 bg-transparent text-[12.5px] outline-none"
                />
                <Button variant="ghost" size="sm" onClick={() => setPicker(false)} className="!px-2"><X size={15} /></Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {searchResults.length === 0 ? (
                  <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">محصولی پیدا نشد</p>
                ) : searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-right transition hover:bg-[rgb(var(--field)/0.6)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium">{p.name}</p>
                      <p className="text-[11px] text-[var(--text-dim)]">{p.company} · {p.unit}</p>
                    </div>
                    <span className="fa-num shrink-0 text-[13px] font-bold text-brand-600">
                      {fmt(p.sellPriceOverride ?? sellPrice(p.buyPrice, p.margin))}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Row({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-[var(--text-dim)]">{label}</span>
      <span className={`fa-num font-bold ${tone === 'rose' ? 'text-rose-500' : ''}`}>{value}</span>
    </div>
  )
}
