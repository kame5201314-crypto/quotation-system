import type { PricingRule, CustomerLevel } from '@/types'

// Context for price calculation
export interface PricingContext {
  productId: string
  categoryId?: string | null
  quantity: number
  customerLevel: CustomerLevel
  basePrice: number
  orgId: string
}

// Result of price calculation
export interface PricingResult {
  originalPrice: number
  finalPrice: number
  unitPrice: number
  lineTotal: number
  discountPercentage: number
  discountAmount: number
  appliedRules: AppliedRuleInfo[]
}

// Applied rule information
export interface AppliedRuleInfo {
  ruleId: string
  ruleName: string
  ruleType: string
  discountType: string
  discountValue: number
  discountAmount: number
  priority: number
}

// Simplified rule for calculation
export interface CalculationRule {
  id: string
  name: string
  ruleType: string
  productId: string | null
  categoryId: string | null
  conditions: Record<string, unknown>
  discountType: string
  discountValue: number
  priority: number
}
