'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Search } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { getCustomers } from '@/actions/customers'
import { getProducts } from '@/actions/products'
import { createQuote } from '@/actions/quotes'
import { CURRENCIES, DEFAULT_TAX_RATE, PRODUCT_UNITS } from '@/config/constants'
import type { Customer, Product, QuoteFormData, QuoteItemFormData } from '@/types'

interface QuoteItem extends QuoteItemFormData {
  id: string // Temporary ID for list key
}

export default function NewQuotePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isCustomerOpen, setIsCustomerOpen] = useState(false)
  const [isProductOpen, setIsProductOpen] = useState(false)

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [currency, setCurrency] = useState('TWD')
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE * 100) // Store as percentage
  const [discountAmount, setDiscountAmount] = useState(0)
  const [validUntil, setValidUntil] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [deliveryTerms, setDeliveryTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const [customersResult, productsResult] = await Promise.all([
        getCustomers(),
        getProducts({ is_active: true }),
      ])

      if (customersResult.data) setCustomers(customersResult.data)
      if (productsResult.data) setProducts(productsResult.data)

      // Set default valid_until to 30 days from now
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 30)
      setValidUntil(defaultDate.toISOString().split('T')[0])
    }
    loadData()
  }, [])

  // Add product to quote items
  const handleAddProduct = (product: Product) => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      product_description: product.description || '',
      quantity: 1,
      unit: product.unit,
      unit_price: product.base_price,
      original_price: product.base_price,
    }
    setItems([...items, newItem])
    setIsProductOpen(false)
  }

  // Add empty item (custom)
  const handleAddEmptyItem = () => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      product_id: null,
      product_name: '',
      product_sku: '',
      product_description: '',
      quantity: 1,
      unit: '件',
      unit_price: 0,
      original_price: 0,
    }
    setItems([...items, newItem])
  }

  // Update item
  const handleUpdateItem = (id: string, field: keyof QuoteItem, value: unknown) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  // Remove item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)
  const taxAmount = (subtotal - discountAmount) * (taxRate / 100)
  const totalAmount = subtotal - discountAmount + taxAmount

  // Format currency
  const formatCurrency = (amount: number) => {
    const symbol = CURRENCIES.find(c => c.value === currency)?.symbol || 'NT$'
    return `${symbol}${amount.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Submit form
  const handleSubmit = async () => {
    // Validation
    if (!selectedCustomer) {
      toast.error('請選擇客戶')
      return
    }

    if (items.length === 0) {
      toast.error('請至少新增一個產品')
      return
    }

    const invalidItems = items.filter(item => !item.product_name || item.unit_price <= 0)
    if (invalidItems.length > 0) {
      toast.error('請確認所有產品都有名稱和價格')
      return
    }

    setIsSubmitting(true)
    try {
      const formData: QuoteFormData = {
        customer_id: selectedCustomer.id,
        currency: currency as 'TWD' | 'USD' | 'CNY' | 'EUR' | 'JPY',
        tax_rate: taxRate / 100,
        discount_amount: discountAmount,
        valid_until: validUntil || null,
        payment_terms: paymentTerms || null,
        delivery_terms: deliveryTerms || null,
        notes: notes || null,
        internal_notes: internalNotes || null,
      }

      const quoteItems: QuoteItemFormData[] = items.map(item => ({
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_description: item.product_description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        original_price: item.original_price,
      }))

      const result = await createQuote(formData, quoteItems)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('報價單建立成功')
        router.push(`/quotes/${result.data?.id}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">新建報價單</h1>
          <p className="text-muted-foreground">建立新的報價單</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>客戶資訊</CardTitle>
            </CardHeader>
            <CardContent>
              <Popover open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isCustomerOpen}
                    className="w-full justify-between"
                  >
                    {selectedCustomer
                      ? selectedCustomer.company_name
                      : '選擇客戶...'}
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="搜尋客戶..." />
                    <CommandList>
                      <CommandEmpty>找不到客戶</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.company_name}
                            onSelect={() => {
                              setSelectedCustomer(customer)
                              setIsCustomerOpen(false)
                            }}
                          >
                            <div>
                              <div className="font-medium">{customer.company_name}</div>
                              {customer.contact_name && (
                                <div className="text-sm text-muted-foreground">
                                  {customer.contact_name}
                                </div>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {selectedCustomer && (
                <div className="mt-4 p-4 rounded-lg bg-muted">
                  <div className="grid gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">聯絡人：</span>
                      {selectedCustomer.contact_name || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email：</span>
                      {selectedCustomer.contact_email || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">電話：</span>
                      {selectedCustomer.contact_phone || '-'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">地址：</span>
                      {selectedCustomer.address || '-'}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>報價明細</CardTitle>
              <div className="flex gap-2">
                <Popover open={isProductOpen} onOpenChange={setIsProductOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      新增產品
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <Command>
                      <CommandInput placeholder="搜尋產品..." />
                      <CommandList>
                        <CommandEmpty>找不到產品</CommandEmpty>
                        <CommandGroup>
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              value={product.name}
                              onSelect={() => handleAddProduct(product)}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {product.sku} · {formatCurrency(product.base_price)}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Button size="sm" variant="outline" onClick={handleAddEmptyItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  自訂項目
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  尚未新增任何產品
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">產品</TableHead>
                        <TableHead className="w-[100px]">數量</TableHead>
                        <TableHead className="w-[80px]">單位</TableHead>
                        <TableHead className="w-[120px] text-right">單價</TableHead>
                        <TableHead className="w-[120px] text-right">小計</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.product_name}
                              onChange={(e) => handleUpdateItem(item.id, 'product_name', e.target.value)}
                              placeholder="產品名稱"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.unit}
                              onValueChange={(value) => handleUpdateItem(item.id, 'unit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PRODUCT_UNITS.map((unit) => (
                                  <SelectItem key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => handleUpdateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.unit_price * item.quantity)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={4} className="text-right">小計</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(subtotal)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                      {discountAmount > 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-right text-destructive">折扣</TableCell>
                          <TableCell className="text-right font-medium text-destructive">
                            -{formatCurrency(discountAmount)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell colSpan={4} className="text-right">
                          稅額 ({taxRate}%)
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(taxAmount)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={4} className="text-right text-lg font-bold">總計</TableCell>
                        <TableCell className="text-right text-lg font-bold">
                          {formatCurrency(totalAmount)}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>備註</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">給客戶的備註</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="會顯示在報價單上..."
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="internal_notes">內部備註</Label>
                <Textarea
                  id="internal_notes"
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  placeholder="僅內部可見..."
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quote Settings */}
          <Card>
            <CardHeader>
              <CardTitle>報價設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="currency">幣別</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="currency" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="valid_until">有效期限</Label>
                <Input
                  id="valid_until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tax_rate">稅率 (%)</Label>
                <Input
                  id="tax_rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="discount">整單折扣</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardHeader>
              <CardTitle>條款</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payment_terms">付款條件</Label>
                <Input
                  id="payment_terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="如：月結 30 天"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="delivery_terms">交貨條件</Label>
                <Input
                  id="delivery_terms"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder="如：確認後 7 天內交貨"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary & Submit */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">小計</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>折扣</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">稅額</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>總計</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? '建立中...' : '建立報價單'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
