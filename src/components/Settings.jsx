import { useState } from 'react'
import { ImagePlus, Trash2, Building2, Info, DatabaseBackup, Upload, AlertTriangle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Card, Button, Input, NumberInput, Field, Badge, Modal } from './ui'
import { fmt } from '../lib/utils'

export default function Settings() {
  const {
    settings, logoDataUrl, updateSettings, pickLogo, removeLogo,
    products, customers, invoices, exportBackup, importBackup,
  } = useStore()
  const [confirmImport, setConfirmImport] = useState(false)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-2 [&>*]:shrink-0">
      {/* Logo */}
      <Card className="p-5">
        <h3 className="mb-4 text-[14px] font-bold">لوگوی شرکت</h3>
        <div className="flex items-center gap-5">
          <div className="glass flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl">
            {logoDataUrl
              ? <img src={logoDataUrl} alt="لوگو" className="h-full w-full object-contain p-2" />
              : <Building2 size={30} className="text-[var(--text-dim)]" />}
          </div>
          <div className="flex-1">
            <p className="mb-1 text-[13px] font-medium">تصویر لوگو</p>
            <p className="mb-3 text-[12px] leading-relaxed text-[var(--text-dim)]">
              این لوگو در بالای پیش‌فاکتورهای چاپی و خروجی PDF نمایش داده می‌شود.
              فرمت‌های PNG، JPG، SVG و WebP پشتیبانی می‌شوند.
            </p>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={pickLogo}><ImagePlus size={16} /> انتخاب لوگو</Button>
              {logoDataUrl && <Button variant="ghost" size="sm" onClick={removeLogo} className="text-rose-500"><Trash2 size={16} /> حذف</Button>}
            </div>
          </div>
        </div>
      </Card>

      {/* Seller information */}
      <Card className="p-5" delay={0.05}>
        <h3 className="mb-4 text-[14px] font-bold">اطلاعات فروشنده</h3>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="نام شرکت">
            <Input value={settings.companyName} onChange={(e) => updateSettings({ companyName: e.target.value })} />
          </Field>
          <Field label="تلفن">
            <Input dir="ltr" className="text-right" value={settings.phone} onChange={(e) => updateSettings({ phone: e.target.value })} />
          </Field>
          <Field label="آدرس" className="col-span-2">
            <Input value={settings.address} onChange={(e) => updateSettings({ address: e.target.value })} />
          </Field>
          <Field label="کد اقتصادی">
            <Input value={settings.economicCode} onChange={(e) => updateSettings({ economicCode: e.target.value })} />
          </Field>
          <Field label="واحد پول">
            <Input value={settings.currency} onChange={(e) => updateSettings({ currency: e.target.value })} />
          </Field>
        </div>
      </Card>

      {/* Calculation defaults */}
      <Card className="p-5" delay={0.1}>
        <h3 className="mb-1 text-[14px] font-bold">پیش‌فرض‌های محاسبه</h3>
        <p className="mb-4 text-[12px] text-[var(--text-dim)]">
          این مقادیر هنگام افزودن محصول جدید یا ورود اطلاعات از اکسل به‌کار می‌روند.
        </p>
        <div className="grid grid-cols-2 gap-3.5">
          <Field label="حاشیه سود پیش‌فرض" hint="درصد سود روی قیمت دریافتی">
            <NumberInput
              value={Math.round((settings.defaultMargin || 0) * 100)}
              onChange={(v) => updateSettings({ defaultMargin: (v || 0) / 100 })}
              suffix="٪"
            />
          </Field>
          <Field label="مالیات بر ارزش افزوده پیش‌فرض">
            <NumberInput
              value={Math.round((settings.defaultVat || 0) * 100)}
              onChange={(v) => updateSettings({ defaultVat: (v || 0) / 100 })}
              suffix="٪"
            />
          </Field>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-brand-500/10 px-4 py-3">
          <Info size={15} className="mt-0.5 shrink-0 text-brand-500" />
          <p className="text-[12px] leading-relaxed text-[var(--text-dim)]">
            فرمول قیمت فروش: <span className="font-bold text-[var(--text)]">قیمت دریافتی × (۱ + حاشیه سود)</span>
            {' '}— اگر برای محصولی «قیمت فروش دستی» وارد کنید، همان مقدار جایگزین محاسبه‌ی خودکار می‌شود.
          </p>
        </div>
      </Card>

      {/* Data status */}
      <Card className="p-5" delay={0.15}>
        <h3 className="mb-3 text-[14px] font-bold">وضعیت اطلاعات</h3>
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{fmt(products.length)} محصول</Badge>
          <Badge tone="mint">{fmt(customers.length)} مشتری</Badge>
          <Badge tone="amber">{fmt(invoices.length)} پیش‌فاکتور</Badge>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-dim)]">
          همه‌ی اطلاعات به‌صورت خودکار روی همین رایانه ذخیره می‌شود و نیازی به اینترنت ندارد.
        </p>
      </Card>

      {/* Full backup */}
      <Card className="p-5" delay={0.2}>
        <h3 className="mb-1 text-[14px] font-bold">پشتیبان‌گیری و انتقال اطلاعات</h3>
        <p className="mb-4 text-[12px] leading-relaxed text-[var(--text-dim)]">
          با «خروجی کلی» یک فایل پشتیبان شامل همه‌ی محصولات، مشتریان، پیش‌فاکتورها،
          تنظیمات و لوگو ساخته می‌شود. همان فایل را می‌توانید روی رایانه‌ی دیگری وارد کنید.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={exportBackup}>
            <DatabaseBackup size={15} /> خروجی کلی اطلاعات
          </Button>
          <Button variant="subtle" onClick={() => setConfirmImport(true)}>
            <Upload size={15} /> ورود اطلاعات
          </Button>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5 text-[12px] leading-relaxed text-[var(--text-dim)]">
          <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />
          هنگام ورود اطلاعات، تمام داده‌های فعلی با محتوای فایل پشتیبان جایگزین می‌شود.
          پیش از این کار یک خروجی از وضعیت فعلی بگیرید.
        </p>
      </Card>

      {/* Replace confirmation */}
      <Modal open={confirmImport} onClose={() => setConfirmImport(false)} title="ورود اطلاعات">
        <p className="text-[13px] leading-relaxed">
          با این کار <b>همه‌ی اطلاعات فعلی</b> ({fmt(products.length)} محصول،
          {' '}{fmt(customers.length)} مشتری، {fmt(invoices.length)} پیش‌فاکتور)
          حذف و با محتوای فایل پشتیبان جایگزین می‌شود. این عمل بازگشت‌پذیر نیست.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmImport(false)}>انصراف</Button>
          <Button variant="subtle" onClick={() => { setConfirmImport(false); exportBackup() }}>
            اول خروجی بگیر
          </Button>
          <Button variant="danger" onClick={() => { setConfirmImport(false); importBackup() }}>
            جایگزین کن
          </Button>
        </div>
      </Modal>
    </div>
  )
}
