'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Plus, Trash2, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { getQuote, updateQuote } from '@/actions/quotes'
import { getProducts } from '@/actions/products'
import { CURRENCIES, DEFAULT_TAX_RATE } from '@/config/constants'
import type { QuoteWithRelations, Product, QuoteItemFormData, Currency } from '@/types'

const quoteSchema = z.object({
  valid_until: z.string().optional(),
  payment_terms: z.string().optional(),
  delivery_terms: z.string().optional(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  tax_rate: z.number().min(0).max(1),
  discount_amount: z.number().min(0),
  currency: z.string(),
})

type QuoteFormValues = z.infer<typeof quoteSchema>

interface QuoteItem extends QuoteItemFormData {
  id?: string
}

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [quote, setQuote] = useState<QuoteWithRelations | null>(null)
  const [items, setItems] = useState<QuoteItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      tax_rate: DEFAULT_TAX_RATE,
      discount_amount: 0,
      currency: 'TWD',
    },
  })

  const taxRate = watch('tax_rate')
  const discountAmount = watch('discount_amount')
  const currency = watch('currency')

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const [quoteResult, productsResult] = await Promise.all([
        getQuote(resolvedParams.id),
        getProducts(),
      ])

      if (quoteResult.data) {
        setQuote(quoteResult.data)
        setValue('valid_until', quoteResult.data.valid_until || '')
        setValue('payment_terms', quoteResult.data.payment_terms || '')
        setValue('delivery_terms', quoteResult.data.delivery_terms || '')
        setValue('notes', quoteResult.data.notes || '')
        setValue('internal_notes', quoteResult.data.internal_notes || '')
        setValue('tax_rate', quoteResult.data.tax_rate || DEFAULT_TAX_RATE)
        setValue('discount_amount', quoteResult.data.discount_amount || 0)
        setValue('currency', quoteResult.data.currency || 'TWD')

        if (quoteResult.data.items) {
          setItems(
            quoteResult.data.items.map((item) => ({
              id: item.id,
              product_id: item.product_id,
              product_name: item.product_name,
              product_sku: item.product_sku,
              product_description: item.product_description,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price,
              original_price: item.original_price,
              notes: item.notes,
            }))
          )
        }
      } else {
        toast({ title: '載入失敗', description: quoteResult.error || '發生錯誤', variant: 'destructive' })
        router.push('/quotes')
      }

      if (productsResult.data) {
        setProducts(productsResult.data)
      }
      setIsLoading(false)
    }

    loadData()
  }, [resolvedParams.id, router, setValue, toast])

  const getCurrencySymbol = () => {
    return CURRENCIES.find((c) => c.value === currency)?.symbol || 'NT$'
  }

  const formatCurrency = (amount: number) => {
    return `${getCurrencySymbol()}${new Intl.NumberFormat('zh-TW').format(Math.round(amount))}`
  }

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const taxAmount = (subtotal - discountAmount) * taxRate
  const totalAmount = subtotal - discountAmount + taxAmount

  const handleAddProduct = (product: Product) => {
    const newItem: QuoteItem = {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      product_description: product.description,
      quantity: 1,
      unit: product.unit || '件',
      unit_price: product.base_price,
      original_price: product.base_price,
    }
    setItems([...items, newItem])
    setShowProductDialog(false)
    setProductSearch('')
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleUpdateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const onSubmit = async (data: QuoteFormValues) => {
    if (items.length === 0) {
      toast({ title: '請至少新增一個產品項目', variant: 'destructive' })
      return
    }

    setIsSaving(true)

    const result = await updateQuote(
      resolvedParams.id,
      {
        valid_until: data.valid_until || null,
        payment_terms: data.payment_terms || null,
        delivery_terms: data.delivery_terms || null,
        notes: data.notes || null,
        internal_notes: data.internal_notes || null,
        tax_rate: data.tax_rate,
        discount_amount: data.discount_amount,
        currency: data.currency as Currency,
      },
      items
    )

    if (result.error) {
      toast({ title: '更新失敗', description: result.error, variant: 'destructive' })
    } else {
      toast({ title: '更新成功', description: '報價單已更新' })
      router.push(`/quotes/${resolvedParams.id}`)
    }

    setIsSaving(false)
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    )
  }

  if (!quote) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">編輯報價單</h1>
          <p className="text-muted-foreground">{quote.quote_number}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>報價項目</CardTitle>
                <Button type="button" onClick={() => setShowProductDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  新增產品
                </Button>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    尚無產品項目，點擊「新增產品」開始
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>產品</TableHead>
                          <TableHead className="w-[100px]">數量</TableHead>
                          <TableHead className="w-[120px]">單價</TableHead>
                          <TableHead className="w-[120px] text-right">小計</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <div className="font-medium">{item.product_name}</div>
                              {item.product_sku && (
                                <div className="text-sm text-muted-foreground">
                                  {item.product_sku}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)
                                }
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) =>
                                  handleUpdateItem(
                                    index,
                                    'unit_price',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-28"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.unit_price * item.quantity)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right">
                            小計
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right text-destructive">
                            折扣
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            -{formatCurrency(discountAmount)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={3} className="text-right">
                            稅額 ({(taxRate * 100).toFixed(0)}%)
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(taxAmount)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/5">
                          <TableCell colSpan={3} className="text-right text-lg font-bold">
                            總計
                          </TableCell>
                          <TableCell className="text-right text-lg font-bold text-primary">
                            {formatCurrency(totalAmount)}
                          </TableCell>
                          <TableCell></TableCell>
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
                <CardTitle>備註與條款</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_terms">付款條件</Label>
                  <Textarea
                    id="payment_terms"
                    {...register('payment_terms')}
                    placeholder="例如: 訂單確認後 30 天內付款"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_terms">交貨條件</Label>
                  <Textarea
                    id="delivery_terms"
                    {...register('delivery_terms')}
                    placeholder="例如: 工廠交貨 (EXW)"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">給客戶的備註</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="此備註會顯示在報價單上..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internal_notes">內部備註</Label>
                  <Textarea
                    id="internal_notes"
                    {...register('internal_notes')}
                    placeholder="內部備註，客戶看不到..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>報價設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="valid_until">有效期限</Label>
                  <Input id="valid_until" type="date" {...register('valid_until')} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">幣別</Label>
                  <Select value={currency} onValueChange={(value) => setValue('currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.symbol} {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax_rate">稅率 (%)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={(taxRate * 100).toFixed(0)}
                    onChange={(e) => setValue('tax_rate', (parseFloat(e.target.value) || 0) / 100)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_amount">折扣金額</Label>
                  <Input
                    id="discount_amount"
                    type="number"
                    min="0"
                    {...register('discount_amount', { valueAsNumber: true })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.back()}
              >
                取消
              </Button>
              <Button type="submit" className="flex-1" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? '儲存中...' : '儲存變更'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>選擇產品</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜尋產品..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">找不到產品</div>
              ) : (
                <div className="space-y-2">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => handleAddProduct(product)}
                    >
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {product.sku} · {getCurrencySymbol()}
                          {product.base_price.toLocaleString()}
                        </div>
                      </div>
                      <Button type="button" size="sm">
                        新增
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
