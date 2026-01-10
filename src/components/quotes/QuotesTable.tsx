'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Send,
  Eye,
  ExternalLink,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { QUOTE_STATUSES, CURRENCIES } from '@/config/constants'
import type { QuoteWithRelations } from '@/types'

interface QuotesTableProps {
  quotes: QuoteWithRelations[]
  onEdit: (quote: QuoteWithRelations) => void
  onDelete: (id: string) => Promise<void>
  onDuplicate: (id: string) => Promise<void>
  onUpdateStatus: (id: string, status: string) => Promise<void>
}

export function QuotesTable({
  quotes,
  onEdit,
  onDelete,
  onDuplicate,
  onUpdateStatus,
}: QuotesTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const getStatusConfig = (status: string) => {
    return QUOTE_STATUSES.find((s) => s.value === status) || QUOTE_STATUSES[0]
  }

  const getCurrencySymbol = (currency: string) => {
    return CURRENCIES.find((c) => c.value === currency)?.symbol || 'NT$'
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = getCurrencySymbol(currency)
    return `${symbol}${new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-TW')
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await onDelete(deleteId)
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const isExpiringSoon = (validUntil: string | null) => {
    if (!validUntil) return false
    const daysUntilExpiry = Math.ceil(
      (new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiry > 0 && daysUntilExpiry <= 7
  }

  if (quotes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>尚無報價單</p>
        <p className="text-sm mt-1">點擊「新建報價單」開始建立</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">報價單號</TableHead>
              <TableHead>客戶</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead>開立日期</TableHead>
              <TableHead>有效期限</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((quote) => {
              const statusConfig = getStatusConfig(quote.status)
              const expiringSoon = isExpiringSoon(quote.valid_until)

              return (
                <TableRow key={quote.id}>
                  <TableCell className="font-mono text-sm">
                    <Link
                      href={`/quotes/${quote.id}`}
                      className="text-primary hover:underline"
                    >
                      {quote.quote_number}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {quote.customer?.company_name || '-'}
                    </div>
                    {quote.customer?.contact_name && (
                      <div className="text-sm text-muted-foreground">
                        {quote.customer.contact_name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(quote.total_amount, quote.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`${statusConfig.color} text-white`}
                    >
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(quote.issue_date)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {quote.valid_until ? formatDate(quote.valid_until) : '-'}
                      {expiringSoon && (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          即將到期
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">開啟選單</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/quotes/${quote.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            查看
                          </Link>
                        </DropdownMenuItem>
                        {quote.status === 'draft' && (
                          <DropdownMenuItem onClick={() => onEdit(quote)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            編輯
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onDuplicate(quote.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          複製
                        </DropdownMenuItem>

                        {quote.share_token && (
                          <DropdownMenuItem asChild>
                            <Link href={`/q/${quote.share_token}`} target="_blank">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              客戶連結
                            </Link>
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        {quote.status === 'draft' && (
                          <DropdownMenuItem onClick={() => onUpdateStatus(quote.id, 'sent')}>
                            <Send className="mr-2 h-4 w-4" />
                            發送報價單
                          </DropdownMenuItem>
                        )}

                        {quote.status === 'pending_approval' && (
                          <>
                            <DropdownMenuItem onClick={() => onUpdateStatus(quote.id, 'approved')}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              核准
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateStatus(quote.id, 'rejected')}>
                              <XCircle className="mr-2 h-4 w-4 text-red-600" />
                              駁回
                            </DropdownMenuItem>
                          </>
                        )}

                        {quote.status === 'sent' && (
                          <>
                            <DropdownMenuItem onClick={() => onUpdateStatus(quote.id, 'accepted')}>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              標記成交
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onUpdateStatus(quote.id, 'rejected')}>
                              <XCircle className="mr-2 h-4 w-4 text-red-600" />
                              標記拒絕
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(quote.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          刪除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
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
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '刪除中...' : '確定刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
