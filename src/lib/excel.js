import * as XLSX from 'xlsx'
import { parseNum, uid } from './utils'

/* Possible header words for each column, as seen in real-world Excel files */
const HEAD = {
  name: ['شرح کالا', 'نام محصول', 'نام کالا', 'شرح', 'کالا', 'محصول', 'شرح محصول'],
  company: ['شرکت', 'برند', 'شرکت / برند', 'تولیدکننده', 'تامین کننده'],
  unit: ['واحد', 'واحد شمارش'],
  buy: ['قیمت دریافتی', 'تولید کننده', 'تولیدکننده', 'قیمت خرید', 'خرید'],
  produce: ['قیمت تولیدی', 'قیمت تولید'],
  consumer: ['مصرف کننده', 'مصرف‌کننده', 'قیمت مصرف'],
  margin: ['حاشیه سود', 'سود', 'درصد سود'],
  sell: ['قیمت فروش', 'فروش'],
  weight: ['وزن', 'وزن (گرم)'],
  perCarton: ['تعداد در کارتن', 'تعداد کارتن', 'در کارتن'],
  barcode: ['بارکد', 'بارکد کالا'],
}

const norm = (s) =>
  String(s ?? '')
    .replace(/[‌‎‏]/g, ' ')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim()

/* Columns that must never be picked as the product-name column */
const CODE_HEADS = ['کد کالا', 'کد محصول', 'کد', 'بارکد کالا', 'بارکد', 'ردیف']

const matches = (cell, list) => {
  const c = norm(cell)
  if (!c) return false
  // Exact matches take priority
  if (list.some((k) => c === norm(k))) return true
  // A product-code column must not be mistaken for the product-name keyword
  if (CODE_HEADS.some((k) => c === norm(k))) return false
  return list.some((k) => c.includes(norm(k)))
}

/** Find the row matching the most known column names and treat it as the header row */
function findHeaderRow(rows) {
  let best = { idx: -1, score: 0 }
  const scan = Math.min(rows.length, 25)
  for (let i = 0; i < scan; i++) {
    const row = rows[i] || []
    let score = 0
    for (const cell of row) {
      for (const list of Object.values(HEAD)) {
        if (matches(cell, list)) { score++; break }
      }
    }
    if (score > best.score) best = { idx: i, score }
  }
  return best.score >= 2 ? best.idx : -1
}

function mapColumns(headerRow) {
  const map = {}
  // Exact matches first, so the right column wins before any fuzzy match
  for (const exact of [true, false]) {
    headerRow.forEach((cell, i) => {
      const c = norm(cell)
      if (!c) return
      for (const [key, list] of Object.entries(HEAD)) {
        if (map[key] !== undefined) continue
        if (Object.values(map).includes(i)) continue // Each column fills only one role
        const hit = exact ? list.some((k) => c === norm(k)) : matches(cell, list)
        if (hit) { map[key] = i; break }
      }
    })
  }
  return map
}

/**
 * Mode 1 - standard table: one product per row, columns identified by the header.
 */
function parseTable(rows, defaults) {
  const hIdx = findHeaderRow(rows)
  if (hIdx === -1) return null
  const map = mapColumns(rows[hIdx])
  if (map.name === undefined) return null

  const out = []
  for (let i = hIdx + 1; i < rows.length; i++) {
    const row = rows[i] || []
    const name = norm(row[map.name])
    // Skip empty rows, summary rows, and repeated header rows
    if (!name || name.length < 2) continue
    if (/^(جمع|مجموع|total|ردیف)/i.test(name)) continue

    const buy = map.buy !== undefined ? parseNum(row[map.buy]) : 0
    const produce = map.produce !== undefined ? parseNum(row[map.produce]) : 0
    const consumer = map.consumer !== undefined ? parseNum(row[map.consumer]) : 0
    const margin = map.margin !== undefined ? parseNum(row[map.margin]) : defaults.margin
    const explicitSell = map.sell !== undefined ? parseNum(row[map.sell]) : 0

    const buyPrice = buy || produce || consumer || 0
    if (!buyPrice && !explicitSell) continue // A row with no price at all is not usable

    out.push({
      id: uid(),
      name,
      company: map.company !== undefined ? norm(row[map.company]) || defaults.company : defaults.company,
      unit: map.unit !== undefined ? norm(row[map.unit]) || 'عدد' : 'عدد',
      producePrice: produce || buyPrice,
      buyPrice,
      consumerPrice: consumer,
      margin: margin > 1 ? margin / 100 : margin, // Both 18 and 0.18 are accepted
      sellPriceOverride: explicitSell || null,
      weight: map.weight !== undefined ? parseNum(row[map.weight]) : 0,
      perCarton: map.perCarton !== undefined ? parseNum(row[map.perCarton]) : 0,
      barcode: map.barcode !== undefined ? norm(row[map.barcode]) : '',
      createdAt: Date.now(),
    })
  }
  return out.length ? out : null
}

