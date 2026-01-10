'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Package,
  BarChart3,
  PieChart,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getAnalyticsOverview,
  getMonthlyTrend,
  getTopProducts,
  getTopCustomers,
  getStatusDistribution,
  type AnalyticsOverview,
  type MonthlyData,
  type TopProduct,
  type TopCustomer,
} from '@/actions/analytics'
import { QUOTE_STATUSES } from '@/config/constants'

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [statusData, setStatusData] = useState<{ status: string; count: number; amount: number }[]>(
    []
  )
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      const [overviewResult, monthlyResult, productsResult, customersResult, statusResult] =
        await Promise.all([
          getAnalyticsOverview(),
          getMonthlyTrend(6),
          getTopProducts(10),
          getTopCustomers(10),
          getStatusDistribution(),
        ])

      if (overviewResult.data) setOverview(overviewResult.data)
      if (monthlyResult.data) setMonthlyData(monthlyResult.data)
      if (productsResult.data) setTopProducts(productsResult.data)
      if (customersResult.data) setTopCustomers(customersResult.data)
      if (statusResult.data) setStatusData(statusResult.data)
      setIsLoading(false)
    }

    loadData()
  }, [])

  const formatCurrency = (amount: number) => {
    return `NT$${new Intl.NumberFormat('zh-TW').format(Math.round(amount))}`
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getStatusLabel = (status: string) => {
    return QUOTE_STATUSES.find((s) => s.value === status)?.label || status
  }

  const getStatusColor = (status: string) => {
    return QUOTE_STATUSES.find((s) => s.value === status)?.color || 'bg-gray-500'
  }

  const getMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-')
    return `${month}月`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">載入分析資料中...</div>
      </div>
    )
  }

  const totalStatusCount = statusData.reduce((sum, s) => sum + s.count, 0)
  const maxMonthlyAmount = Math.max(...monthlyData.map((m) => m.amount), 1)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">銷售分析</h1>
        <p className="text-muted-foreground">報價單成交率與銷售趨勢分析</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">總報價金額</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview?.totalAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              共 {overview?.totalQuotes || 0} 張報價單
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">成交金額</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(overview?.acceptedAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              共 {overview?.acceptedQuotes || 0} 張成交
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">成交率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercent(overview?.conversionRate || 0)}
            </div>
            <Progress value={overview?.conversionRate || 0} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">平均成交金額</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(overview?.averageDealSize || 0)}
            </div>
            <p className="text-xs text-muted-foreground">每張成交報價單</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">待處理報價單</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.pendingQuotes || 0}</div>
            <p className="text-xs text-muted-foreground">草稿 / 待審批 / 已發送</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">已過期報價單</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overview?.expiredQuotes || 0}</div>
            <p className="text-xs text-muted-foreground">已發送但已過期</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">
            <BarChart3 className="h-4 w-4 mr-2" />
            月度趨勢
          </TabsTrigger>
          <TabsTrigger value="status">
            <PieChart className="h-4 w-4 mr-2" />
            狀態分布
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            產品排行
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="h-4 w-4 mr-2" />
            客戶排行
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trend">
          <Card>
            <CardHeader>
              <CardTitle>月度報價趨勢</CardTitle>
              <CardDescription>近 6 個月報價金額與成交金額</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">尚無資料</div>
              ) : (
                <div className="space-y-4">
                  {monthlyData.map((month) => (
                    <div key={month.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{getMonthLabel(month.month)}</span>
                        <span className="text-muted-foreground">
                          {month.quotes} 張報價 / {month.accepted} 張成交
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-16">報價</span>
                          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${(month.amount / maxMonthlyAmount) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm w-28 text-right">
                            {formatCurrency(month.amount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-16">成交</span>
                          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{
                                width: `${(month.acceptedAmount / maxMonthlyAmount) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm w-28 text-right">
                            {formatCurrency(month.acceptedAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>報價單狀態分布</CardTitle>
              <CardDescription>各狀態的報價單數量與金額</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">尚無資料</div>
              ) : (
                <div className="space-y-4">
                  {statusData.map((item) => (
                    <div key={item.status} className="flex items-center gap-4">
                      <Badge className={`${getStatusColor(item.status)} text-white w-20 justify-center`}>
                        {getStatusLabel(item.status)}
                      </Badge>
                      <div className="flex-1">
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getStatusColor(item.status)} rounded-full`}
                            style={{ width: `${(item.count / totalStatusCount) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right w-32">
                        <p className="font-medium">{item.count} 張</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>產品銷售排行</CardTitle>
              <CardDescription>報價金額最高的產品</CardDescription>
            </CardHeader>
            <CardContent>
              {topProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">尚無資料</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>產品名稱</TableHead>
                        <TableHead className="text-center">報價次數</TableHead>
                        <TableHead className="text-center">總數量</TableHead>
                        <TableHead className="text-right">總金額</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((product, index) => (
                        <TableRow key={product.product_name}>
                          <TableCell>
                            {index < 3 ? (
                              <Badge
                                variant={index === 0 ? 'default' : 'secondary'}
                                className={index === 0 ? 'bg-yellow-500' : ''}
                              >
                                {index + 1}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{product.product_name}</TableCell>
                          <TableCell className="text-center">{product.quote_count}</TableCell>
                          <TableCell className="text-center">{product.quantity}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(product.total_amount)}
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

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>客戶貢獻排行</CardTitle>
              <CardDescription>報價金額最高的客戶</CardDescription>
            </CardHeader>
            <CardContent>
              {topCustomers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">尚無資料</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>客戶名稱</TableHead>
                        <TableHead className="text-center">報價次數</TableHead>
                        <TableHead className="text-center">成交次數</TableHead>
                        <TableHead className="text-right">總金額</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomers.map((customer, index) => (
                        <TableRow key={customer.company_name}>
                          <TableCell>
                            {index < 3 ? (
                              <Badge
                                variant={index === 0 ? 'default' : 'secondary'}
                                className={index === 0 ? 'bg-yellow-500' : ''}
                              >
                                {index + 1}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">{index + 1}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{customer.company_name}</TableCell>
                          <TableCell className="text-center">{customer.quote_count}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-green-600">
                              {customer.accepted_count}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(customer.total_amount)}
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
    </div>
  )
}
