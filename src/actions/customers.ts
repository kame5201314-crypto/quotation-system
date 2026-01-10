'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ORG_ID } from '@/config/constants'
import type { Customer, CustomerFormData, CustomerFilters } from '@/types'

async function getOrgId(): Promise<string> {
  return DEFAULT_ORG_ID
}

export async function getCustomers(
  filters?: CustomerFilters
): Promise<{ data: Customer[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    let query = supabase
      .from('customers')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false)

    if (filters?.search) {
      query = query.or(
        `company_name.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
      )
    }

    if (filters?.customer_level) {
      query = query.eq('customer_level', filters.customer_level)
    }

    if (filters?.portal_enabled !== undefined) {
      query = query.eq('portal_enabled', filters.portal_enabled)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching customers:', error)
    return { data: null, error: '無法載入客戶列表' }
  }
}

export async function getCustomer(
  id: string
): Promise<{ data: Customer | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching customer:', error)
    return { data: null, error: '無法載入客戶資料' }
  }
}

export async function createCustomer(
  formData: CustomerFormData
): Promise<{ data: Customer | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('customers')
      .insert({
        org_id: orgId,
        company_name: formData.company_name,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        address: formData.address || null,
        customer_level: formData.customer_level || 'normal',
        credit_limit: formData.credit_limit || 0,
        payment_terms: formData.payment_terms || null,
        notes: formData.notes || null,
        portal_enabled: formData.portal_enabled || false,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/customers')
    return { data, error: null }
  } catch (error) {
    console.error('Error creating customer:', error)
    return { data: null, error: '建立客戶失敗' }
  }
}

export async function updateCustomer(
  id: string,
  formData: Partial<CustomerFormData>
): Promise<{ data: Customer | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('customers')
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/customers')
    revalidatePath(`/customers/${id}`)
    return { data, error: null }
  } catch (error) {
    console.error('Error updating customer:', error)
    return { data: null, error: '更新客戶失敗' }
  }
}

export async function deleteCustomer(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('customers')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/customers')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting customer:', error)
    return { success: false, error: '刪除客戶失敗' }
  }
}

export async function searchCustomers(
  query: string
): Promise<{ data: Customer[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .or(`company_name.ilike.%${query}%,contact_name.ilike.%${query}%`)
      .limit(10)

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error searching customers:', error)
    return { data: null, error: '搜尋客戶失敗' }
  }
}
