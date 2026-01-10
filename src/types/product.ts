import { AuditFields, BaseFields } from './database'

// Product Category
export interface ProductCategory extends Omit<BaseFields, 'created_by' | 'updated_by' | 'version'> {
  name: string
  parent_id: string | null
  sort_order: number
}

// Product
export interface Product extends AuditFields {
  sku: string
  name: string
  category_id: string | null
  description: string | null
  unit: string
  cost_price: number
  base_price: number
  image_url: string | null
  is_active: boolean
  specifications: Record<string, unknown>
}

// Product with category (for joins)
export interface ProductWithCategory extends Product {
  category?: ProductCategory | null
}

// Form data for creating/updating products
export interface ProductFormData {
  sku: string
  name: string
  category_id?: string | null
  description?: string | null
  unit?: string
  cost_price?: number
  base_price: number
  image_url?: string | null
  is_active?: boolean
  specifications?: Record<string, unknown>
}

// Product search/filter params
export interface ProductFilters {
  search?: string
  category_id?: string
  is_active?: boolean
  min_price?: number
  max_price?: number
}
