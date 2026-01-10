import { AuditFields, BaseFields, DiscountType, PricingRuleType } from './database'

// Pricing rule conditions
export interface TierCondition {
  min_qty: number
  max_qty?: number
}

export interface CustomerLevelCondition {
  level: 'vip' | 'normal' | 'new'
}

export interface BundleCondition {
  product_ids: string[]
}

export type PricingCondition = TierCondition | CustomerLevelCondition | BundleCondition | Record<string, unknown>

// Pricing Rule
export interface PricingRule extends AuditFields {
  name: string
  rule_type: PricingRuleType
  product_id: string | null
  category_id: string | null
  conditions: PricingCondition
  discount_type: DiscountType
  discount_value: number
  start_date: string | null
  end_date: string | null
  priority: number
  is_active: boolean
}

// Form data for creating/updating pricing rules
export interface PricingRuleFormData {
  name: string
  rule_type: PricingRuleType
  product_id?: string | null
  category_id?: string | null
  conditions?: PricingCondition
  discount_type: DiscountType
  discount_value: number
  start_date?: string | null
  end_date?: string | null
  priority?: number
  is_active?: boolean
}

// Applied rule info (stored in quote items)
export interface AppliedRule {
  rule_id: string
  name: string
  rule_type: PricingRuleType
  discount_type: DiscountType
  discount_value: number
  discount_amount: number
}

// Approval Settings
export interface ApprovalSetting extends Omit<BaseFields, 'created_by' | 'updated_by' | 'version'> {
  name: string
  threshold_amount: number
  approver_role: string
  is_active: boolean
}

// Price calculation result
export interface PriceCalculation {
  original_price: number
  final_price: number
  discount_percentage: number
  discount_amount: number
  applied_rules: AppliedRule[]
}
