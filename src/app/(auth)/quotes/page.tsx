'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { QuotesTable } from '@/components/quotes'
import {
  getQuotes,
  deleteQuote,
  duplicateQuote,
  updateQuoteStatus,
} from '@/actions/quotes'
import { toast } from 'sonner'
import { QUOTE_STATUSES } from '@/config/constants'
import type { QuoteWithRelations } from '@/types'

function QuotesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [quotes, setQuotes] = useState<QuoteWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters from URL
  const customerId = searchParams.get('customer_id')
  const statusFilter = searchParams.get('status')

  // Local filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [localStatusFilter, setLocalStatusFilter] = useState<string>(statusFilter || '')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getQuotes({
        search: searchQuery || undefined,
        status: localStatusFilter as import('@/types').QuoteStatus || undefined,
        customer_id: customerId || undefined,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        setQuotes(result.data || [])
      }
    } catch {
      toast.error('載入資料失敗')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, localStatusFilter, customerId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleEdit = (quote: QuoteWithRelations) => {
    router.push(`/quotes/${quote.id}/edit`)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteQuote(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('報價單已刪除')
      loadData()
    }
  }

  const handleDuplicate = async (id: string) => {
    const result = await duplicateQuote(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('報價單已複製')
      if (result.data) {
        router.push(`/quotes/${result.data.id}`)
      }
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    const result = await updateQuoteStatus(id, status)
    if (result.error) {
      toast.error(result.error)
    } else {
      const statusLabel = QUOTE_STATUSES.find((s) => s.value === status)?.label
      toast.success(`報價單狀態已更新為「${statusLabel}」`)
      loadData()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">報價單管理</h1>
          <p className="text-muted-foreground">建立、追蹤和管理您的報價單</p>
        </div>
        <Link href="/quotes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建報價單
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋報價單號..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={localStatusFilter} onValueChange={setLocalStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="所有狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">所有狀態</SelectItem>
            {QUOTE_STATUSES.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customer filter indicator */}
      {customerId && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>已篩選特定客戶的報價單</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/quotes')}
          >
            清除篩選
          </Button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">全部</div>
          <div className="text-2xl font-bold">{quotes.length}</div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">草稿</div>
          <div className="text-2xl font-bold">
            {quotes.filter((q) => q.status === 'draft').length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">已發送</div>
          <div className="text-2xl font-bold">
            {quotes.filter((q) => q.status === 'sent').length}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="text-sm font-medium text-muted-foreground">已成交</div>
          <div className="text-2xl font-bold text-green-600">
            {quotes.filter((q) => q.status === 'accepted').length}
          </div>
        </div>
      </div>

      {/* Quotes Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : (
        <QuotesTable
          quotes={quotes}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </div>
  )
}

export default function QuotesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">載入中...</div>}>
      <QuotesContent />
    </Suspense>
  )
}
