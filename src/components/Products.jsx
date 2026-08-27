import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Upload, Plus, Trash2, Pencil, Download, FileSpreadsheet, Building2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { parseWorkbook, exportProducts } from '../lib/excel'
import { fmt, sellPrice, parseNum, download } from '../lib/utils'
import { Button, Card, Input, NumberInput, Select, Field, Modal, Empty, Badge, SearchBox, spring } from './ui'

const emptyDraft = () => ({
  name: '', company: '', unit: 'عدد',
  producePrice: '', buyPrice: '', margin: '', sellPriceOverride: '',
})

export default function Products() {
  const products = useStore((s) => s.products)
  const settings = useStore((s) => s.settings)
  const { addProduct, updateProduct, removeProduct, importProducts, notify } = useStore()

  const [query, setQuery] = useState('')
  const [company, setCompany] = useState('همه')
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState(emptyDraft())
  const [importOpen, setImportOpen] = useState(false)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const companies = useMemo(
    () => ['همه', ...Array.from(new Set(products.map((p) => p.company).filter(Boolean))).sort()],
    [products]
  )

  const filtered = useMemo(() => {
    const q = query.trim()
    return products.filter(
      (p) =>
        (company === 'همه' || p.company === company) &&
        (!q || p.name.includes(q) || p.company?.includes(q) || p.barcode?.includes(q))
    )
  }, [products, query, company])

  /* ---------- Excel import ---------- */
  const chooseFile = async () => {
    setBusy(true)
    try {
      const file = await window.api?.openExcel()
      if (!file) return
      const { products: found, sheets } = parseWorkbook(file.data, {
        defaultMargin: settings.defaultMargin,
        fallbackCompany: 'نامشخص',
      })
      if (!found.length) {
        notify('در این فایل محصولی پیدا نشد', 'error')
        return
      }
      setPreview({ file: file.name, found, sheets })
      setImportOpen(true)
    } catch (err) {
      notify(`خطا در خواندن فایل: ${err.message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const confirmImport = (mode) => {
    importProducts(preview.found, mode)
    notify(`${fmt(preview.found.length)} محصول وارد شد`)
    setImportOpen(false)
    setPreview(null)
  }

  const doExport = () => {
    if (!products.length) return notify('محصولی برای خروجی وجود ندارد', 'error')
    const buf = exportProducts(products)
    download('محصولات.xlsx', new Blob([buf], { type: 'application/octet-stream' }))
    notify('فایل اکسل ساخته شد')
  }

  /* ---------- Editing ---------- */
  const openNew = () => { setDraft(emptyDraft()); setEditing('new') }
  const openEdit = (p) => {
    setDraft({
      name: p.name, company: p.company, unit: p.unit,
      producePrice: p.producePrice || '', buyPrice: p.buyPrice || '',
      margin: p.margin != null ? p.margin * 100 : '',
      sellPriceOverride: p.sellPriceOverride ?? '',
    })
    setEditing(p.id)
  }

  const save = () => {
    if (!draft.name.trim()) return notify('نام محصول را وارد کنید', 'error')
    const payload = {
      name: draft.name.trim(),
      company: draft.company.trim() || 'نامشخص',
      unit: draft.unit || 'عدد',
      producePrice: parseNum(draft.producePrice),
      buyPrice: parseNum(draft.buyPrice),
      margin: parseNum(draft.margin) / 100,
      sellPriceOverride: draft.sellPriceOverride === '' ? null : parseNum(draft.sellPriceOverride),
    }
    if (editing === 'new') { addProduct(payload); notify('محصول اضافه شد') }
    else { updateProduct(editing, payload); notify('محصول به‌روزرسانی شد') }
    setEditing(null)
  }

  const draftSell = draft.sellPriceOverride !== ''
    ? parseNum(draft.sellPriceOverride)
    : sellPrice(draft.buyPrice, parseNum(draft.margin) / 100)

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchBox value={query} onChange={setQuery} placeholder="جستجوی محصول، شرکت یا بارکد…" className="min-w-[240px] flex-1" />
        <Select value={company} onChange={(e) => setCompany(e.target.value)} className="w-44">
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Button onClick={chooseFile} disabled={busy} variant="subtle">
          <Upload size={15} /> آپلود اکسل
        </Button>
        <Button onClick={doExport} variant="subtle"><Download size={15} /> خروجی</Button>
        <Button onClick={openNew} variant="primary"><Plus size={16} /> محصول جدید</Button>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-2">
        <Badge tone="brand"><Package size={16} /> {fmt(products.length)} محصول</Badge>
        <Badge tone="mint"><Building2 size={16} /> {fmt(companies.length - 1)} شرکت</Badge>
        {company !== 'همه' && <Badge tone="amber">{fmt(filtered.length)} در {company}</Badge>}
      </div>

      {/* Table */}
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {filtered.length === 0 ? (
          <Empty
            icon={FileSpreadsheet}
            title={products.length ? 'نتیجه‌ای پیدا نشد' : 'هنوز محصولی ثبت نشده'}
            desc={products.length ? 'عبارت جستجو یا فیلتر شرکت را تغییر دهید.' : 'می‌توانید فایل اکسل محصولات را آپلود کنید یا محصول را دستی اضافه کنید.'}
            action={!products.length && <Button onClick={chooseFile} variant="primary" className="mt-2"><Upload size={15} /> آپلود فایل اکسل</Button>}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-right text-[13px]">
              <thead className="sticky top-0 z-10 backdrop-blur-2xl">
                <tr className="border-b border-[rgb(var(--stroke)/var(--stroke-a))] bg-[rgb(var(--field)/0.5)] text-[12px] text-[var(--text-dim)]">
                  <th className="px-3 py-3 font-medium">#</th>
                  <th className="px-3 py-3 font-medium">نام محصول</th>
                  <th className="px-3 py-3 font-medium">شرکت</th>
                  <th className="px-3 py-3 font-medium">واحد</th>
                  <th className="px-3 py-3 font-medium">قیمت دریافتی</th>
                  <th className="px-3 py-3 font-medium">سود</th>
                  <th className="px-3 py-3 font-medium">قیمت فروش</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18 }}
                      className="group border-b border-[rgb(var(--stroke)/calc(var(--stroke-a)*0.6))] transition-colors hover:bg-[rgb(var(--field)/0.45)]"
                    >
                      <td className="fa-num px-3 py-2.5 text-[var(--text-dim)]">{fmt(i + 1)}</td>
                      <td className="px-3 py-2.5 font-medium">{p.name}</td>
                      <td className="px-3 py-2.5"><Badge>{p.company || '—'}</Badge></td>
                      <td className="px-3 py-2.5 text-[var(--text-dim)]">{p.unit}</td>
                      <td className="fa-num px-3 py-2.5">{fmt(p.buyPrice)}</td>
                      <td className="fa-num px-3 py-2.5 text-[var(--text-dim)]">٪{fmt(Math.round((p.margin || 0) * 100))}</td>
                      <td className="fa-num px-3 py-2.5 font-bold text-brand-600">{fmt(p.sellPriceOverride ?? sellPrice(p.buyPrice, p.margin))}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex justify-end gap-1 opacity-0 transition group-hover:opacity-100">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="!px-2"><Pencil size={16} /></Button>
                          <Button variant="ghost" size="sm" onClick={() => removeProduct(p.id)} className="!px-2 text-rose-500"><Trash2 size={16} /></Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'محصول جدید' : 'ویرایش محصول'}>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="نام محصول" className="col-span-2">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="مثلاً ویفر رنگینک ۱۴*۴۲۰" />
          </Field>
          <Field label="شرکت / برند">
            <Input value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} list="company-list" placeholder="گرجی" />
            <datalist id="company-list">
              {companies.filter((c) => c !== 'همه').map((c) => <option key={c} value={c} />)}
            </datalist>
          </Field>
          <Field label="واحد">
            <Select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })}>
              {['عدد', 'کارتن', 'بسته', 'کیسه', 'بطری', 'کیلوگرم', 'شانه'].map((u) => <option key={u} value={u}>{u}</option>)}
            </Select>
          </Field>
          <Field label="قیمت تولیدی (ریال)">
            <NumberInput value={draft.producePrice} onChange={(v) => setDraft({ ...draft, producePrice: v })} />
          </Field>
          <Field label="قیمت دریافتی (ریال)">
            <NumberInput value={draft.buyPrice} onChange={(v) => setDraft({ ...draft, buyPrice: v })} />
          </Field>
          <Field label="حاشیه سود" hint="درصد سود روی قیمت دریافتی">
            <NumberInput value={draft.margin} onChange={(v) => setDraft({ ...draft, margin: v })} suffix="٪" />
          </Field>
          <Field label="قیمت فروش دستی" hint="خالی بگذارید تا خودکار حساب شود">
            <NumberInput value={draft.sellPriceOverride} onChange={(v) => setDraft({ ...draft, sellPriceOverride: v })} />
          </Field>
          <div className="col-span-2 flex items-center justify-between rounded-xl bg-brand-500/10 px-4 py-3">
            <span className="text-[13px] text-[var(--text-dim)]">قیمت فروش محاسبه‌شده</span>
            <span className="fa-num text-lg font-bold text-brand-600">{fmt(draftSell)} ریال</span>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>انصراف</Button>
          <Button variant="primary" onClick={save}>ذخیره</Button>
        </div>
      </Modal>

      {/* Import preview modal */}
      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="پیش‌نمایش ورود اطلاعات" wide>
        {preview && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone="brand"><FileSpreadsheet size={16} /> {preview.file}</Badge>
              <Badge tone="mint">{fmt(preview.found.length)} محصول شناسایی شد</Badge>
              {preview.sheets.map((s) => <Badge key={s.sheet}>{s.sheet}: {fmt(s.count)}</Badge>)}
            </div>
            <div className="max-h-72 overflow-auto rounded-xl border border-[rgb(var(--stroke)/var(--stroke-a))]">
              <table className="w-full text-right text-[12.5px]">
                <thead className="sticky top-0 bg-[rgb(var(--field)/0.8)] backdrop-blur-xl">
                  <tr className="text-[13px] text-[var(--text-dim)]">
                    <th className="px-3 py-2 font-medium">نام</th>
                    <th className="px-3 py-2 font-medium">شرکت</th>
                    <th className="px-3 py-2 font-medium">قیمت دریافتی</th>
                    <th className="px-3 py-2 font-medium">قیمت فروش</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.found.slice(0, 60).map((p) => (
                    <tr key={p.id} className="border-t border-[rgb(var(--stroke)/var(--stroke-a))]">
                      <td className="px-3 py-1.5">{p.name}</td>
                      <td className="px-3 py-1.5 text-[var(--text-dim)]">{p.company}</td>
                      <td className="fa-num px-3 py-1.5">{fmt(p.buyPrice)}</td>
                      <td className="fa-num px-3 py-1.5 text-brand-600">{fmt(p.sellPriceOverride ?? sellPrice(p.buyPrice, p.margin))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.found.length > 60 && (
              <p className="fa-num mt-2 text-[12px] text-[var(--text-dim)]">و {fmt(preview.found.length - 60)} مورد دیگر…</p>
            )}
            <p className="mt-3 rounded-xl bg-amber-500/10 px-4 py-2.5 text-[12.5px] leading-relaxed text-[var(--text-dim)]">
              محصولاتی که در فایل قیمت ندارند با قیمت صفر وارد می‌شوند؛ می‌توانید بعداً قیمتشان را ویرایش کنید.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setImportOpen(false)}>انصراف</Button>
              <Button variant="subtle" onClick={() => confirmImport('replace')}>جایگزینی کامل</Button>
              <Button variant="primary" onClick={() => confirmImport('append')}>افزودن به لیست</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
