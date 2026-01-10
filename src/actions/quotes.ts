'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ORG_ID, DEFAULT_TAX_RATE, DEFAULT_QUOTE_VALIDITY_DAYS } from '@/config/constants'
import { calculateQuoteTotals } from '@/lib/pricing-engine'
import type { Quote, QuoteWithRelations, QuoteFormData, QuoteItemFormData, QuoteFilters } from '@/types'
import { randomBytes } from 'crypto'

async function getOrgId(): Promise<string> {
  return DEFAULT_ORG_ID
}

// Generate unique quote number
async function generateQuoteNumber(orgId: string): Promise<string> {
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '')
  const timestamp = Date.now().toString().slice(-4)
  return `Q-${yearMonth}-${timestamp.padStart(4, '0')}`
}

// Generate share token
function generateShareToken(): string {
  return randomBytes(16).toString('hex')
}

export async function getQuotes(
  filters?: QuoteFilters
): Promise<{ data: QuoteWithRelations[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    let query = supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*)
      `)
      .eq('org_id', orgId)
      .eq('is_deleted', false)

    if (filters?.search) {
      query = query.or(`quote_number.ilike.%${filters.search}%`)
    }

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }

    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    if (filters?.date_from) {
      query = query.gte('issue_date', filters.date_from)
    }

    if (filters?.date_to) {
      query = query.lte('issue_date', filters.date_to)
    }

    if (filters?.min_amount) {
      query = query.gte('total_amount', filters.min_amount)
    }

    if (filters?.max_amount) {
      query = query.lte('total_amount', filters.max_amount)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return { data: null, error: '無法載入報價單列表' }
  }
}

export async function getQuote(
  id: string
): Promise<{ data: QuoteWithRelations | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        template:quote_templates(*)
      `)
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .single()

    if (quoteError) throw quoteError

    // Get quote items
    const { data: items, error: itemsError } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .eq('is_deleted', false)
      .order('sort_order')

    if (itemsError) throw itemsError

    return {
      data: { ...quote, items: items || [] },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching quote:', error)
    return { data: null, error: '無法載入報價單資料' }
  }
}

export async function createQuote(
  formData: QuoteFormData,
  items: QuoteItemFormData[]
): Promise<{ data: Quote | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Generate quote number
    const quoteNumber = await generateQuoteNumber(orgId)

    // Calculate valid_until date
    const validUntil = formData.valid_until ||
      new Date(Date.now() + DEFAULT_QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

    // Calculate totals
    const itemsWithTotals = items.map((item) => ({
      ...item,
      line_total: item.unit_price * item.quantity,
    }))

    const totals = calculateQuoteTotals(
      itemsWithTotals.map((i) => ({ unitPrice: i.unit_price, quantity: i.quantity })),
      formData.tax_rate || DEFAULT_TAX_RATE,
      formData.discount_amount || 0
    )

    // Create quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        org_id: orgId,
        quote_number: quoteNumber,
        customer_id: formData.customer_id,
        status: 'draft',
        subtotal: totals.subtotal,
        discount_amount: formData.discount_amount || 0,
        tax_rate: formData.tax_rate || DEFAULT_TAX_RATE,
        tax_amount: totals.taxAmount,
        total_amount: totals.totalAmount,
        currency: formData.currency || 'TWD',
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: validUntil,
        payment_terms: formData.payment_terms || null,
        delivery_terms: formData.delivery_terms || null,
        notes: formData.notes || null,
        internal_notes: formData.internal_notes || null,
        template_id: formData.template_id || null,
        share_token: generateShareToken(),
      })
      .select()
      .single()

    if (quoteError) throw quoteError

    // Create quote items
    if (items.length > 0) {
      const quoteItems = itemsWithTotals.map((item, index) => ({
        org_id: orgId,
        quote_id: quote.id,
        product_id: item.product_id || null,
        product_name: item.product_name,
        product_sku: item.product_sku || null,
        product_description: item.product_description || null,
        quantity: item.quantity,
        unit: item.unit || '件',
        unit_price: item.unit_price,
        original_price: item.original_price || item.unit_price,
        line_total: item.line_total,
        sort_order: index,
        notes: item.notes || null,
      }))

      const { error: itemsError } = await supabase
        .from('quote_items')
        .insert(quoteItems)

      if (itemsError) throw itemsError
    }

    revalidatePath('/quotes')
    return { data: quote, error: null }
  } catch (error) {
    console.error('Error creating quote:', error)
    return { data: null, error: '建立報價單失敗' }
  }
}

