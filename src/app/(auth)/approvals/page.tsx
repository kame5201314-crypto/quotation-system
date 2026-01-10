'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  getPendingApprovals,
  getApprovalHistory,
  getApprovalStats,
  approveQuote,
  rejectQuote,
} from '@/actions/approvals'
import type { QuoteWithRelations } from '@/types'

export default function ApprovalsPage() {
  const [pendingQuotes, setPendingQuotes] = useState<QuoteWithRelations[]>([])
  const [historyQuotes, setHistoryQuotes] = useState<QuoteWithRelations[]>([])
  const [stats, setStats] = useState<{
    pending: number
    approvedToday: number
    rejectedToday: number
    averageTime: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQuote, setSelectedQuote] = useState<QuoteWithRelations | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const loadData = async () => {
    setIsLoading(true)
    const [pendingResult, historyResult, statsResult] = await Promise.all([
      getPendingApprovals(),
      getApprovalHistory(),
      getApprovalStats(),
    ])

    if (pendingResult.data) setPendingQuotes(pendingResult.data)
    if (historyResult.data) setHistoryQuotes(historyResult.data)
    if (statsResult.data) setStats(statsResult.data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleApprove = async () => {
    if (!selectedQuote) return
    setIsSubmitting(true)

    const result = await approveQuote(selectedQuote.id, approvalNotes)
    if (result.success) {
      toast({ title: '已核准', description: `報價單 ${selectedQuote.quote_number} 已核准` })
      setShowApproveDialog(false)
      setApprovalNotes('')
      loadData()
    } else {
      toast({ title: '核准失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
    setIsSubmitting(false)
  }

  const handleReject = async () => {
    if (!selectedQuote || !rejectReason.trim()) {
      toast({ title: '請輸入駁回原因', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)

    const result = await rejectQuote(selectedQuote.id, rejectReason)
    if (result.success) {
      toast({ title: '已駁回', description: `報價單 ${selectedQuote.quote_number} 已駁回` })
      setShowRejectDialog(false)
      setRejectReason('')
      loadData()
    } else {
      toast({ title: '駁回失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
    setIsSubmitting(false)
  }

  const formatCurrency = (amount: number, currency: string = 'TWD') => {
    const symbol = currency === 'USD' ? '$' : currency === 'CNY' ? '¥' : 'NT$'
    return `${symbol}${new Intl.NumberFormat('zh-TW').format(amount)}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-TW')
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-TW')
  }

  const getTimeSinceCreated = (dateStr: string) => {
    const created = new Date(dateStr)
    const now = new Date()
    const hours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60))
    if (hours < 1) return '剛剛'
    if (hours < 24) return `${hours} 小時前`
    const days = Math.floor(hours / 24)
    return `${days} 天前`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">審批中心</h1>
        <p className="text-muted-foreground">審核報價單，確保定價合規</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">待審批</p>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">今日核准</p>
                <p className="text-2xl font-bold">{stats?.approvedToday || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">今日駁回</p>
                <p className="text-2xl font-bold">{stats?.rejectedToday || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">平均處理時間</p>
                <p className="text-2xl font-bold">
                  {stats?.averageTime ? `${stats.averageTime}h` : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            待審批
            {(stats?.pending || 0) > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats?.pending}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">審批歷史</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>待審批報價單</CardTitle>
              <CardDescription>以下報價單需要您的審核</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              ) : pendingQuotes.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <p className="text-lg font-medium">沒有待審批的報價單</p>
                  <p className="text-muted-foreground">所有報價單都已處理完成</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>報價單號</TableHead>
                        <TableHead>客戶</TableHead>
                        <TableHead className="text-right">金額</TableHead>
                        <TableHead>提交時間</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingQuotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{quote.quote_number}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{quote.customer?.company_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {quote.customer?.contact_name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <p className="font-bold text-lg">
                                {formatCurrency(quote.total_amount, quote.currency)}
                              </p>
                              {quote.total_amount > 100000 && (
                                <Badge variant="outline" className="text-orange-600">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  高額
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{formatDate(quote.created_at)}</p>
                              <p className="text-sm text-muted-foreground">
                                {getTimeSinceCreated(quote.created_at)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/quotes/${quote.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  查看
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedQuote(quote)
                                  setShowApproveDialog(true)
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                核准
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedQuote(quote)
                                  setShowRejectDialog(true)
                                }}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                駁回
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>審批歷史</CardTitle>
              <CardDescription>最近 50 筆審批記錄</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              ) : historyQuotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  尚無審批歷史記錄
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>報價單號</TableHead>
                        <TableHead>客戶</TableHead>
                        <TableHead className="text-right">金額</TableHead>
                        <TableHead>審批結果</TableHead>
                        <TableHead>審批時間</TableHead>
                        <TableHead>備註</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historyQuotes.map((quote) => (
                        <TableRow key={quote.id}>
                          <TableCell>
                            <Link
                              href={`/quotes/${quote.id}`}
                              className="font-medium hover:underline"
                            >
                              {quote.quote_number}
                            </Link>
                          </TableCell>
                          <TableCell>{quote.customer?.company_name}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(quote.total_amount, quote.currency)}
                          </TableCell>
                          <TableCell>
                            {quote.status === 'approved' ? (
                              <Badge className="bg-green-500">已核准</Badge>
                            ) : (
                              <Badge variant="destructive">已駁回</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDateTime(quote.approved_at)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {quote.approval_notes || '-'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>核准報價單</DialogTitle>
            <DialogDescription>
              確認核准 {selectedQuote?.quote_number}，金額{' '}
              {selectedQuote && formatCurrency(selectedQuote.total_amount, selectedQuote.currency)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">審批備註（選填）</label>
              <Textarea
                placeholder="輸入備註..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? '處理中...' : '確認核准'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>駁回報價單</DialogTitle>
            <DialogDescription>
              請說明駁回原因，報價單將退回草稿狀態
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">駁回原因 *</label>
              <Textarea
                placeholder="請輸入駁回原因..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSubmitting || !rejectReason.trim()}
              variant="destructive"
            >
              {isSubmitting ? '處理中...' : '確認駁回'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
