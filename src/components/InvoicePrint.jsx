import { forwardRef } from 'react'
import { useStore } from '../store/useStore'
import { fmt, toFa, parseNum, numToWords } from '../lib/utils'

/** A4 invoice sheet, used both for printing and for PDF export */
const InvoicePrint = forwardRef(function InvoicePrint({ inv, totals, settings }, ref) {
  const logo = useStore((s) => s.logoDataUrl)

  return (
    <div ref={ref} className="print-area mx-auto w-[210mm] bg-white p-10 text-black" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black/80 pb-4">
        <div className="flex items-center gap-3">
          {logo && <img src={logo} alt="" className="h-16 w-16 object-contain" />}
          <div>
            <h1 className="text-[19px] font-black">{settings.companyName}</h1>
            {/* Phone and economic code are not arithmetic values, so they get no thousands separators */}
            {settings.phone && <p className="fa-num text-[11.5px]">تلفن: <bdi>{toFa(settings.phone)}</bdi></p>}
            {settings.address && <p className="text-[11.5px]">{settings.address}</p>}
            {settings.economicCode && <p className="fa-num text-[11.5px]">کد اقتصادی: <bdi>{toFa(settings.economicCode)}</bdi></p>}
          </div>
        </div>
        <div className="text-left">
          <h2 className="mb-1 text-[17px] font-black">پیش‌فاکتور فروش</h2>
          <p className="fa-num text-[12px]">شماره: {inv.number}</p>
          <p className="fa-num text-[12px]">تاریخ: {inv.date}</p>
          <p className="text-[12px]">اعتبار: {inv.validity}</p>
        </div>
      </div>

      {/* Buyer details */}
      <div className="mt-4 rounded border border-black/25 p-3">
        <p className="mb-1.5 text-[12px] font-bold">مشخصات خریدار</p>
        <div className="grid grid-cols-3 gap-2 text-[11.5px]">
          <p><span className="text-black/55">نام: </span>{inv.customerName || '—'}</p>
          <p className="fa-num"><span className="text-black/55">تلفن: </span><bdi>{inv.customerPhone ? toFa(inv.customerPhone) : '—'}</bdi></p>
          <p><span className="text-black/55">پرداخت: </span>{inv.payment}</p>
          {inv.customerAddress && <p className="col-span-3"><span className="text-black/55">آدرس: </span>{inv.customerAddress}</p>}
        </div>
      </div>

      {/* Line items */}
      <table className="mt-4 w-full border-collapse text-[11.5px]">
        <thead>
          <tr className="bg-black/8">
            <th className="border border-black/30 px-2 py-1.5 font-bold">ردیف</th>
            <th className="border border-black/30 px-2 py-1.5 text-right font-bold">شرح کالا</th>
            <th className="border border-black/30 px-2 py-1.5 font-bold">شرکت</th>
            <th className="border border-black/30 px-2 py-1.5 font-bold">واحد</th>
            <th className="border border-black/30 px-2 py-1.5 font-bold">تعداد</th>
            <th className="border border-black/30 px-2 py-1.5 font-bold">قیمت واحد</th>
            <th className="border border-black/30 px-2 py-1.5 font-bold">مبلغ کل</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((it, i) => (
            <tr key={it.key}>
              <td className="fa-num border border-black/25 px-2 py-1 text-center">{fmt(i + 1)}</td>
              <td className="border border-black/25 px-2 py-1">{it.name}</td>
              <td className="border border-black/25 px-2 py-1 text-center">{it.company || '—'}</td>
              <td className="border border-black/25 px-2 py-1 text-center">{it.unit}</td>
              <td className="fa-num border border-black/25 px-2 py-1 text-center">{fmt(it.qty)}</td>
              <td className="fa-num border border-black/25 px-2 py-1 text-center">{fmt(it.unitPrice)}</td>
              <td className="fa-num border border-black/25 px-2 py-1 text-center font-bold">{fmt(parseNum(it.qty) * parseNum(it.unitPrice))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="mt-3 flex justify-start">
        <table className="w-[76mm] border-collapse text-[11.5px]">
          <tbody>
            <SumRow label="جمع جزء" value={fmt(totals.subtotal)} />
            {totals.discountAmount > 0 && <SumRow label="تخفیف" value={fmt(totals.discountAmount)} />}
            {totals.vatAmount > 0 && <SumRow label={`مالیات بر ارزش افزوده (٪${fmt(inv.vat)})`} value={fmt(totals.vatAmount)} />}
            <tr className="bg-black/8">
              <td className="border border-black/35 px-2 py-1.5 font-black">مبلغ نهایی</td>
              <td className="fa-num border border-black/35 px-2 py-1.5 text-center font-black">{fmt(Math.round(totals.total))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11px]">
        مبلغ به حروف: <span className="font-bold">{numToWords(Math.round(totals.total))} {settings.currency}</span>
      </p>

      {inv.note && <p className="mt-2 text-[11px]"><span className="text-black/55">توضیحات: </span>{inv.note}</p>}

      {/* Footer */}
      <div className="mt-6 flex justify-between border-t border-black/25 pt-3 text-[11px]">
        <p>مهر و امضای فروشنده</p>
        <p>مهر و امضای خریدار</p>
      </div>
      <p className="mt-3 text-center text-[10px] text-black/55">
        این پیش‌فاکتور صرفاً جهت اعلام قیمت است و تا پایان مهلت اعتبار ({inv.validity}) معتبر می‌باشد.
      </p>
    </div>
  )
})

function SumRow({ label, value }) {
  return (
    <tr>
      <td className="border border-black/25 px-2 py-1">{label}</td>
      <td className="fa-num border border-black/25 px-2 py-1 text-center">{value}</td>
    </tr>
  )
}

export default InvoicePrint