export async function updateQuote(
  id: string,
  formData: Partial<QuoteFormData>,
  items?: QuoteItemFormData[]
): Promise<{ data: Quote | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // If items are provided, recalculate totals
    let totals: { subtotal: number; taxAmount: number; totalAmount: number } | null = null

    if (items) {
      const itemsWithTotals = items.map((item) => ({
        ...item,
        line_total: item.unit_price * item.quantity,
      }))

      // Get current quote for tax rate
      const { data: currentQuote } = await supabase
        .from('quotes')
        .select('tax_rate')
        .eq('id', id)
        .single()

      totals = calculateQuoteTotals(
        itemsWithTotals.map((i) => ({ unitPrice: i.unit_price, quantity: i.quantity })),
        formData.tax_rate || currentQuote?.tax_rate || DEFAULT_TAX_RATE,
        formData.discount_amount || 0
      )
    }

    // Update quote
    const updateData: Record<string, unknown> = {
      ...formData,
      updated_at: new Date().toISOString(),
    }

    if (totals) {
      updateData.subtotal = totals.subtotal
      updateData.tax_amount = totals.taxAmount
      updateData.total_amount = totals.totalAmount
    }

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (quoteError) throw quoteError

    // Update items if provided
    if (items) {
      // Delete existing items
      await supabase
        .from('quote_items')
        .delete()
        .eq('quote_id', id)

      // Insert new items
      if (items.length > 0) {
        const quoteItems = items.map((item, index) => ({
          org_id: orgId,
          quote_id: id,
          product_id: item.product_id || null,
          product_name: item.product_name,
          product_sku: item.product_sku || null,
          product_description: item.product_description || null,
          quantity: item.quantity,
          unit: item.unit || '件',
          unit_price: item.unit_price,
          original_price: item.original_price || item.unit_price,
          line_total: item.unit_price * item.quantity,
          sort_order: index,
          notes: item.notes || null,
        }))

        const { error: itemsError } = await supabase
          .from('quote_items')
          .insert(quoteItems)

        if (itemsError) throw itemsError
      }
    }

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${id}`)
    return { data: quote, error: null }
  } catch (error) {
    console.error('Error updating quote:', error)
    return { data: null, error: '更新報價單失敗' }
  }
}

export async function updateQuoteStatus(
  id: string,
  status: string,
  notes?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    }

    // Handle approval-specific fields
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString()
      if (notes) updateData.approval_notes = notes
    }

    // Handle acceptance
    if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('quotes')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${id}`)
    return { success: true, error: null }
  } catch (error) {
    console.error('Error updating quote status:', error)
    return { success: false, error: '更新報價單狀態失敗' }
  }
}

export async function deleteQuote(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('quotes')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/quotes')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting quote:', error)
    return { success: false, error: '刪除報價單失敗' }
  }
}

