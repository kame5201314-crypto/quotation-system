// Base fields that all tables share
export interface BaseFields {
  id: string
  org_id: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  deleted_at: string | null
  metadata: Record<string, unknown>
}

// Fields with audit trail
export interface AuditFields extends BaseFields {
  created_by: string | null
  updated_by: string | null
  version: number
}

// Customer levels
export type CustomerLevel = 'vip' | 'normal' | 'new'

// Quote statuses
export type QuoteStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled'

// Currencies
export type Currency = 'TWD' | 'USD' | 'CNY' | 'EUR' | 'JPY'

// Pricing rule types
export type PricingRuleType = 'tier' | 'customer_level' | 'bundle' | 'promotion'

// Discount types
export type DiscountType = 'percentage' | 'fixed' | 'price_override'

// Actor types for activity logs
export type ActorType = 'user' | 'customer' | 'system'

// Entity types for activity logs
export type EntityType = 'quote' | 'customer' | 'product' | 'pricing_rule'
