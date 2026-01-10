import type { PricingContext, PricingResult, AppliedRuleInfo, CalculationRule } from './types'
import type { CustomerLevel } from '@/types'

/**
 * CPQ Pricing Engine
 *
 * Priority order (highest to lowest):
 * 1. Promotion rules (time-limited discounts)
 * 2. Bundle rules (product combinations)
 * 3. Tier rules (quantity-based pricing)
 * 4. Customer level rules (VIP/normal/new)
 * 5. Base price
 *
 * Rules with higher priority numbers are applied first.
 * Multiple rules can stack unless they conflict.
 */

// Check if a tier rule matches the quantity
function matchesTierCondition(
  conditions: Record<string, unknown>,
  quantity: number
): boolean {
  const minQty = (conditions.min_qty as number) || 0
  const maxQty = conditions.max_qty as number | undefined

  if (quantity < minQty) return false
  if (maxQty !== undefined && quantity > maxQty) return false

  return true
}

// Check if a customer level rule matches
function matchesCustomerLevelCondition(
  conditions: Record<string, unknown>,
  customerLevel: CustomerLevel
): boolean {
  const requiredLevel = conditions.level as string
  if (!requiredLevel) return true // No level specified = all levels

  return customerLevel === requiredLevel
}

// Check if a bundle rule matches (simplified - checks if product is in bundle)
function matchesBundleCondition(
  conditions: Record<string, unknown>,
  productId: string
): boolean {
  const bundleProductIds = conditions.product_ids as string[] | undefined
  if (!bundleProductIds || bundleProductIds.length === 0) return false

  return bundleProductIds.includes(productId)
}

// Check if a promotion rule is currently active
function isPromotionActive(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): boolean {
  const now = new Date()

  if (startDate && new Date(startDate) > now) return false
  if (endDate && new Date(endDate) < now) return false

  return true
}

// Calculate discount amount based on discount type
function calculateDiscount(
  price: number,
  discountType: string,
  discountValue: number
): { discountedPrice: number; discountAmount: number } {
  switch (discountType) {
    case 'percentage':
      // discountValue is the percentage (e.g., 10 for 10% off)
      const percentDiscount = price * (discountValue / 100)
      return {
        discountedPrice: price - percentDiscount,
        discountAmount: percentDiscount,
      }

    case 'fixed':
      // discountValue is a fixed amount to subtract
      return {
        discountedPrice: Math.max(0, price - discountValue),
        discountAmount: Math.min(price, discountValue),
      }

    case 'price_override':
      // discountValue is the new price
      return {
        discountedPrice: discountValue,
        discountAmount: price - discountValue,
      }

    default:
      return { discountedPrice: price, discountAmount: 0 }
  }
}

// Filter applicable rules for a given context
function filterApplicableRules(
  rules: CalculationRule[],
  context: PricingContext
): CalculationRule[] {
  return rules.filter((rule) => {
    // Check product/category match
    const productMatch =
      !rule.productId || rule.productId === context.productId
    const categoryMatch =
      !rule.categoryId || rule.categoryId === context.categoryId

    if (!productMatch && !categoryMatch) return false

    // Check rule-specific conditions
    switch (rule.ruleType) {
      case 'tier':
        return matchesTierCondition(rule.conditions, context.quantity)

      case 'customer_level':
        return matchesCustomerLevelCondition(rule.conditions, context.customerLevel)

      case 'bundle':
        return matchesBundleCondition(rule.conditions, context.productId)

      case 'promotion':
        return isPromotionActive(
          rule.conditions.start_date as string | undefined,
          rule.conditions.end_date as string | undefined
        )

      default:
        return true
    }
  })
}

// Main pricing calculation function
export function calculatePrice(
  context: PricingContext,
  rules: CalculationRule[]
): PricingResult {
  const { basePrice, quantity } = context

  // Filter and sort applicable rules by priority (descending)
  const applicableRules = filterApplicableRules(rules, context)
    .sort((a, b) => b.priority - a.priority)

  // Track applied rules and calculate final price
  const appliedRules: AppliedRuleInfo[] = []
  let currentPrice = basePrice
  let totalDiscountAmount = 0

  // Group rules by type to avoid stacking conflicts
  const rulesByType = new Map<string, CalculationRule[]>()
  for (const rule of applicableRules) {
    const existing = rulesByType.get(rule.ruleType) || []
    existing.push(rule)
    rulesByType.set(rule.ruleType, existing)
  }

  // Apply best rule from each type (highest priority)
  // Order: promotion > bundle > tier > customer_level
  const typeOrder = ['promotion', 'bundle', 'tier', 'customer_level']

  for (const ruleType of typeOrder) {
    const typeRules = rulesByType.get(ruleType)
    if (!typeRules || typeRules.length === 0) continue

    // Take the highest priority rule of this type
    const bestRule = typeRules[0]

    const { discountedPrice, discountAmount } = calculateDiscount(
      currentPrice,
      bestRule.discountType,
      bestRule.discountValue
    )

    if (discountAmount > 0) {
      appliedRules.push({
        ruleId: bestRule.id,
        ruleName: bestRule.name,
        ruleType: bestRule.ruleType,
        discountType: bestRule.discountType,
        discountValue: bestRule.discountValue,
        discountAmount,
        priority: bestRule.priority,
      })

      currentPrice = discountedPrice
      totalDiscountAmount += discountAmount
    }
  }

  // Calculate final values
  const unitPrice = Math.round(currentPrice * 100) / 100
  const lineTotal = Math.round(unitPrice * quantity * 100) / 100
  const discountPercentage =
    basePrice > 0
      ? Math.round(((basePrice - unitPrice) / basePrice) * 10000) / 100
      : 0

  return {
    originalPrice: basePrice,
    finalPrice: unitPrice,
    unitPrice,
    lineTotal,
    discountPercentage,
    discountAmount: totalDiscountAmount,
    appliedRules,
  }
}

// Calculate totals for multiple items
export function calculateQuoteTotals(
  items: Array<{ unitPrice: number; quantity: number }>,
  taxRate: number = 0.05,
  discountAmount: number = 0
): {
  subtotal: number
  taxAmount: number
  totalAmount: number
} {
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  )

  const taxableAmount = subtotal - discountAmount
  const taxAmount = Math.round(taxableAmount * taxRate * 100) / 100
  const totalAmount = Math.round((taxableAmount + taxAmount) * 100) / 100

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount,
    totalAmount,
  }
}