export async function duplicateQuote(
  id: string
): Promise<{ data: Quote | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Get original quote
    const { data: original, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (fetchError) throw fetchError

    // Get original items
    const { data: originalItems } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', id)
      .eq('is_deleted', false)

    // Generate new quote number
    const quoteNumber = await generateQuoteNumber(orgId)

    // Create new quote
    const { data: newQuote, error: createError } = await supabase
      .from('quotes')
      .insert({
        org_id: orgId,
        quote_number: quoteNumber,
        customer_id: original.customer_id,
        status: 'draft',
        subtotal: original.subtotal,
        discount_amount: original.discount_amount,
        tax_rate: original.tax_rate,
        tax_amount: original.tax_amount,
        total_amount: original.total_amount,
        currency: original.currency,
        issue_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + DEFAULT_QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        payment_terms: original.payment_terms,
        delivery_terms: original.delivery_terms,
        notes: original.notes,
        internal_notes: original.internal_notes,
        template_id: original.template_id,
        share_token: generateShareToken(),
        parent_quote_id: id,
      })
      .select()
      .single()

    if (createError) throw createError

    // Copy items
    if (originalItems && originalItems.length > 0) {
      const newItems = originalItems.map((item) => ({
        org_id: orgId,
        quote_id: newQuote.id,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        product_description: item.product_description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        original_price: item.original_price,
        line_total: item.line_total,
        sort_order: item.sort_order,
        notes: item.notes,
      }))

      await supabase.from('quote_items').insert(newItems)
    }

    revalidatePath('/quotes')
    return { data: newQuote, error: null }
  } catch (error) {
    console.error('Error duplicating quote:', error)
    return { data: null, error: '複製報價單失敗' }
  }
}

// Get quote by share token (for customer portal)
export async function getQuoteByToken(
  token: string
): Promise<{ data: QuoteWithRelations | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(company_name, contact_name, contact_email),
        template:quote_templates(*)
      `)
      .eq('share_token', token)
      .eq('is_deleted', false)
      .single()

    if (quoteError) throw quoteError

    // Update viewed_at
    await supabase
      .from('quotes')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', quote.id)

    // Get items
    const { data: items } = await supabase
      .from('quote_items')
      .select('*')
      .eq('quote_id', quote.id)
      .eq('is_deleted', false)
      .order('sort_order')

    return {
      data: { ...quote, items: items || [] },
      error: null,
    }
  } catch (error) {
    console.error('Error fetching quote by token:', error)
    return { data: null, error: '無法載入報價單' }
  }
}

// Submit quote for approval
export async function submitForApproval(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Check if quote is in draft status
    const { data: quote } = await supabase
      .from('quotes')
      .select('status, total_amount')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!quote || quote.status !== 'draft') {
      return { success: false, error: '只能提交草稿狀態的報價單' }
    }

    // Check approval settings
    const { data: settings } = await supabase
      .from('approval_settings')
      .select('threshold_amount')
      .eq('org_id', orgId)
      .eq('is_active', true)
      .order('threshold_amount', { ascending: false })

    const needsApproval = settings?.some(
      (s) => quote.total_amount >= s.threshold_amount
    )

    const newStatus = needsApproval ? 'pending_approval' : 'approved'

    const { error } = await supabase
      .from('quotes')
      .update({
        status: newStatus,
        requires_approval: needsApproval,
        updated_at: new Date().toISOString(),
        ...(newStatus === 'approved' ? { approved_at: new Date().toISOString() } : {}),
      })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${id}`)
    revalidatePath('/approvals')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error submitting for approval:', error)
    return { success: false, error: '提交審批失敗' }
  }
}

// Send quote to customer
export async function sendToCustomer(
  id: string
): Promise<{ success: boolean; shareUrl: string | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Check if quote can be sent
    const { data: quote } = await supabase
      .from('quotes')
      .select('status, share_token')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!quote) {
      return { success: false, shareUrl: null, error: '找不到報價單' }
    }

    if (!['approved', 'sent'].includes(quote.status)) {
      return { success: false, shareUrl: null, error: '報價單需要先通過審批' }
    }

    const { error } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/quotes')
    revalidatePath(`/quotes/${id}`)

    const shareUrl = `/q/${quote.share_token}`
    return { success: true, shareUrl, error: null }
  } catch (error) {
    console.error('Error sending to customer:', error)
    return { success: false, shareUrl: null, error: '發送報價單失敗' }
  }
}

// Get share URL for quote
export async function getShareUrl(
  id: string
): Promise<{ shareUrl: string | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data: quote } = await supabase
      .from('quotes')
      .select('share_token')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (!quote) {
      return { shareUrl: null, error: '找不到報價單' }
    }

    return { shareUrl: `/q/${quote.share_token}`, error: null }
  } catch (error) {
    console.error('Error getting share URL:', error)
    return { shareUrl: null, error: '取得分享連結失敗' }
  }
}