/**
 * Mode 2 - "all products" sheet: each column is one company, its header is the
 * company name, and no prices are present.
 */
function parseCompanyColumns(rows, defaults) {
  const header = rows.find((r) => r && r.some((c) => /لیست محصولات/.test(norm(c))))
  if (!header) return null

  const cols = []
  header.forEach((cell, i) => {
    const t = norm(cell)
    if (/لیست محصولات/.test(t)) {
      cols.push({ idx: i, company: t.replace(/لیست محصولات/, '').trim() || 'نامشخص' })
    }
  })
  if (!cols.length) return null

  const start = rows.indexOf(header) + 1
  const out = []
  for (let i = start; i < rows.length; i++) {
    for (const { idx, company } of cols) {
      const name = norm((rows[i] || [])[idx])
      if (!name || name.length < 2) continue
      // Duplicate rows are kept: in these sheets duplicates usually mean a
      // different weight or packaging, so the user should decide.
      out.push({
        id: uid(),
        name,
        company,
        unit: 'عدد',
        producePrice: 0,
        buyPrice: 0,
        consumerPrice: 0,
        margin: defaults.margin,
        sellPriceOverride: null,
        weight: 0,
        perCarton: 0,
        barcode: '',
        createdAt: Date.now(),
      })
    }
  }
  return out.length ? out : null
}

/**
 * Convert an Excel file into a product list.
 * Every sheet is inspected and both modes are attempted.
 */
export function parseWorkbook(arrayBuffer, { defaultMargin = 0.15, fallbackCompany = 'نامشخص' } = {}) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const defaults = { margin: defaultMargin, company: fallbackCompany }
  const all = []
  const sheetReport = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '', raw: true })
    if (!rows.length) continue

    const guessCompany = /گرجی/.test(sheetName) ? 'گرجی' : /پاک/.test(sheetName) ? 'پاکنام' : fallbackCompany
    const d = { ...defaults, company: guessCompany }

    const found = parseCompanyColumns(rows, d) || parseTable(rows, d)
    if (found?.length) {
      all.push(...found)
      sheetReport.push({ sheet: sheetName, count: found.length })
    }
  }

  return { products: all, sheets: sheetReport }
}

/** Export the product catalog to Excel */
export function exportProducts(products) {
  const rows = products.map((p, i) => ({
    'ردیف': i + 1,
    'شرکت / برند': p.company,
    'نام محصول': p.name,
    'واحد': p.unit,
    'قیمت تولیدی (ریال)': p.producePrice,
    'قیمت دریافتی (ریال)': p.buyPrice,
    'حاشیه سود': p.margin,
    'قیمت فروش (ریال)': p.sellPriceOverride ?? p.buyPrice * (1 + p.margin),
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'محصولات')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}

/** Export a single invoice to Excel */
export function exportInvoice(inv, totals) {
  const rows = inv.items.map((it, i) => ({
    'ردیف': i + 1,
    'شرح کالا': it.name,
    'شرکت': it.company,
    'واحد': it.unit,
    'تعداد': it.qty,
    'قیمت واحد (ریال)': it.unitPrice,
    'مبلغ کل (ریال)': it.qty * it.unitPrice,
  }))
  rows.push({}, { 'شرح کالا': 'جمع جزء', 'مبلغ کل (ریال)': totals.subtotal })
  rows.push({ 'شرح کالا': 'تخفیف', 'مبلغ کل (ریال)': totals.discountAmount })
  rows.push({ 'شرح کالا': 'مالیات بر ارزش افزوده', 'مبلغ کل (ریال)': totals.vatAmount })
  rows.push({ 'شرح کالا': 'مبلغ نهایی', 'مبلغ کل (ریال)': totals.total })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'پیش فاکتور')
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
}
