'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Tag, Users, Layers, Percent } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { PricingRuleForm } from '@/components/pricing/PricingRuleForm'
import { ApprovalSettingsCard } from '@/components/pricing/ApprovalSettingsCard'
import {
  getPricingRules,
  deletePricingRule,
  togglePricingRuleActive,
  getApprovalSettings,
} from '@/actions/pricing'
import type { PricingRule, ApprovalSetting } from '@/types'

const RULE_TYPE_CONFIG = {
  tier: { label: '數量階梯', icon: Layers, color: 'bg-blue-500' },
  customer_level: { label: '客戶分級', icon: Users, color: 'bg-green-500' },
  bundle: { label: '組合套餐', icon: Tag, color: 'bg-purple-500' },
  promotion: { label: '促銷活動', icon: Percent, color: 'bg-orange-500' },
}

const DISCOUNT_TYPE_LABELS = {
  percentage: '百分比折扣',
  fixed: '固定金額折扣',
  price_override: '價格覆蓋',
}

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([])
  const [approvalSettings, setApprovalSettings] = useState<ApprovalSetting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showFormDialog, setShowFormDialog] = useState(false)
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [deletingRule, setDeletingRule] = useState<PricingRule | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    setIsLoading(true)
    const [rulesResult, settingsResult] = await Promise.all([
      getPricingRules(),
      getApprovalSettings(),
    ])

    if (rulesResult.data) setRules(rulesResult.data)
    if (settingsResult.data) setApprovalSettings(settingsResult.data)
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleEdit = (rule: PricingRule) => {
    setEditingRule(rule)
    setShowFormDialog(true)
  }

  const handleDelete = async () => {
    if (!deletingRule) return

    const result = await deletePricingRule(deletingRule.id)
    if (result.success) {
      toast({ title: '刪除成功', description: '定價規則已刪除' })
      loadData()
    } else {
      toast({ title: '刪除失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
    setDeletingRule(null)
  }

  const handleToggleActive = async (rule: PricingRule) => {
    const result = await togglePricingRuleActive(rule.id, !rule.is_active)
    if (result.success) {
      toast({
        title: rule.is_active ? '已停用' : '已啟用',
        description: `${rule.name} 已${rule.is_active ? '停用' : '啟用'}`,
      })
      loadData()
    } else {
      toast({ title: '操作失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
  }

  const handleFormSuccess = () => {
    setShowFormDialog(false)
    setEditingRule(null)
    loadData()
  }

  const formatDiscountValue = (rule: PricingRule) => {
    if (rule.discount_type === 'percentage') {
      return `${rule.discount_value}%`
    } else if (rule.discount_type === 'fixed') {
      return `NT$${rule.discount_value.toLocaleString()}`
    } else {
      return `NT$${rule.discount_value.toLocaleString()}`
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('zh-TW')
  }

  const isRuleExpired = (rule: PricingRule) => {
    if (!rule.end_date) return false
    return new Date(rule.end_date) < new Date()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">定價規則管理</h1>
          <p className="text-muted-foreground">設定產品定價規則與審批流程</p>
        </div>
      </div>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rules">定價規則</TabsTrigger>
          <TabsTrigger value="approval">審批設定</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {/* Rule Type Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {Object.entries(RULE_TYPE_CONFIG).map(([type, config]) => {
              const count = rules.filter((r) => r.rule_type === type).length
              const activeCount = rules.filter((r) => r.rule_type === type && r.is_active).length
              const Icon = config.icon
              return (
                <Card key={type}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{config.label}</p>
                        <p className="text-2xl font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground">{activeCount} 個啟用中</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Rules Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>所有規則</CardTitle>
                <CardDescription>管理所有定價規則，優先順序高的規則會先套用</CardDescription>
              </div>
              <Button onClick={() => setShowFormDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新增規則
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  尚無定價規則，點擊「新增規則」開始設定
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>規則名稱</TableHead>
                        <TableHead>類型</TableHead>
                        <TableHead>折扣</TableHead>
                        <TableHead>有效期間</TableHead>
                        <TableHead className="text-center">優先順序</TableHead>
                        <TableHead className="text-center">狀態</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => {
                        const typeConfig = RULE_TYPE_CONFIG[rule.rule_type as keyof typeof RULE_TYPE_CONFIG]
                        const TypeIcon = typeConfig?.icon || Tag
                        const expired = isRuleExpired(rule)

                        return (
                          <TableRow key={rule.id} className={expired ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="font-medium">{rule.name}</div>
                              {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                                <div className="text-xs text-muted-foreground">
                                  {'min_qty' in rule.conditions && `最低數量: ${String(rule.conditions.min_qty)}`}
                                  {'customer_level' in rule.conditions && ` 客戶等級: ${String(rule.conditions.customer_level)}`}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded ${typeConfig?.color || 'bg-gray-500'}`}>
                                  <TypeIcon className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-sm">{typeConfig?.label || rule.rule_type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <span className="font-medium">{formatDiscountValue(rule)}</span>
                                <span className="text-muted-foreground ml-1">
                                  ({DISCOUNT_TYPE_LABELS[rule.discount_type as keyof typeof DISCOUNT_TYPE_LABELS]})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {rule.start_date || rule.end_date ? (
                                  <>
                                    {formatDate(rule.start_date)} ~ {formatDate(rule.end_date)}
                                    {expired && (
                                      <Badge variant="secondary" className="ml-2">已過期</Badge>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">永久有效</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{rule.priority}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                                {rule.is_active ? '啟用' : '停用'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleActive(rule)}
                                  title={rule.is_active ? '停用' : '啟用'}
                                >
                                  {rule.is_active ? (
                                    <ToggleRight className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ToggleLeft className="h-4 w-4 text-gray-400" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(rule)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeletingRule(rule)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <ApprovalSettingsCard
            settings={approvalSettings}
            onUpdate={loadData}
          />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? '編輯定價規則' : '新增定價規則'}</DialogTitle>
            <DialogDescription>
              設定產品定價規則，包含折扣類型、條件與有效期間
            </DialogDescription>
          </DialogHeader>
          <PricingRuleForm
            rule={editingRule}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setShowFormDialog(false)
              setEditingRule(null)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRule} onOpenChange={() => setDeletingRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除「{deletingRule?.name}」嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
