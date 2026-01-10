'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { createPricingRule, updatePricingRule } from '@/actions/pricing'
import type { PricingRule } from '@/types'

const pricingRuleSchema = z.object({
  name: z.string().min(1, '請輸入規則名稱'),
  rule_type: z.enum(['tier', 'customer_level', 'bundle', 'promotion']),
  discount_type: z.enum(['percentage', 'fixed', 'price_override']),
  discount_value: z.number().min(0, '折扣值不能為負數'),
  priority: z.number().min(0),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_active: z.boolean(),
  min_qty: z.number().optional(),
  customer_level: z.string().optional(),
})

type PricingRuleFormValues = z.infer<typeof pricingRuleSchema>

interface PricingRuleFormProps {
  rule?: PricingRule | null
  onSuccess: () => void
  onCancel: () => void
}

export function PricingRuleForm({ rule, onSuccess, onCancel }: PricingRuleFormProps) {
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PricingRuleFormValues>({
    resolver: zodResolver(pricingRuleSchema),
    defaultValues: {
      name: rule?.name || '',
      rule_type: (rule?.rule_type as PricingRuleFormValues['rule_type']) || 'tier',
      discount_type: (rule?.discount_type as PricingRuleFormValues['discount_type']) || 'percentage',
      discount_value: rule?.discount_value || 0,
      priority: rule?.priority || 0,
      start_date: rule?.start_date || '',
      end_date: rule?.end_date || '',
      is_active: rule?.is_active ?? true,
      min_qty: (rule?.conditions && 'min_qty' in rule.conditions ? rule.conditions.min_qty : undefined) as number | undefined,
      customer_level: (rule?.conditions && 'customer_level' in rule.conditions ? String(rule.conditions.customer_level) : undefined) as string | undefined,
    },
  })

  const ruleType = watch('rule_type')
  const discountType = watch('discount_type')

  const onSubmit = async (data: PricingRuleFormValues) => {
    const conditions: Record<string, unknown> = {}
    if (data.min_qty) conditions.min_qty = data.min_qty
    if (data.customer_level) conditions.customer_level = data.customer_level

    const formData = {
      name: data.name,
      rule_type: data.rule_type,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      priority: data.priority,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      is_active: data.is_active,
      conditions,
    }

    let result
    if (rule) {
      result = await updatePricingRule(rule.id, formData)
    } else {
      result = await createPricingRule(formData)
    }

    if (result.error) {
      toast({
        title: rule ? '更新失敗' : '建立失敗',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: rule ? '更新成功' : '建立成功',
        description: `定價規則「${data.name}」已${rule ? '更新' : '建立'}`,
      })
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">規則名稱 *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="輸入規則名稱"
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="rule_type">規則類型 *</Label>
          <Select
            value={watch('rule_type')}
            onValueChange={(value) => setValue('rule_type', value as PricingRuleFormValues['rule_type'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tier">數量階梯</SelectItem>
              <SelectItem value="customer_level">客戶分級</SelectItem>
              <SelectItem value="bundle">組合套餐</SelectItem>
              <SelectItem value="promotion">促銷活動</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conditional Fields based on rule type */}
      {ruleType === 'tier' && (
        <div className="space-y-2">
          <Label htmlFor="min_qty">最低數量</Label>
          <Input
            id="min_qty"
            type="number"
            {...register('min_qty', { valueAsNumber: true })}
            placeholder="達到此數量才套用此規則"
          />
        </div>
      )}

      {ruleType === 'customer_level' && (
        <div className="space-y-2">
          <Label htmlFor="customer_level">客戶等級</Label>
          <Select
            value={watch('customer_level') || ''}
            onValueChange={(value) => setValue('customer_level', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇客戶等級" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vip">VIP 客戶</SelectItem>
              <SelectItem value="normal">一般客戶</SelectItem>
              <SelectItem value="new">新客戶</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="discount_type">折扣類型 *</Label>
          <Select
            value={watch('discount_type')}
            onValueChange={(value) => setValue('discount_type', value as PricingRuleFormValues['discount_type'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">百分比折扣</SelectItem>
              <SelectItem value="fixed">固定金額折扣</SelectItem>
              <SelectItem value="price_override">價格覆蓋</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="discount_value">
            折扣值 * {discountType === 'percentage' ? '(%)' : '(NT$)'}
          </Label>
          <Input
            id="discount_value"
            type="number"
            step={discountType === 'percentage' ? '0.1' : '1'}
            {...register('discount_value', { valueAsNumber: true })}
            placeholder={discountType === 'percentage' ? '例如: 10 表示 10% off' : '例如: 100'}
          />
          {errors.discount_value && (
            <p className="text-sm text-destructive">{errors.discount_value.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_date">開始日期</Label>
          <Input
            id="start_date"
            type="date"
            {...register('start_date')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_date">結束日期</Label>
          <Input
            id="end_date"
            type="date"
            {...register('end_date')}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="priority">優先順序</Label>
          <Input
            id="priority"
            type="number"
            {...register('priority', { valueAsNumber: true })}
            placeholder="數字越大優先順序越高"
          />
          <p className="text-xs text-muted-foreground">數字越大，優先順序越高</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label>啟用狀態</Label>
            <p className="text-sm text-muted-foreground">
              {watch('is_active') ? '規則已啟用' : '規則已停用'}
            </p>
          </div>
          <Switch
            checked={watch('is_active')}
            onCheckedChange={(checked) => setValue('is_active', checked)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '儲存中...' : rule ? '更新規則' : '建立規則'}
        </Button>
      </div>
    </form>
  )
}
