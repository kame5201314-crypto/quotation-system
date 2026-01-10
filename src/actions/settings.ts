'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ORG_ID } from '@/config/constants'

async function getOrgId(): Promise<string> {
  return DEFAULT_ORG_ID
}

export interface OrganizationSettings {
  id: string
  org_id: string
  company_name: string | null
  tax_id: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  default_tax_rate: number
  default_validity_days: number
  default_currency: string
  default_payment_terms: string | null
  default_delivery_terms: string | null
  created_at: string
  updated_at: string
}

export interface CompanyInfoFormData {
  company_name?: string | null
  tax_id?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
}

export interface DefaultSettingsFormData {
  default_tax_rate?: number
  default_validity_days?: number
  default_currency?: string
  default_payment_terms?: string | null
  default_delivery_terms?: string | null
}

// Get organization settings
export async function getOrganizationSettings(): Promise<{
  data: OrganizationSettings | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('org_id', orgId)
      .single()

    if (error) {
      // If no settings exist, create default ones
      if (error.code === 'PGRST116') {
        const { data: newData, error: createError } = await supabase
          .from('organization_settings')
          .insert({
            org_id: orgId,
            default_tax_rate: 0.05,
            default_validity_days: 30,
            default_currency: 'TWD',
          })
          .select()
          .single()

        if (createError) throw createError
        return { data: newData, error: null }
      }
      throw error
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching organization settings:', error)
    return { data: null, error: '無法載入設定' }
  }
}

// Update company information
export async function updateCompanyInfo(
  formData: CompanyInfoFormData
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Check if settings exist
    const { data: existing } = await supabase
      .from('organization_settings')
      .select('id')
      .eq('org_id', orgId)
      .single()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('organization_settings')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)

      if (error) throw error
    } else {
      // Create new
      const { error } = await supabase.from('organization_settings').insert({
        org_id: orgId,
        ...formData,
        default_tax_rate: 0.05,
        default_validity_days: 30,
        default_currency: 'TWD',
      })

      if (error) throw error
    }

    revalidatePath('/settings')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error updating company info:', error)
    return { success: false, error: '更新公司資訊失敗' }
  }
}

// Update default settings
export async function updateDefaultSettings(
  formData: DefaultSettingsFormData
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Check if settings exist
    const { data: existing } = await supabase
      .from('organization_settings')
      .select('id')
      .eq('org_id', orgId)
      .single()

    if (existing) {
      // Update existing
      const { error } = await supabase
        .from('organization_settings')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('org_id', orgId)

      if (error) throw error
    } else {
      // Create new
      const { error } = await supabase.from('organization_settings').insert({
        org_id: orgId,
        default_tax_rate: formData.default_tax_rate ?? 0.05,
        default_validity_days: formData.default_validity_days ?? 30,
        default_currency: formData.default_currency ?? 'TWD',
        default_payment_terms: formData.default_payment_terms,
        default_delivery_terms: formData.default_delivery_terms,
      })

      if (error) throw error
    }

    revalidatePath('/settings')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error updating default settings:', error)
    return { success: false, error: '更新預設值失敗' }
  }
}

// Approval settings
export interface ApprovalSetting {
  id: string
  org_id: string
  name: string
  threshold_amount: number
  approver_role: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApprovalSettingFormData {
  name: string
  threshold_amount: number
  approver_role: string
  is_active?: boolean
}

// Get approval settings
export async function getApprovalSettings(): Promise<{
  data: ApprovalSetting[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('approval_settings')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .order('threshold_amount', { ascending: true })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching approval settings:', error)
    return { data: null, error: '無法載入審批設定' }
  }
}

// Create approval setting
export async function createApprovalSetting(
  formData: ApprovalSettingFormData
): Promise<{ data: ApprovalSetting | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('approval_settings')
      .insert({
        org_id: orgId,
        name: formData.name,
        threshold_amount: formData.threshold_amount,
        approver_role: formData.approver_role,
        is_active: formData.is_active ?? true,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings')
    return { data, error: null }
  } catch (error) {
    console.error('Error creating approval setting:', error)
    return { data: null, error: '建立審批規則失敗' }
  }
}

// Update approval setting
export async function updateApprovalSetting(
  id: string,
  formData: Partial<ApprovalSettingFormData>
): Promise<{ data: ApprovalSetting | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('approval_settings')
      .update({
        ...formData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings')
    return { data, error: null }
  } catch (error) {
    console.error('Error updating approval setting:', error)
    return { data: null, error: '更新審批規則失敗' }
  }
}

// Delete approval setting
export async function deleteApprovalSetting(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('approval_settings')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/settings')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting approval setting:', error)
    return { success: false, error: '刪除審批規則失敗' }
  }
}
