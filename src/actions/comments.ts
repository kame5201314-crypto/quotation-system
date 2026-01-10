'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ORG_ID } from '@/config/constants'

async function getOrgId(): Promise<string> {
  return DEFAULT_ORG_ID
}

export interface QuoteComment {
  id: string
  org_id: string
  quote_id: string
  user_id: string | null
  customer_id: string | null
  content: string
  is_internal: boolean
  created_at: string
  user_name?: string
  customer_name?: string
}

export interface CommentFormData {
  quote_id: string
  content: string
  is_internal?: boolean
}

// Get comments for a quote
export async function getQuoteComments(quoteId: string): Promise<{
  data: QuoteComment[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('quote_comments')
      .select('*')
      .eq('org_id', orgId)
      .eq('quote_id', quoteId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Add placeholder names for now (in production, you'd join with users/customers tables)
    const commentsWithNames = (data || []).map((comment) => ({
      ...comment,
      user_name: comment.user_id ? '系統用戶' : undefined,
      customer_name: comment.customer_id ? '客戶' : undefined,
    }))

    return { data: commentsWithNames, error: null }
  } catch (error) {
    console.error('Error fetching quote comments:', error)
    return { data: null, error: '無法載入留言' }
  }
}

// Add a comment
export async function addComment(
  formData: CommentFormData
): Promise<{ data: QuoteComment | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('quote_comments')
      .insert({
        org_id: orgId,
        quote_id: formData.quote_id,
        content: formData.content,
        is_internal: formData.is_internal ?? true,
        user_id: 'system', // In production, get from auth session
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath(`/quotes/${formData.quote_id}`)
    return { data, error: null }
  } catch (error) {
    console.error('Error adding comment:', error)
    return { data: null, error: '新增留言失敗' }
  }
}

// Add a customer comment (via public link)
export async function addCustomerComment(
  token: string,
  content: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Find quote by token
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('id, org_id, customer_id')
      .eq('share_token', token)
      .eq('is_deleted', false)
      .single()

    if (quoteError || !quote) {
      return { success: false, error: '找不到報價單' }
    }

    // Add comment
    const { error } = await supabase.from('quote_comments').insert({
      org_id: quote.org_id,
      quote_id: quote.id,
      customer_id: quote.customer_id,
      content,
      is_internal: false,
    })

    if (error) throw error

    return { success: true, error: null }
  } catch (error) {
    console.error('Error adding customer comment:', error)
    return { success: false, error: '新增留言失敗' }
  }
}

// Delete a comment
export async function deleteComment(
  id: string,
  quoteId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('quote_comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath(`/quotes/${quoteId}`)
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting comment:', error)
    return { success: false, error: '刪除留言失敗' }
  }
}
