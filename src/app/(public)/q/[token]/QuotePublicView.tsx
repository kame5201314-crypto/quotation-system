'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Building, User, Mail, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { QUOTE_STATUSES, CURRENCIES } from '@/config/constants'
import { acceptQuoteByToken, rejectQuoteByToken } from '@/actions/customer-response'
import type { QuoteWithRelations } from '@/types'

interface QuotePublicViewProps {
  quote: QuoteWithRelations
  token: string
}

export function QuotePublicView({ quote, token }: QuotePublicViewProps) {
  const router = useRouter()
  const [showAcceptDialog, setShowAcceptDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getStatusConfig = (status: string) => {
    return QUOTE_STATUSES.find((s) => s.value === status) || QUOTE_STATUSES[0]
  }

  const getCurrencySymbol = (currency: string) => {
    return CURRENCIES.find((c) => c.value === currency)?.symbol || 'NT$'
  }

  const formatCurrency = (amount: number) => {
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

  const statusConfig = getStatusConfig(quote.status)

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date()
  const canRespond = quote.status === 'sent' && !isExpired

  const handleAccept = async () => {
    setIsSubmitting(true)
    setError(null)

    const result = await acceptQuoteByToken(token)

    if (result.success) {
      setShowAcceptDialog(false)
      router.refresh()
    } else {
      setError(result.error || '發生錯誤')
    }

    setIsSubmitting(false)
  }

  const handleReject = async () => {
    setIsSubmitting(true)
    setError(null)

    const result = await rejectQuoteByToken(token, rejectReason)

    if (result.success) {
      setShowRejectDialog(false)
      router.refresh()
    } else {
      setError(result.error || '發生錯誤')
    }

    setIsSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">報價單</h1>
                <p className="text-sm text-muted-foreground">{quote.quote_number}</p>
              </div>
            </div>
            <Badge className={`${statusConfig.color} text-white`}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Expired Warning */}
        {isExpired && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700">
              <Clock className="h-5 w-5" />
              <span className="font-medium">此報價單已過期</span>
            </div>
            <p className="text-sm text-orange-600 mt-1">
              有效期限：{formatDate(quote.valid_until)}
            </p>
          </div>
        )}

        {/* Accept/Reject Buttons */}
        {canRespond && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 mb-4">
              請確認報價內容後，選擇接受或拒絕此報價單。
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setShowAcceptDialog(true)} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="mr-2 h-4 w-4" />
                接受報價
              </Button>
              <Button variant="outline" onClick={() => setShowRejectDialog(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                拒絕報價
              </Button>
            </div>
          </div>
        )}

        {/* Already Responded */}
        {quote.status === 'accepted' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">您已接受此報價單</span>
            </div>
            {quote.accepted_at && (
              <p className="text-sm text-green-600 mt-1">
                接受時間：{new Date(quote.accepted_at).toLocaleString('zh-TW')}
              </p>
            )}
          </div>
        )}

        {quote.status === 'rejected' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span className="font-medium">此報價單已被拒絕</span>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          {/* Summary Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-muted-foreground mb-2">報價資訊</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">報價單號</span>
                      <span className="font-medium">{quote.quote_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">開立日期</span>
                      <span>{formatDate(quote.issue_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">有效期限</span>
                      <span className={isExpired ? 'text-orange-600' : ''}>
                        {formatDate(quote.valid_until)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-muted-foreground mb-2">客戶資訊</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{quote.customer?.company_name}</span>
                    </div>
                    {quote.customer?.contact_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{quote.customer.contact_name}</span>
                      </div>
                    )}
                    {quote.customer?.contact_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{quote.customer.contact_email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader>
              <CardTitle>報價明細</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>產品 / 服務</TableHead>
                      <TableHead className="w-[100px] text-center">數量</TableHead>
                      <TableHead className="w-[120px] text-right">單價</TableHead>
                      <TableHead className="w-[120px] text-right">小計</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quote.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="font-medium">{item.product_name}</div>
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
                      <TableCell colSpan={3} className="text-right">小計</TableCell>
                      <TableCell className="text-right">{formatCurrency(quote.subtotal)}</TableCell>
                    </TableRow>
                    {quote.discount_amount > 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-right text-destructive">折扣</TableCell>
                        <TableCell className="text-right text-destructive">
                          -{formatCurrency(quote.discount_amount)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow>
                      <TableCell colSpan={3} className="text-right">
                        稅額 ({(quote.tax_rate * 100).toFixed(0)}%)
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(quote.tax_amount)}</TableCell>
                    </TableRow>
                    <TableRow className="bg-primary/5">
                      <TableCell colSpan={3} className="text-right text-lg font-bold">總計</TableCell>
                      <TableCell className="text-right text-lg font-bold text-primary">
                        {formatCurrency(quote.total_amount)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          {(quote.payment_terms || quote.delivery_terms || quote.notes) && (
            <Card>
              <CardHeader>
                <CardTitle>條款與備註</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {quote.payment_terms && (
                  <div>
                    <h4 className="font-medium text-muted-foreground mb-1">付款條件</h4>
                    <p>{quote.payment_terms}</p>
                  </div>
                )}
                {quote.delivery_terms && (
                  <div>
                    <h4 className="font-medium text-muted-foreground mb-1">交貨條件</h4>
                    <p>{quote.delivery_terms}</p>
                  </div>
                )}
                {quote.notes && (
                  <div>
                    <h4 className="font-medium text-muted-foreground mb-1">備註</h4>
                    <p className="whitespace-pre-wrap">{quote.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Template Terms */}
          {quote.template?.terms_content && (
            <Card>
              <CardHeader>
                <CardTitle>標準條款</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {quote.template.terms_content}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          此報價單由報價單管理系統產生
        </div>
      </footer>

      {/* Accept Dialog */}
      <AlertDialog open={showAcceptDialog} onOpenChange={setShowAcceptDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認接受報價</AlertDialogTitle>
            <AlertDialogDescription>
              您即將接受此報價單，總金額為 {formatCurrency(quote.total_amount)}。
              確認後將通知供應商。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAccept}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? '處理中...' : '確認接受'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>拒絕報價</AlertDialogTitle>
            <AlertDialogDescription>
              請說明拒絕原因（選填），供應商將收到通知。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="拒絕原因..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? '處理中...' : '確認拒絕'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
