import { AuditFields, BaseFields, Currency, QuoteStatus } from './database'
import { Customer } from './customer'
import { AppliedRule } from './pricing'

// Quote Template
export interface QuoteTemplate extends Omit<BaseFields, 'updated_by' | 'version'> {
  name: string
  is_default: boolean
  logo_url: string | null
  primary_color: string
  header_content: string | null
  footer_content: string | null
  terms_content: string | null
  created_by: string | null
}

// Quote Item
export interface QuoteItem extends Omit<BaseFields, 'created_by' | 'updated_by' | 'version'> {
  quote_id: string
  product_id: string | null
  product_name: string
  product_sku: string | null
  product_description: string | null
  quantity: number
  unit: string
  unit_price: number
  original_price: number | null
  discount_percentage: number
  line_total: number
  applied_rules: AppliedRule[]
  sort_order: number
  notes: string | null
}

// Quote
export interface Quote extends AuditFields {
  quote_number: string
  customer_id: string
  status: QuoteStatus

  // Amounts
  subtotal: number
  discount_amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  currency: Currency

  // Dates
  issue_date: string
  valid_until: string | null
  accepted_at: string | null

  // Terms
  payment_terms: string | null
  delivery_terms: string | null
  notes: string | null
  internal_notes: string | null
  template_id: string | null

  // Version control
  version_number: number
  parent_quote_id: string | null

  // Approval
  requires_approval: boolean
  approved_by: string | null
  approved_at: string | null
  approval_notes: string | null

  // Customer interaction
  share_token: string | null
  customer_signature: string | null
  signed_at: string | null
  viewed_at: string | null
}

// Quote with relations
export interface QuoteWithRelations extends Quote {
  customer?: Customer | null
  items?: QuoteItem[]
  template?: QuoteTemplate | null
}

// Quote Comment
export interface QuoteComment extends Omit<BaseFields, 'updated_at' | 'created_by' | 'updated_by' | 'version'> {
  quote_id: string
  user_id: string | null
  customer_id: string | null
  content: string
  is_internal: boolean
}

// Form data for creating/updating quotes
export interface QuoteFormData {
  customer_id: string
  currency?: Currency
  tax_rate?: number
  valid_until?: string | null
  payment_terms?: string | null
  delivery_terms?: string | null
  notes?: string | null
  internal_notes?: string | null
  template_id?: string | null
  discount_amount?: number
}

// Quote item form data
export interface QuoteItemFormData {
  product_id?: string | null
  product_name: string
  product_sku?: string | null
  product_description?: string | null
  quantity: number
  unit?: string
  unit_price: number
  original_price?: number | null
  notes?: string | null
}

// Quote filters
export interface QuoteFilters {
  search?: string
  status?: QuoteStatus | QuoteStatus[]
  customer_id?: string
  created_by?: string
  date_from?: string
  date_to?: string
  min_amount?: number
  max_amount?: number
}

// Quote statistics
export interface QuoteStats {
  total_quotes: number
  draft_count: number
  pending_approval_count: number
  sent_count: number
  accepted_count: number
  rejected_count: number
  expired_count: number
  total_amount: number
  conversion_rate: number
  average_deal_size: number
}
