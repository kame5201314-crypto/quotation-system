'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { DEFAULT_ORG_ID } from '@/config/constants'
import type { Product, ProductFormData, ProductFilters, ProductCategory } from '@/types'

// Get current session's org_id (placeholder - will be replaced with actual auth)
async function getOrgId(): Promise<string> {
  // TODO: Get from actual user session
  return DEFAULT_ORG_ID
}

// ============================================
// Product Categories
// ============================================

export async function getProductCategories(): Promise<{ data: ProductCategory[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .order('sort_order')

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching categories:', error)
    return { data: null, error: '無法載入產品分類' }
  }
}

export async function createProductCategory(
  name: string,
  parentId?: string | null
): Promise<{ data: ProductCategory | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('product_categories')
      .insert({
        org_id: orgId,
        name,
        parent_id: parentId || null,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/products')
    return { data, error: null }
  } catch (error) {
    console.error('Error creating category:', error)
    return { data: null, error: '建立分類失敗' }
  }
}

// ============================================
// Products
// ============================================

export async function getProducts(
  filters?: ProductFilters
): Promise<{ data: Product[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    let query = supabase
      .from('products')
      .select('*')
      .eq('org_id', orgId)
      .eq('is_deleted', false)

    // Apply filters
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`)
    }

    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id)
    }

    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters?.min_price !== undefined) {
      query = query.gte('base_price', filters.min_price)
    }

    if (filters?.max_price !== undefined) {
      query = query.lte('base_price', filters.max_price)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching products:', error)
    return { data: null, error: '無法載入產品列表' }
  }
}

export async function getProduct(
  id: string
): Promise<{ data: Product | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching product:', error)
    return { data: null, error: '無法載入產品資料' }
  }
}

export async function createProduct(
  formData: ProductFormData
): Promise<{ data: Product | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Check if SKU already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('org_id', orgId)
      .eq('sku', formData.sku)
      .eq('is_deleted', false)
      .single()

    if (existing) {
      return { data: null, error: '此產品編號已存在' }
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        org_id: orgId,
        sku: formData.sku,
        name: formData.name,
        category_id: formData.category_id || null,
        description: formData.description || null,
        unit: formData.unit || '件',
        cost_price: formData.cost_price || 0,
        base_price: formData.base_price,
        image_url: formData.image_url || null,
        is_active: formData.is_active ?? true,
        specifications: formData.specifications || {},
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/products')
    return { data, error: null }
  } catch (error) {
    console.error('Error creating product:', error)
    return { data: null, error: '建立產品失敗' }
  }
}

export async function updateProduct(
  id: string,
  formData: Partial<ProductFormData>
): Promise<{ data: Product | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Check if SKU already exists (if updating SKU)
    if (formData.sku) {
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('org_id', orgId)
        .eq('sku', formData.sku)
        .eq('is_deleted', false)
        .neq('id', id)
        .single()

      if (existing) {
        return { data: null, error: '此產品編號已存在' }
      }
    }

    const { data, error } = await supabase
      .from('products')
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

    revalidatePath('/products')
    revalidatePath(`/products/${id}`)
    return { data, error: null }
  } catch (error) {
    console.error('Error updating product:', error)
    return { data: null, error: '更新產品失敗' }
  }
}

export async function deleteProduct(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    // Soft delete
    const { error } = await supabase
      .from('products')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/products')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error deleting product:', error)
    return { success: false, error: '刪除產品失敗' }
  }
}

export async function toggleProductActive(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    const orgId = await getOrgId()

    const { error } = await supabase
      .from('products')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) throw error

    revalidatePath('/products')
    return { success: true, error: null }
  } catch (error) {
    console.error('Error toggling product status:', error)
    return { success: false, error: '更新產品狀態失敗' }
  }
}
