'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ORG_ID } from '@/config/constants'
import type { PricingRule, PricingRuleFormData, ApprovalSetting } from '@/types'

async function getOrgId(): Promise<string> {
  return DEFAULT_ORG_ID
}

// ============================================
// Pricing Rules
// ============================================

export async function getPricingRules(): Promise<{ data: PricingRule[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .order('priority', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching pricing rules:', error)
    return { data: null, error: '無法載入定價規則' }
  }
}

export async function getPricingRule(id: string): Promise<{ data: PricingRule | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching pricing rule:', error)
    return { data: null, error: '無法載入定價規則' }
  }
}

export async function createPricingRule(
  formData: PricingRuleFormData
): Promise<{ data: PricingRule | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('pricing_rules')
      .insert({
        org_id: orgId,
        name: formData.name,
        rule_type: formData.rule_type,
        product_id: formData.product_id || null,
        category_id: formData.category_id || null,
        conditions: formData.conditions || {},
        discount_type: formData.discount_type,
        discount_value: formData.discount_value,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        priority: formData.priority || 0,
        is_active: formData.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/pricing')
    return { data, error: null }
  } catch (error) {
    console.error('Error creating pricing rule:', error)
    return { data: null, error: '建立定價規則失敗' }
  }
}

export async function updatePricingRule(
  id: string,
  formData: Partial<PricingRuleFormData>
): Promise<{ data: PricingRule | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('pricing_rules')
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

    revalidatePath('/pricing')
    return { data, error: null }
  } catch (error) {
    console.error('Error updating pricing rule:', error)
    return { data: null, error: '更新定價規則失敗' }
  }
}

export async function deletePricingRule(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('pricing_rules')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/pricing')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting pricing rule:', error)
    return { success: false, error: '刪除定價規則失敗' }
  }
}

export async function togglePricingRuleActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('pricing_rules')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/pricing')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error toggling pricing rule:', error)
    return { success: false, error: '更新定價規則狀態失敗' }
  }
}

// ============================================
// Approval Settings
// ============================================

export async function getApprovalSettings(): Promise<{ data: ApprovalSetting[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('approval_settings')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .order('threshold_amount')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching approval settings:', error)
    return { data: null, error: '無法載入審批設定' }
  }
}

export async function updateApprovalSetting(
  id: string,
  data: { threshold_amount?: number; approver_role?: string; is_active?: boolean }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('approval_settings')
      .update(data)
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/pricing')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error updating approval setting:', error)
    return { success: false, error: '更新審批設定失敗' }
  }
}

// Get active pricing rules for calculation
export async function getActivePricingRules(
  productId?: string,
  categoryId?: string
): Promise<{ data: PricingRule[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    let query = supabase
      .from('pricing_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    // Filter by product or category
    if (productId) {
      query = query.or(`product_id.eq.${productId},product_id.is.null`)
    }
    if (categoryId) {
      query = query.or(`category_id.eq.${categoryId},category_id.is.null`)
    }

    const { data, error } = await query

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching active pricing rules:', error)
    return { data: null, error: '無法載入定價規則' }
  }
}
