/* ---------- Numbers ---------- */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export const toFa = (s) => String(s ?? '').replace(/\d/g, (d) => FA_DIGITS[+d])

/** Convert Persian/Arabic digits to Latin, for input the user types in Persian */
export const toEn = (s) =>
  String(s ?? '')
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))

/** Return the number with thousands separators and Persian digits */
export function fmt(n, { fa = true, dec = 0 } = {}) {
  const num = Number(n)
  if (!isFinite(num)) return fa ? '۰' : '0'
  const s = num.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
  return fa ? toFa(s) : s
}

/** Safely parse a number from user input (Persian digits, commas, spaces) */
export function parseNum(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0
  const cleaned = toEn(v).replace(/[,\s٬،]/g, '')
  const n = parseFloat(cleaned)
  return isFinite(n) ? n : 0
}

/* ---------- Jalali date ---------- */

const faDate = new Intl.DateTimeFormat('fa-IR-u-nu-latn', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Tehran',
})

/** Gregorian date -> Jalali string, e.g. 1405/06/01 */
export function toJalali(date = new Date()) {
  const parts = faDate.formatToParts(date)
  const get = (t) => parts.find((p) => p.type === t)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')}`
}

export const todayJalali = () => toJalali(new Date())

/** Current Jalali year, used for invoice numbering */
export const jalaliYear = () => toJalali().split('/')[0]

/* ---------- Price calculations ---------- */

/** Selling price = purchase price x (1 + profit margin) */
export const sellPrice = (buy, margin) => parseNum(buy) * (1 + parseNum(margin))

/** Profit margin required to reach a given selling price */
export const marginFor = (buy, sell) => {
  const b = parseNum(buy)
  return b > 0 ? parseNum(sell) / b - 1 : 0
}

/**
 * Totals for one invoice.
 * The discount applies to the subtotal, and VAT is computed after the discount.
 */
export function invoiceTotals(items = [], { discount = 0, discountType = 'amount', vat = 0 } = {}) {
  const subtotal = items.reduce((s, it) => s + parseNum(it.qty) * parseNum(it.unitPrice), 0)
  const discountAmount =
    discountType === 'percent'
      ? subtotal * (parseNum(discount) / 100)
      : Math.min(parseNum(discount), subtotal)
  const afterDiscount = Math.max(0, subtotal - discountAmount)
  const vatAmount = afterDiscount * (parseNum(vat) / 100)
  return {
    subtotal,
    discountAmount,
    afterDiscount,
    vatAmount,
    total: afterDiscount + vatAmount,
    count: items.reduce((s, it) => s + parseNum(it.qty), 0),
  }
}

/* ---------- Number to words (for the invoice footer) ---------- */

const ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه']
const TEENS = ['ده', 'یازده', 'دوازده', 'سیزده', 'چهارده', 'پانزده', 'شانزده', 'هفده', 'هجده', 'نوزده']
const TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود']
const HUNDREDS = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد']
const SCALES = ['', ' هزار', ' میلیون', ' میلیارد', ' هزار میلیارد']

function below1000(n) {
  const out = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h) out.push(HUNDREDS[h])
  if (rest >= 10 && rest < 20) out.push(TEENS[rest - 10])
  else {
    const t = Math.floor(rest / 10)
    const o = rest % 10
    if (t) out.push(TENS[t])
    if (o) out.push(ONES[o])
  }
  return out.join(' و ')
}

/** 1234 -> the Persian spelled-out form of the number */
export function numToWords(n) {
  let num = Math.floor(Math.abs(parseNum(n)))
  if (num === 0) return 'صفر'
  const chunks = []
  let i = 0
  while (num > 0 && i < SCALES.length) {
    const c = num % 1000
    if (c) chunks.unshift(below1000(c) + SCALES[i])
    num = Math.floor(num / 1000)
    i++
  }
  return chunks.join(' و ')
}

/* ---------- Helpers ---------- */

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

/** Invoice number format: PF-1405-001 */
export const invoiceNumber = (seq) => `PF-${jalaliYear()}-${String(seq).padStart(3, '0')}`

export function download(name, blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
