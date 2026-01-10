import { AuditFields, CustomerLevel } from './database'

// Customer
export interface Customer extends AuditFields {
  company_name: string
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  customer_level: CustomerLevel
  credit_limit: number
  payment_terms: string | null
  notes: string | null
  portal_password_hash: string | null
  portal_enabled: boolean
}

// Customer without sensitive fields (for client-side)
export type CustomerPublic = Omit<Customer, 'portal_password_hash'>

// Form data for creating/updating customers
export interface CustomerFormData {
  company_name: string
  contact_name?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  address?: string | null
  customer_level?: CustomerLevel
  credit_limit?: number
  payment_terms?: string | null
  notes?: string | null
  portal_enabled?: boolean
}

// Customer search/filter params
export interface CustomerFilters {
  search?: string
  customer_level?: CustomerLevel
  portal_enabled?: boolean
}

// Customer statistics
export interface CustomerStats {
  total_quotes: number
  accepted_quotes: number
  total_amount: number
  average_order_value: number
  last_quote_date: string | null
}
