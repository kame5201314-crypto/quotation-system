'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ORG_ID } from '@/config/constants'

async function getOrgId(): Promise<string> {
  return DEFAULT_ORG_ID
}

export interface QuoteTemplate {
  id: string
  org_id: string
  name: string
  is_default: boolean
  logo_url: string | null
  primary_color: string | null
  header_content: string | null
  footer_content: string | null
  terms_content: string | null
  created_at: string
  updated_at: string
}

export interface TemplateFormData {
  name: string
  is_default?: boolean
  logo_url?: string | null
  primary_color?: string | null
  header_content?: string | null
  footer_content?: string | null
  terms_content?: string | null
}

// Get all templates
export async function getTemplates(): Promise<{
  data: QuoteTemplate[] | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('quote_templates')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .order('is_default', { ascending: false })
      .order('name')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching templates:', error)
    return { data: null, error: '無法載入模板' }
  }
}

// Get single template
export async function getTemplate(id: string): Promise<{
  data: QuoteTemplate | null
  error: string | null
}> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('quote_templates')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching template:', error)
    return { data: null, error: '無法載入模板' }
  }
}

// Create template
export async function createTemplate(
  formData: TemplateFormData
): Promise<{ data: QuoteTemplate | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // If setting as default, unset other defaults
    if (formData.is_default) {
      await supabase
        .from('quote_templates')
        .update({ is_default: false })
        .eq('org_id', orgId)
    }

    const { data, error } = await supabase
      .from('quote_templates')
      .insert({
        org_id: orgId,
        name: formData.name,
        is_default: formData.is_default || false,
        logo_url: formData.logo_url || null,
        primary_color: formData.primary_color || '#3b82f6',
        header_content: formData.header_content || null,
        footer_content: formData.footer_content || null,
        terms_content: formData.terms_content || null,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/settings')
    return { data, error: null }
  } catch (error) {
    console.error('Error creating template:', error)
    return { data: null, error: '建立模板失敗' }
  }
}

// Update template
export async function updateTemplate(
  id: string,
  formData: Partial<TemplateFormData>
): Promise<{ data: QuoteTemplate | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // If setting as default, unset other defaults
    if (formData.is_default) {
      await supabase
        .from('quote_templates')
        .update({ is_default: false })
        .eq('org_id', orgId)
    }

    const { data, error } = await supabase
      .from('quote_templates')
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
    console.error('Error updating template:', error)
    return { data: null, error: '更新模板失敗' }
  }
}

// Delete template
export async function deleteTemplate(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('quote_templates')
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
    console.error('Error deleting template:', error)
    return { success: false, error: '刪除模板失敗' }
  }
}

// Set default template
export async function setDefaultTemplate(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Unset all defaults
    await supabase
      .from('quote_templates')
      .update({ is_default: false })
      .eq('org_id', orgId)

    // Set new default
    const { error } = await supabase
      .from('quote_templates')
      .update({ is_default: true })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/settings')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error setting default template:', error)
    return { success: false, error: '設定預設模板失敗' }
  }
}
