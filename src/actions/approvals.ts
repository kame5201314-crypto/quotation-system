'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ORG_ID } from '@/config/constants'
import type { QuoteWithRelations } from '@/types'

async function getOrgId(): Promise<string> {
  return DEFAULT_ORG_ID
}

// Get quotes pending approval
export async function getPendingApprovals(): Promise<{
  data: QuoteWithRelations[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data: quotes, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('org_id', orgId)
      .eq('status', 'pending_approval')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get items for each quote
    const quotesWithItems = await Promise.all(
      (quotes || []).map(async (quote) => {
        const { data: items } = await supabase
          .from('quote_items')
          .select('*')
          .eq('quote_id', quote.id)
          .eq('is_deleted', false)
          .order('sort_order')

        return { ...quote, items: items || [] }
      })
    )

    return { data: quotesWithItems, error: null }
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    return { data: null, error: '無法載入待審批報價單' }
  }
}

// Get approval history
export async function getApprovalHistory(): Promise<{
  data: QuoteWithRelations[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data: quotes, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('org_id', orgId)
      .in('status', ['approved', 'rejected'])
      .not('approved_at', 'is', null)
      .eq('is_deleted', false)
      .order('approved_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return { data: quotes, error: null }
  } catch (error) {
    console.error('Error fetching approval history:', error)
    return { data: null, error: '無法載入審批歷史' }
  }
}

// Approve a quote
export async function approveQuote(
  id: string,
  notes?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('quotes')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approval_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('status', 'pending_approval')

    if (error) throw error

    revalidatePath('/approvals')
    revalidatePath('/quotes')
    revalidatePath(`/quotes/${id}`)
    return { success: true, error: null }
  } catch (error) {
    console.error('Error approving quote:', error)
    return { success: false, error: '核准報價單失敗' }
  }
}

// Reject a quote
export async function rejectQuote(
  id: string,
  reason: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('quotes')
      .update({
        status: 'draft',
        approved_at: new Date().toISOString(),
        approval_notes: `駁回原因: ${reason}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('status', 'pending_approval')

    if (error) throw error

    revalidatePath('/approvals')
    revalidatePath('/quotes')
    revalidatePath(`/quotes/${id}`)
    return { success: true, error: null }
  } catch (error) {
    console.error('Error rejecting quote:', error)
    return { success: false, error: '駁回報價單失敗' }
  }
}

// Get approval statistics
export async function getApprovalStats(): Promise<{
  data: {
    pending: number
    approvedToday: number
    rejectedToday: number
    averageTime: number
  } | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const today = new Date().toISOString().split('T')[0]

    // Count pending
    const { count: pending } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'pending_approval')
      .eq('is_deleted', false)

    // Count approved today
    const { count: approvedToday } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'approved')
      .gte('approved_at', today)
      .eq('is_deleted', false)

    // Count rejected today (returned to draft)
    const { count: rejectedToday } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('status', 'draft')
      .not('approval_notes', 'is', null)
      .gte('updated_at', today)
      .eq('is_deleted', false)

    return {
      data: {
        pending: pending || 0,
        approvedToday: approvedToday || 0,
        rejectedToday: rejectedToday || 0,
        averageTime: 0, // Would need more complex calculation
      },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching approval stats:', error)
    return { data: null, error: '無法載入審批統計' }
  }
}
