import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  FileText,
  Users,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { getAnalyticsOverview } from '@/actions/analytics'
import { getQuotes } from '@/actions/quotes'
import { QUOTE_STATUSES } from '@/config/constants'

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-gray-100 text-gray-700' },
  pending_approval: { label: '待審批', className: 'bg-yellow-100 text-yellow-700' },
  approved: { label: '已核准', className: 'bg-purple-100 text-purple-700' },
  sent: { label: '已發送', className: 'bg-blue-100 text-blue-700' },
  accepted: { label: '已成交', className: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒絕', className: 'bg-red-100 text-red-700' },
  expired: { label: '已過期', className: 'bg-gray-100 text-gray-600' },
}

export default async function DashboardPage() {
  const [analyticsResult, quotesResult] = await Promise.all([
    getAnalyticsOverview(),
    getQuotes(),
  ])

  const analytics = analyticsResult.data
  const quotes = quotesResult.data || []

  // Calculate this month's quotes
  const now = new Date()
  const thisMonth = quotes.filter((q) => {
    const createdAt = new Date(q.created_at)
    return (
      createdAt.getMonth() === now.getMonth() &&
      createdAt.getFullYear() === now.getFullYear()
    )
  })

  // Get pending approvals count
  const pendingApprovals = quotes.filter((q) => q.status === 'pending_approval')

  // Get expiring quotes (within 7 days)
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const expiringQuotes = quotes.filter((q) => {
    if (!q.valid_until || q.status !== 'sent') return false
    const validUntil = new Date(q.valid_until)
    return validUntil > now && validUntil <= sevenDaysFromNow
  })

  // Recent quotes (last 5)
  const recentQuotes = quotes
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const stats = [
    {
      name: '本月報價單',
      value: thisMonth.length.toString(),
      change: `共 ${quotes.length} 份`,
      changeType: 'neutral' as const,
      icon: FileText,
    },
    {
      name: '待審批',
      value: pendingApprovals.length.toString(),
      change: pendingApprovals.length > 0 ? '需處理' : '已處理完畢',
      changeType: pendingApprovals.length > 0 ? 'warning' : 'positive' as const,
      icon: Clock,
    },
    {
      name: '成交率',
      value: `${analytics?.conversionRate.toFixed(1) || 0}%`,
      change: `${analytics?.acceptedQuotes || 0} 份成交`,
      changeType: 'positive' as const,
      icon: TrendingUp,
    },
    {
      name: '成交金額',
      value: formatCurrency(analytics?.acceptedAmount || 0),
      change: `平均 ${formatCurrency(analytics?.averageDealSize || 0)}`,
      changeType: 'positive' as const,
      icon: DollarSign,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">儀表板</h1>
          <p className="text-muted-foreground">歡迎回來，這是您的業務概況</p>
        </div>
        <Link href="/quotes/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新建報價單
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.changeType === 'positive' ? 'text-green-600' :
                stat.changeType === 'warning' ? 'text-yellow-600' :
                'text-muted-foreground'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近報價單</CardTitle>
            <Link href="/quotes">
              <Button variant="ghost" size="sm">
                查看全部
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentQuotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  尚無報價單
                </p>
              ) : (
                recentQuotes.map((quote) => (
                  <Link
                    key={quote.id}
                    href={`/quotes/${quote.id}`}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-accent/50 -mx-2 px-2 py-1 rounded transition-colors"
                  >
                    <div>
                      <div className="font-medium">{quote.quote_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {(quote.customer as { company_name?: string })?.company_name || '未指定客戶'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(quote.total_amount || 0)}
                      </div>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${statusConfig[quote.status]?.className || ''}`}>
                        {statusConfig[quote.status]?.label || quote.status}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Link href="/quotes/new">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  建立新報價單
                </Button>
              </Link>
              <Link href="/customers">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  新增客戶
                </Button>
              </Link>
              <Link href="/products">
                <Button variant="outline" className="w-full justify-start">
                  <Package className="mr-2 h-4 w-4" />
                  管理產品
                </Button>
              </Link>
              <Link href="/analytics">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  查看分析報表
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Pending Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              待處理事項
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingApprovals.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div className="flex-1">
                    <div className="font-medium">{pendingApprovals.length} 份報價單待審批</div>
                    <div className="text-sm text-muted-foreground">需要主管核准</div>
                  </div>
                  <Link href="/approvals">
                    <Button size="sm">處理</Button>
                  </Link>
                </div>
              )}
              {expiringQuotes.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  <div className="flex-1">
                    <div className="font-medium">{expiringQuotes.length} 份報價單即將到期</div>
                    <div className="text-sm text-muted-foreground">7 天內到期</div>
                  </div>
                  <Link href="/quotes">
                    <Button size="sm" variant="outline">查看</Button>
                  </Link>
                </div>
              )}
              {pendingApprovals.length === 0 && expiringQuotes.length === 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <div className="font-medium text-green-700">目前沒有待處理事項</div>
                    <div className="text-sm text-green-600">所有工作已完成</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              業績概覽
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">總報價金額</span>
                  <span className="text-sm font-medium">{formatCurrency(analytics?.totalAmount || 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: analytics?.totalAmount ? '100%' : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">成交金額</span>
                  <span className="text-sm font-medium">{formatCurrency(analytics?.acceptedAmount || 0)}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{
                      width: analytics?.totalAmount
                        ? `${((analytics?.acceptedAmount || 0) / analytics.totalAmount) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">待處理報價</span>
                  <span className="text-sm font-medium">{analytics?.pendingQuotes || 0} 份</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-yellow-500"
                    style={{
                      width: analytics?.totalQuotes
                        ? `${((analytics?.pendingQuotes || 0) / analytics.totalQuotes) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
