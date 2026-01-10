'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Customer accepts quote via public link
export async function acceptQuoteByToken(
  token: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Find quote by token
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status, valid_until')
      .eq('share_token', token)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !quote) {
      return { success: false, error: '找不到報價單' }
    }

    // Check if quote can be accepted
    if (quote.status !== 'sent') {
      return { success: false, error: '此報價單目前無法接受' }
    }

    // Check if expired
    if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
      return { success: false, error: '此報價單已過期' }
    }

    // Update quote status
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quote.id)

    if (updateError) throw updateError

    revalidatePath(`/q/${token}`)
    return { success: true, error: null }
  } catch (error) {
    console.error('Error accepting quote:', error)
    return { success: false, error: '接受報價單失敗' }
  }
}

// Customer rejects quote via public link
export async function rejectQuoteByToken(
  token: string,
  reason?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    // Find quote by token
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('id, status')
      .eq('share_token', token)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !quote) {
      return { success: false, error: '找不到報價單' }
    }

    // Check if quote can be rejected
    if (quote.status !== 'sent') {
      return { success: false, error: '此報價單目前無法拒絕' }
    }

    // Update quote status
    const { error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'rejected',
        notes: reason ? `客戶拒絕原因: ${reason}` : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', quote.id)

    if (updateError) throw updateError

    revalidatePath(`/q/${token}`)
    return { success: true, error: null }
  } catch (error) {
    console.error('Error rejecting quote:', error)
    return { success: false, error: '拒絕報價單失敗' }
  }
}
