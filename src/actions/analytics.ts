'use server'

import { createClient } from '@/lib/supabase/server'
import { DEFAULT_ORG_ID } from '@/config/constants'

async function getOrgId(): Promise<string> {
  return DEFAULT_ORG_ID
}

export interface AnalyticsOverview {
  totalQuotes: number
  totalAmount: number
  acceptedQuotes: number
  acceptedAmount: number
  conversionRate: number
  averageDealSize: number
  pendingQuotes: number
  expiredQuotes: number
}

export interface MonthlyData {
  month: string
  quotes: number
  amount: number
  accepted: number
  acceptedAmount: number
}

export interface TopProduct {
  product_name: string
  quantity: number
  total_amount: number
  quote_count: number
}

export interface TopCustomer {
  company_name: string
  quote_count: number
  total_amount: number
  accepted_count: number
}

// Get overall analytics
export async function getAnalyticsOverview(): Promise<{
  data: AnalyticsOverview | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Get all quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, status, total_amount, valid_until')
      .eq('org_id', orgId)
      .eq('is_deleted', false)

    if (!quotes) {
      return {
        data: {
          totalQuotes: 0,
          totalAmount: 0,
          acceptedQuotes: 0,
          acceptedAmount: 0,
          conversionRate: 0,
          averageDealSize: 0,
          pendingQuotes: 0,
          expiredQuotes: 0,
        },
        error: null,
      }
    }

    const now = new Date()
    const totalQuotes = quotes.length
    const totalAmount = quotes.reduce((sum, q) => sum + (q.total_amount || 0), 0)

    const acceptedQuotes = quotes.filter((q) => q.status === 'accepted')
    const acceptedCount = acceptedQuotes.length
    const acceptedAmount = acceptedQuotes.reduce((sum, q) => sum + (q.total_amount || 0), 0)

    const pendingQuotes = quotes.filter(
      (q) => ['draft', 'pending_approval', 'approved', 'sent'].includes(q.status)
    ).length

    const expiredQuotes = quotes.filter(
      (q) => q.valid_until && new Date(q.valid_until) < now && q.status === 'sent'
    ).length

    const sentOrAccepted = quotes.filter((q) =>
      ['sent', 'accepted', 'rejected'].includes(q.status)
    ).length

    const conversionRate = sentOrAccepted > 0 ? (acceptedCount / sentOrAccepted) * 100 : 0
    const averageDealSize = acceptedCount > 0 ? acceptedAmount / acceptedCount : 0

    return {
      data: {
        totalQuotes,
        totalAmount,
        acceptedQuotes: acceptedCount,
        acceptedAmount,
        conversionRate,
        averageDealSize,
        pendingQuotes,
        expiredQuotes,
      },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching analytics overview:', error)
    return { data: null, error: '無法載入分析資料' }
  }
}

// Get monthly trend data
export async function getMonthlyTrend(months: number = 6): Promise<{
  data: MonthlyData[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setMonth(startDate.getMonth() - months + 1)
    startDate.setDate(1)

    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, status, total_amount, created_at')
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .gte('created_at', startDate.toISOString())

    if (!quotes) {
      return { data: [], error: null }
    }

    // Group by month
    const monthlyMap = new Map<string, MonthlyData>()

    for (let i = 0; i < months; i++) {
      const date = new Date(startDate)
      date.setMonth(date.getMonth() + i)
      const monthKey = date.toISOString().slice(0, 7)
      monthlyMap.set(monthKey, {
        month: monthKey,
        quotes: 0,
        amount: 0,
        accepted: 0,
        acceptedAmount: 0,
      })
    }

    quotes.forEach((quote) => {
      const monthKey = quote.created_at.slice(0, 7)
      const entry = monthlyMap.get(monthKey)
      if (entry) {
        entry.quotes++
        entry.amount += quote.total_amount || 0
        if (quote.status === 'accepted') {
          entry.accepted++
          entry.acceptedAmount += quote.total_amount || 0
        }
      }
    })

    return {
      data: Array.from(monthlyMap.values()),
      error: null,
    }
  } catch (error) {
    console.error('Error fetching monthly trend:', error)
    return { data: null, error: '無法載入月度趨勢' }
  }
}

// Get top products
export async function getTopProducts(limit: number = 10): Promise<{
  data: TopProduct[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data: items } = await supabase
      .from('quote_items')
      .select(`
        product_name,
        quantity,
        line_total,
        quote_id
      `)
      .eq('org_id', orgId)
      .eq('is_deleted', false)

    if (!items) {
      return { data: [], error: null }
    }

    // Aggregate by product name
    const productMap = new Map<string, TopProduct>()

    items.forEach((item) => {
      const existing = productMap.get(item.product_name) || {
        product_name: item.product_name,
        quantity: 0,
        total_amount: 0,
        quote_count: 0,
      }

      existing.quantity += item.quantity || 0
      existing.total_amount += item.line_total || 0
      existing.quote_count++

      productMap.set(item.product_name, existing)
    })

    const sorted = Array.from(productMap.values())
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, limit)

    return { data: sorted, error: null }
  } catch (error) {
    console.error('Error fetching top products:', error)
    return { data: null, error: '無法載入產品排行' }
  }
}

// Get top customers
export async function getTopCustomers(limit: number = 10): Promise<{
  data: TopCustomer[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data: quotes } = await supabase
      .from('quotes')
      .select(`
        id,
        status,
        total_amount,
        customer:customers(company_name)
      `)
      .eq('org_id', orgId)
      .eq('is_deleted', false)

    if (!quotes) {
      return { data: [], error: null }
    }

    // Aggregate by customer
    const customerMap = new Map<string, TopCustomer>()

    quotes.forEach((quote) => {
      const customer = quote.customer as unknown as { company_name: string } | null
      const companyName = customer?.company_name || '未知客戶'
      const existing = customerMap.get(companyName) || {
        company_name: companyName,
        quote_count: 0,
        total_amount: 0,
        accepted_count: 0,
      }

      existing.quote_count++
      existing.total_amount += quote.total_amount || 0
      if (quote.status === 'accepted') {
        existing.accepted_count++
      }

      customerMap.set(companyName, existing)
    })

    const sorted = Array.from(customerMap.values())
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, limit)

    return { data: sorted, error: null }
  } catch (error) {
    console.error('Error fetching top customers:', error)
    return { data: null, error: '無法載入客戶排行' }
  }
}

// Get status distribution
export async function getStatusDistribution(): Promise<{
  data: { status: string; count: number; amount: number }[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data: quotes } = await supabase
      .from('quotes')
      .select('status, total_amount')
      .eq('org_id', orgId)
      .eq('is_deleted', false)

    if (!quotes) {
      return { data: [], error: null }
    }

    const statusMap = new Map<string, { count: number; amount: number }>()

    quotes.forEach((quote) => {
      const existing = statusMap.get(quote.status) || { count: 0, amount: 0 }
      existing.count++
      existing.amount += quote.total_amount || 0
      statusMap.set(quote.status, existing)
    })

    return {
      data: Array.from(statusMap.entries()).map(([status, data]) => ({
        status,
        ...data,
      })),
      error: null,
    }
  } catch (error) {
    console.error('Error fetching status distribution:', error)
    return { data: null, error: '無法載入狀態分布' }
  }
}
