import { create } from 'zustand'
import { uid, invoiceNumber, parseNum, sellPrice } from '../lib/utils'

/** Debounced autosave, so every small change does not trigger a disk write */
let saveTimer = null
const persist = (get) => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const { products, customers, invoices, settings, meta } = get()
    window.api?.writeDb({ products, customers, invoices, settings, meta })
  }, 350)
}

export const useStore = create((set, get) => ({
  ready: false,
  products: [],
  customers: [],
  invoices: [],
  settings: {
    companyName: 'شرکت پخش',
    phone: '',
    address: '',
    economicCode: '',
    logoPath: null,
    defaultMargin: 0.15,
    defaultVat: 0,
    currency: 'ریال',
  },
  meta: { version: 1, lastInvoiceSeq: 0 },
  logoDataUrl: null,
  toast: null,

  /* ---------- Startup ---------- */
  init: async () => {
    const db = await window.api?.readDb()
    if (db) {
      set({ ...db, ready: true })
      if (db.settings?.logoPath) {
        const dataUrl = await window.api.loadLogo(db.settings.logoPath)
        set({ logoDataUrl: dataUrl })
      }
    } else {
      set({ ready: true })
    }
  },

  /* ---------- Backup ---------- */
  exportBackup: async () => {
    try {
      const p = await window.api?.exportBackup()
      if (p) get().notify('فایل پشتیبان ساخته شد')
    } catch (err) {
      get().notify(`خطا در خروجی: ${err.message}`, 'error')
    }
  },

  importBackup: async () => {
    try {
      const res = await window.api?.importBackup()
      if (!res) return
      const { db } = res
      set({
        products: db.products || [],
        customers: db.customers || [],
        invoices: db.invoices || [],
        settings: db.settings,
        meta: db.meta,
      })
      if (db.settings?.logoPath) {
        const dataUrl = await window.api.loadLogo(db.settings.logoPath)
        set({ logoDataUrl: dataUrl })
      }
      get().notify(`اطلاعات از ${res.file} بازیابی شد`)
    } catch (err) {
      get().notify(`خطا در ورود اطلاعات: ${err.message}`, 'error')
    }
  },

  notify: (message, kind = 'success') => {
    set({ toast: { message, kind, id: uid() } })
    setTimeout(() => set((s) => (s.toast?.message === message ? { toast: null } : {})), 2600)
  },

  /* ---------- Settings and logo ---------- */
  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }))
    persist(get)
  },

  pickLogo: async () => {
    const res = await window.api?.openLogo()
    if (!res) return
    set((s) => ({ settings: { ...s.settings, logoPath: res.path }, logoDataUrl: res.dataUrl }))
    persist(get)
    get().notify('لوگو ثبت شد')
  },

  removeLogo: () => {
    set((s) => ({ settings: { ...s.settings, logoPath: null }, logoDataUrl: null }))
    persist(get)
  },

  /* ---------- Products ---------- */
  addProduct: (p) => {
    const product = {
      id: uid(),
      name: '',
      company: '',
      unit: 'عدد',
      producePrice: 0,
      buyPrice: 0,
      consumerPrice: 0,
      margin: get().settings.defaultMargin,
      sellPriceOverride: null,
      weight: 0,
      perCarton: 0,
      barcode: '',
      createdAt: Date.now(),
      ...p,
    }
    set((s) => ({ products: [product, ...s.products] }))
    persist(get)
    return product
  },

  updateProduct: (id, patch) => {
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
    persist(get)
  },

  removeProduct: (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }))
    persist(get)
  },

  /** Replace the catalog entirely, or append to it, after an Excel import */
  importProducts: (list, mode = 'append') => {
    set((s) => ({ products: mode === 'replace' ? list : [...list, ...s.products] }))
    persist(get)
  },

  clearProducts: () => {
    set({ products: [] })
    persist(get)
  },

  /* ---------- Customers ---------- */
  addCustomer: (c) => {
    const customer = {
      id: uid(),
      name: '',
      shopName: '',
      phone: '',
      address: '',
      city: '',
      note: '',
      createdAt: Date.now(),
      ...c,
    }
    set((s) => ({ customers: [customer, ...s.customers] }))
    persist(get)
    return customer
  },

  updateCustomer: (id, patch) => {
    set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) }))
    persist(get)
  },

  removeCustomer: (id) => {
    set((s) => ({ customers: s.customers.filter((c) => c.id !== id) }))
    persist(get)
  },

  /* ---------- Invoices ---------- */
  saveInvoice: (inv) => {
    const existing = get().invoices.find((i) => i.id === inv.id)
    if (existing) {
      set((s) => ({ invoices: s.invoices.map((i) => (i.id === inv.id ? { ...inv, updatedAt: Date.now() } : i)) }))
    } else {
      const seq = get().meta.lastInvoiceSeq + 1
      const record = {
        ...inv,
        id: inv.id || uid(),
        number: inv.number || invoiceNumber(seq),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      set((s) => ({ invoices: [record, ...s.invoices], meta: { ...s.meta, lastInvoiceSeq: seq } }))
      persist(get)
      return record
    }
    persist(get)
    return inv
  },

  removeInvoice: (id) => {
    set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) }))
    persist(get)
  },

  nextInvoiceNumber: () => invoiceNumber(get().meta.lastInvoiceSeq + 1),

  /* ---------- Reporting ---------- */

  /** Per-customer sales stats: invoice count, total units, and total amount */
  customerStats: (customerId) => {
    const invs = get().invoices.filter((i) => i.customerId === customerId && i.status !== 'canceled')
    let units = 0
    let amount = 0
    const productMap = {}
    for (const inv of invs) {
      for (const it of inv.items || []) {
        const q = parseNum(it.qty)
        units += q
        amount += q * parseNum(it.unitPrice)
        const key = it.name
        if (!productMap[key]) productMap[key] = { name: it.name, unit: it.unit, qty: 0, amount: 0 }
        productMap[key].qty += q
        productMap[key].amount += q * parseNum(it.unitPrice)
      }
    }
    return {
      invoiceCount: invs.length,
      units,
      amount,
      products: Object.values(productMap).sort((a, b) => b.qty - a.qty),
      lastDate: invs[0]?.date ?? null,
    }
  },

  /** Effective selling price of a product */
  effectivePrice: (p) => (p.sellPriceOverride ?? sellPrice(p.buyPrice, p.margin)),
}))
