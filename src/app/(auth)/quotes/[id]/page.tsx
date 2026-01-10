'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Pencil,
  Copy,
  Send,
  CheckCircle,
  XCircle,
  ExternalLink,
  Printer,
  Clock,
  User,
  Building,
  Mail,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  getQuote,
  updateQuoteStatus,
  duplicateQuote,
  deleteQuote,
  submitForApproval,
  sendToCustomer,
} from '@/actions/quotes'
import { QUOTE_STATUSES, CURRENCIES } from '@/config/constants'
import { downloadQuotePDF } from '@/components/quotes/QuotePDF'
import { QuoteComments } from '@/components/quotes/QuoteComments'
import type { QuoteWithRelations } from '@/types'

export default function QuoteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [quote, setQuote] = useState<QuoteWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const quoteId = params.id as string

  useEffect(() => {
    const loadQuote = async () => {
      setIsLoading(true)
      const result = await getQuote(quoteId)
      if (result.error) {
        toast.error(result.error)
        router.push('/quotes')
      } else {
        setQuote(result.data)
      }
      setIsLoading(false)
    }
    loadQuote()
  }, [quoteId, router])

  const getStatusConfig = (status: string) => {
    return QUOTE_STATUSES.find((s) => s.value === status) || QUOTE_STATUSES[0]
  }

  const getCurrencySymbol = (currency: string) => {
    return CURRENCIES.find((c) => c.value === currency)?.symbol || 'NT$'
  }

  const formatCurrency = (amount: number) => {
    if (!quote) return ''
    const symbol = getCurrencySymbol(quote.currency)
    return `${symbol}${new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-TW')
  }

  const handleUpdateStatus = async (status: string) => {
    const result = await updateQuoteStatus(quoteId, status)
    if (result.error) {
      toast.error(result.error)
    } else {
      const statusLabel = QUOTE_STATUSES.find((s) => s.value === status)?.label
      toast.success(`報價單狀態已更新為「${statusLabel}」`)
      // Reload quote
      const reloadResult = await getQuote(quoteId)
      if (reloadResult.data) setQuote(reloadResult.data)
    }
  }

  const handleSubmitForApproval = async () => {
    const result = await submitForApproval(quoteId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('報價單已提交審批')
      const reloadResult = await getQuote(quoteId)
      if (reloadResult.data) setQuote(reloadResult.data)
    }
  }

  const handleSendToCustomer = async () => {
    const result = await sendToCustomer(quoteId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('報價單已發送給客戶')
      if (result.shareUrl) {
        const fullUrl = `${window.location.origin}${result.shareUrl}`
        navigator.clipboard.writeText(fullUrl)
        toast.info('分享連結已複製到剪貼簿')
      }
      const reloadResult = await getQuote(quoteId)
      if (reloadResult.data) setQuote(reloadResult.data)
    }
  }

  const handleDuplicate = async () => {
    const result = await duplicateQuote(quoteId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('報價單已複製')
      if (result.data) {
        router.push(`/quotes/${result.data.id}`)
      }
    }
  }

  const handleDelete = async () => {
    const result = await deleteQuote(quoteId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('報價單已刪除')
      router.push('/quotes')
    }
  }

  const copyShareLink = () => {
    if (quote?.share_token) {
      const url = `${window.location.origin}/q/${quote.share_token}`
      navigator.clipboard.writeText(url)
      toast.success('分享連結已複製到剪貼簿')
    }
  }

  const handleDownloadPDF = () => {
    if (quote) {
      downloadQuotePDF(quote)
      toast.success('PDF 下載中...')
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">載入中...</div>
    )
  }

  if (!quote) {
    return (
      <div className="text-center py-12 text-muted-foreground">找不到報價單</div>
    )
  }

  const statusConfig = getStatusConfig(quote.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{quote.quote_number}</h1>
              <Badge className={`${statusConfig.color} text-white`}>
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              開立日期：{formatDate(quote.issue_date)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {quote.status === 'draft' && (
            <>
              <Link href={`/quotes/${quote.id}/edit`}>
                <Button variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  編輯
                </Button>
              </Link>
              <Button onClick={handleSubmitForApproval}>
                <Send className="mr-2 h-4 w-4" />
                提交審批
              </Button>
            </>
          )}

          {quote.status === 'pending_approval' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('approved')}
              >
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                核准
              </Button>
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('draft')}
              >
                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                駁回
              </Button>
            </>
          )}

          {quote.status === 'approved' && (
            <Button onClick={handleSendToCustomer}>
              <Send className="mr-2 h-4 w-4" />
              發送給客戶
            </Button>
          )}

          {quote.status === 'sent' && (
            <>
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('accepted')}
              >
                <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                標記成交
              </Button>
              <Button
                variant="outline"
                onClick={() => handleUpdateStatus('rejected')}
              >
                <XCircle className="mr-2 h-4 w-4 text-red-600" />
                標記拒絕
              </Button>
            </>
          )}

          <Button variant="outline" onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            複製
          </Button>

          {['approved', 'sent'].includes(quote.status) && (
            <Button variant="outline" onClick={copyShareLink}>
              <ExternalLink className="mr-2 h-4 w-4" />
              分享連結
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                客戶資訊
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-lg font-semibold">
                    {quote.customer?.company_name}
                  </div>
                  {quote.customer?.contact_name && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <User className="h-4 w-4" />
                      {quote.customer.contact_name}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {quote.customer?.contact_email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {quote.customer.contact_email}
                    </div>
                  )}
                  {quote.customer?.contact_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      {quote.customer.contact_phone}
                    </div>
                  )}
                  {quote.customer?.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {quote.customer.address}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                報價明細
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>產品</TableHead>
                      <TableHead className="w-[100px] text-center">數量</TableHead>
                      <TableHead className="w-[100px] text-right">單價</TableHead>
                      <TableHead className="w-[120px] text-right">小計</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quote.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product_name}</div>
                          {item.product_sku && (
                            <div className="text-sm text-muted-foreground">
                              {item.product_sku}
                            </div>
                          )}
                          {item.product_description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {item.product_description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.line_total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right">
                        小計
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(quote.subtotal)}
                      </TableCell>
                    </TableRow>
                    {quote.discount_amount > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-right text-destructive">
                          折扣
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          -{formatCurrency(quote.discount_amount)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right">
                        稅額 ({(quote.tax_rate * 100).toFixed(0)}%)
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(quote.tax_amount)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right text-lg font-bold">
                        總計
                      </TableCell>
                      <TableCell className="text-right text-lg font-bold">
                        {formatCurrency(quote.total_amount)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {(quote.notes || quote.internal_notes) && (
            <Card>
              <CardHeader>
                <CardTitle>備註</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quote.notes && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      給客戶的備註
                    </div>
                    <div className="whitespace-pre-wrap">{quote.notes}</div>
                  </div>
                )}
                {quote.internal_notes && (
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      內部備註（客戶看不到）
                    </div>
                    <div className="whitespace-pre-wrap bg-muted p-3 rounded-md">
                      {quote.internal_notes}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          <QuoteComments quoteId={quoteId} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quote Summary */}
          <Card>
            <CardHeader>
              <CardTitle>報價摘要</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">狀態</span>
                <Badge className={`${statusConfig.color} text-white`}>
                  {statusConfig.label}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">幣別</span>
                <span>{quote.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">開立日期</span>
                <span>{formatDate(quote.issue_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">有效期限</span>
                <span>{formatDate(quote.valid_until)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>總金額</span>
                <span>{formatCurrency(quote.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <Card>
            <CardHeader>
              <CardTitle>條款</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quote.payment_terms && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">付款條件</div>
                  <div>{quote.payment_terms}</div>
                </div>
              )}
              {quote.delivery_terms && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">交貨條件</div>
                  <div>{quote.delivery_terms}</div>
                </div>
              )}
              {!quote.payment_terms && !quote.delivery_terms && (
                <div className="text-muted-foreground text-sm">尚未設定條款</div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                時間軸
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">建立時間</span>
                  <span>{new Date(quote.created_at).toLocaleString('zh-TW')}</span>
                </div>
                {quote.viewed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">客戶查看</span>
                    <span>{new Date(quote.viewed_at).toLocaleString('zh-TW')}</span>
                  </div>
                )}
                {quote.approved_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">審批時間</span>
                    <span>{new Date(quote.approved_at).toLocaleString('zh-TW')}</span>
                  </div>
                )}
                {quote.accepted_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">成交時間</span>
                    <span>{new Date(quote.accepted_at).toLocaleString('zh-TW')}</span>
                  </div>
                )}
                {quote.signed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">簽核時間</span>
                    <span>{new Date(quote.signed_at).toLocaleString('zh-TW')}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" onClick={copyShareLink}>
                <ExternalLink className="mr-2 h-4 w-4" />
                複製客戶連結
              </Button>
              <Button variant="outline" className="w-full" onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                複製報價單
              </Button>
              <Button variant="outline" className="w-full" onClick={handleDownloadPDF}>
                <Printer className="mr-2 h-4 w-4" />
                下載 PDF
              </Button>
              <Separator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    刪除報價單
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>確定要刪除此報價單？</AlertDialogTitle>
                    <AlertDialogDescription>
                      此操作無法復原。報價單將被永久刪除。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>取消</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      確定刪除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
