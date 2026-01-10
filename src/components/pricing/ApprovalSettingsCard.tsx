'use client'

import { useState } from 'react'
import { Shield, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { updateApprovalSetting } from '@/actions/pricing'
import type { ApprovalSetting } from '@/types'

interface ApprovalSettingsCardProps {
  settings: ApprovalSetting[]
  onUpdate: () => void
}

const ROLE_LABELS: Record<string, string> = {
  manager: '主管',
  admin: '管理員',
  director: '總監',
}

export function ApprovalSettingsCard({ settings, onUpdate }: ApprovalSettingsCardProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{
    threshold_amount?: number
    approver_role?: string
  }>({})
  const { toast } = useToast()

  const handleEdit = (setting: ApprovalSetting) => {
    setEditingId(setting.id)
    setEditValues({
      threshold_amount: setting.threshold_amount,
      approver_role: setting.approver_role,
    })
  }

  const handleSave = async (id: string) => {
    const result = await updateApprovalSetting(id, editValues)
    if (result.success) {
      toast({ title: '更新成功', description: '審批設定已更新' })
      setEditingId(null)
      onUpdate()
    } else {
      toast({ title: '更新失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
  }

  const handleToggleActive = async (setting: ApprovalSetting) => {
    const result = await updateApprovalSetting(setting.id, { is_active: !setting.is_active })
    if (result.success) {
      toast({
        title: setting.is_active ? '已停用' : '已啟用',
        description: `審批規則已${setting.is_active ? '停用' : '啟用'}`,
      })
      onUpdate()
    } else {
      toast({ title: '操作失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
  }

  const formatCurrency = (amount: number) => {
    return `NT$${new Intl.NumberFormat('zh-TW').format(amount)}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle>審批設定</CardTitle>
        </div>
        <CardDescription>
          設定報價單金額門檻，超過門檻需要審批才能發送給客戶
        </CardDescription>
      </CardHeader>
      <CardContent>
        {settings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>尚無審批設定</p>
            <p className="text-sm mt-1">請聯繫管理員在資料庫中新增審批規則</p>
          </div>
        ) : (
          <div className="space-y-4">
            {settings.map((setting) => (
              <div
                key={setting.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                {editingId === setting.id ? (
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">金額超過</span>
                      <Input
                        type="number"
                        value={editValues.threshold_amount || 0}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            threshold_amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-32"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">需由</span>
                      <Select
                        value={editValues.approver_role || 'manager'}
                        onValueChange={(value) =>
                          setEditValues({ ...editValues, approver_role: value })
                        }
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">主管</SelectItem>
                          <SelectItem value="admin">管理員</SelectItem>
                          <SelectItem value="director">總監</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">審批</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSave(setting.id)}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">
                          金額超過 {formatCurrency(setting.threshold_amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          需由 {ROLE_LABELS[setting.approver_role] || setting.approver_role} 審批
                        </p>
                      </div>
                      <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                        {setting.is_active ? '啟用中' : '已停用'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={setting.is_active}
                        onCheckedChange={() => handleToggleActive(setting)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(setting)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">審批流程說明</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• 報價單金額超過設定門檻時，需經過審批才能發送</li>
            <li>• 多個審批規則同時適用時，以最高門檻的審批者為準</li>
            <li>• 審批者會收到 Email 通知（未來功能）</li>
            <li>• 審批記錄會保存在報價單歷史中</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
