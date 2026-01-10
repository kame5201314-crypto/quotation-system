// Business logic constants

// Default org_id (will be replaced with actual multi-tenancy later)
export const DEFAULT_ORG_ID = 'default'

// Quote number prefix
export const QUOTE_NUMBER_PREFIX = 'Q'

// Currency options
export const CURRENCIES = [
  { value: 'TWD', label: 'TWD (新台幣)', symbol: 'NT$' },
  { value: 'USD', label: 'USD (美元)', symbol: '$' },
  { value: 'CNY', label: 'CNY (人民幣)', symbol: '¥' },
  { value: 'EUR', label: 'EUR (歐元)', symbol: '€' },
  { value: 'JPY', label: 'JPY (日圓)', symbol: '¥' },
] as const

// Customer levels
export const CUSTOMER_LEVELS = [
  { value: 'vip', label: 'VIP', color: 'bg-yellow-500' },
  { value: 'normal', label: '一般', color: 'bg-blue-500' },
  { value: 'new', label: '新客', color: 'bg-green-500' },
] as const

// Quote statuses
export const QUOTE_STATUSES = [
  { value: 'draft', label: '草稿', color: 'bg-gray-500' },
  { value: 'pending_approval', label: '待審批', color: 'bg-yellow-500' },
  { value: 'approved', label: '已審批', color: 'bg-blue-500' },
  { value: 'sent', label: '已發送', color: 'bg-purple-500' },
  { value: 'accepted', label: '已接受', color: 'bg-green-500' },
  { value: 'rejected', label: '已拒絕', color: 'bg-red-500' },
  { value: 'expired', label: '已過期', color: 'bg-orange-500' },
  { value: 'cancelled', label: '已取消', color: 'bg-gray-400' },
] as const

// Pricing rule types
export const PRICING_RULE_TYPES = [
  { value: 'tier', label: '數量階梯' },
  { value: 'customer_level', label: '客戶分級' },
  { value: 'bundle', label: '組合套餐' },
  { value: 'promotion', label: '促銷活動' },
] as const

// Discount types
export const DISCOUNT_TYPES = [
  { value: 'percentage', label: '百分比折扣' },
  { value: 'fixed', label: '固定金額折扣' },
  { value: 'price_override', label: '直接定價' },
] as const

// Default tax rate (5% in Taiwan)
export const DEFAULT_TAX_RATE = 0.05

// Default quote validity (30 days)
export const DEFAULT_QUOTE_VALIDITY_DAYS = 30

// Pagination
export const DEFAULT_PAGE_SIZE = 20

// Product units
export const PRODUCT_UNITS = [
  { value: '件', label: '件' },
  { value: '個', label: '個' },
  { value: '組', label: '組' },
  { value: '箱', label: '箱' },
  { value: '包', label: '包' },
  { value: '台', label: '台' },
  { value: '套', label: '套' },
  { value: '公斤', label: '公斤' },
  { value: '公尺', label: '公尺' },
] as const
