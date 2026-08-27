import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Package, Users, FileText, Wallet, TrendingUp, Plus, Upload, Building2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import { fmt, invoiceTotals, sellPrice } from '../lib/utils'
import { Card, Button, Badge, Empty, spring } from './ui'

export default function Dashboard({ go }) {
  const { products, customers, invoices, settings, logoDataUrl } = useStore()

  const stats = useMemo(() => {
    const totalSales = invoices.reduce((s, i) => s + (i.totals?.total ?? invoiceTotals(i.items, i).total), 0)
    const totalUnits = invoices.reduce((s, i) => s + (i.totals?.count ?? invoiceTotals(i.items, i).count), 0)
    const companies = new Set(products.map((p) => p.company).filter(Boolean))

    // Best-selling products by quantity
    const byProduct = {}
    for (const inv of invoices) {
      for (const it of inv.items || []) {
        if (!byProduct[it.name]) byProduct[it.name] = { name: it.name, company: it.company, qty: 0, amount: 0 }
        byProduct[it.name].qty += Number(it.qty) || 0
        byProduct[it.name].amount += (Number(it.qty) || 0) * (Number(it.unitPrice) || 0)
      }
    }
    const top = Object.values(byProduct).sort((a, b) => b.qty - a.qty).slice(0, 5)

    return { totalSales, totalUnits, companies: companies.size, top }
  }, [products, invoices])

  const cards = [
    { icon: Package, label: 'محصولات', value: fmt(products.length), tone: 'brand', go: 'products' },
    { icon: Building2, label: 'شرکت‌ها', value: fmt(stats.companies), tone: 'mint', go: 'products' },
    { icon: Users, label: 'مشتریان', value: fmt(customers.length), tone: 'amber', go: 'customers' },
    { icon: FileText, label: 'پیش‌فاکتورها', value: fmt(invoices.length), tone: 'rose', go: 'invoices' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-2 [&>*]:shrink-0">
      {/* Welcome */}
      <Card className="flex items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="" className="h-16 w-16 rounded-2xl object-contain" />
          ) : (
            <div className="glass flex h-16 w-16 items-center justify-center rounded-2xl">
              <Building2 size={24} className="text-[var(--text-dim)]" />
            </div>
          )}
          <div>
            <h2 className="text-[19px] font-black">{settings.companyName}</h2>
            <p className="text-[13px] text-[var(--text-dim)]">سامانه صدور پیش‌فاکتور و مدیریت فروش</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="subtle" onClick={() => go('products')}><Upload size={15} /> آپلود محصولات</Button>
          <Button variant="primary" onClick={() => go('new-invoice')}><Plus size={16} /> پیش‌فاکتور جدید</Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c, i) => (
          <motion.button
            key={c.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: i * 0.05 }}
            whileHover={{ y: -4 }}
            onClick={() => go(c.go)}
            className="glass rounded-[var(--radius-macxl)] p-4 text-right"
          >
            <c.icon size={16} className="mb-2 text-[var(--text-dim)]" />
            <p className="fa-num text-[26px] font-black leading-none">{c.value}</p>
            <p className="mt-1.5 text-[12px] text-[var(--text-dim)]">{c.label}</p>
          </motion.button>
        ))}
      </div>

      {/* Sales */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="p-5" delay={0.1}>
          <div className="mb-1 flex items-center gap-2">
            <Wallet size={16} className="text-brand-500" />
            <p className="text-[13px] text-[var(--text-dim)]">مجموع مبلغ پیش‌فاکتورها</p>
          </div>
          <p className="fa-num text-[26px] font-black text-brand-600">{fmt(Math.round(stats.totalSales))}</p>
          <p className="text-[13px] text-[var(--text-dim)]">{settings.currency}</p>
        </Card>
        <Card className="p-5" delay={0.15}>
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-mint-500" />
            <p className="text-[13px] text-[var(--text-dim)]">مجموع واحدهای فروخته‌شده</p>
          </div>
          <p className="fa-num text-[26px] font-black">{fmt(stats.totalUnits)}</p>
          <p className="text-[13px] text-[var(--text-dim)]">واحد کالا</p>
        </Card>
      </div>

      {/* Best sellers */}
      <Card className="p-5" delay={0.2}>
        <h3 className="mb-3 text-[14px] font-bold">پرفروش‌ترین کالاها</h3>
        {stats.top.length === 0 ? (
          <Empty icon={TrendingUp} title="هنوز فروشی ثبت نشده" desc="پس از صدور پیش‌فاکتور، پرفروش‌ترین کالاها اینجا نمایش داده می‌شود." />
        ) : (
          <div className="space-y-2">
            {stats.top.map((p, i) => {
              const max = stats.top[0].qty || 1
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="fa-num w-5 text-[12px] text-[var(--text-dim)]">{fmt(i + 1)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <p className="truncate text-[12.5px] font-medium">{p.name}</p>
                      <span className="fa-num shrink-0 text-[12px] text-[var(--text-dim)]">{fmt(p.qty)} واحد</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[rgb(var(--field)/0.5)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(p.qty / max) * 100}%` }}
                        transition={{ ...spring, delay: 0.25 + i * 0.06 }}
                        className="h-full rounded-full bg-brand-500"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
