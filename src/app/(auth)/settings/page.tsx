'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  FileText,
  Building,
  Plus,
  Pencil,
  Trash2,
  Star,
  Check,
  ShieldCheck,
  Cloud,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  setDefaultTemplate,
  type QuoteTemplate,
  type TemplateFormData,
} from '@/actions/templates'
import {
  getOrganizationSettings,
  updateCompanyInfo,
  updateDefaultSettings,
  getApprovalSettings,
  createApprovalSetting,
  updateApprovalSetting,
  deleteApprovalSetting,
  type OrganizationSettings,
  type ApprovalSetting,
  type ApprovalSettingFormData,
} from '@/actions/settings'
import { CURRENCIES } from '@/config/constants'
import { CloudProductsCard } from '@/components/settings'

const APPROVER_ROLES = [
  { value: 'manager', label: '主管' },
  { value: 'admin', label: '管理員' },
  { value: 'finance', label: '財務' },
]

export default function SettingsPage() {
  // Templates state
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] = useState<QuoteTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState<TemplateFormData>({
    name: '',
    is_default: false,
    primary_color: '#3b82f6',
    terms_content: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Organization settings state
  const [orgSettings, setOrgSettings] = useState<OrganizationSettings | null>(null)
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    tax_id: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  })
  const [defaultsForm, setDefaultsForm] = useState({
    default_tax_rate: 5,
    default_validity_days: 30,
    default_currency: 'TWD',
    default_payment_terms: '訂單確認後 30 天內付款',
    default_delivery_terms: '工廠交貨 (EXW)',
  })
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [isSavingDefaults, setIsSavingDefaults] = useState(false)

  // Approval settings state
  const [approvalSettings, setApprovalSettings] = useState<ApprovalSetting[]>([])
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [editingApproval, setEditingApproval] = useState<ApprovalSetting | null>(null)
  const [deletingApproval, setDeletingApproval] = useState<ApprovalSetting | null>(null)
  const [approvalForm, setApprovalForm] = useState<ApprovalSettingFormData>({
    name: '',
    threshold_amount: 100000,
    approver_role: 'manager',
    is_active: true,
  })

  const { toast } = useToast()

  const loadData = async () => {
    setIsLoading(true)
    const [templatesResult, settingsResult, approvalsResult] = await Promise.all([
      getTemplates(),
      getOrganizationSettings(),
      getApprovalSettings(),
    ])

    if (templatesResult.data) setTemplates(templatesResult.data)
    if (settingsResult.data) {
      setOrgSettings(settingsResult.data)
      setCompanyForm({
        company_name: settingsResult.data.company_name || '',
        tax_id: settingsResult.data.tax_id || '',
        address: settingsResult.data.address || '',
        phone: settingsResult.data.phone || '',
        email: settingsResult.data.email || '',
        website: settingsResult.data.website || '',
      })
      setDefaultsForm({
        default_tax_rate: (settingsResult.data.default_tax_rate || 0.05) * 100,
        default_validity_days: settingsResult.data.default_validity_days || 30,
        default_currency: settingsResult.data.default_currency || 'TWD',
        default_payment_terms: settingsResult.data.default_payment_terms || '訂單確認後 30 天內付款',
        default_delivery_terms: settingsResult.data.default_delivery_terms || '工廠交貨 (EXW)',
      })
    }
    if (approvalsResult.data) setApprovalSettings(approvalsResult.data)

    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Template handlers
  const handleOpenTemplateDialog = (template?: QuoteTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setTemplateForm({
        name: template.name,
        is_default: template.is_default,
        primary_color: template.primary_color || '#3b82f6',
        logo_url: template.logo_url,
        header_content: template.header_content,
        footer_content: template.footer_content,
        terms_content: template.terms_content,
      })
    } else {
      setEditingTemplate(null)
      setTemplateForm({
        name: '',
        is_default: false,
        primary_color: '#3b82f6',
        terms_content: '',
      })
    }
    setShowTemplateDialog(true)
  }

  const handleSaveTemplate = async () => {
    if (!templateForm.name.trim()) {
      toast({ title: '請輸入模板名稱', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)

    let result
    if (editingTemplate) {
      result = await updateTemplate(editingTemplate.id, templateForm)
    } else {
      result = await createTemplate(templateForm)
    }

    if (result.error) {
      toast({
        title: editingTemplate ? '更新失敗' : '建立失敗',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: editingTemplate ? '更新成功' : '建立成功',
        description: `模板「${templateForm.name}」已${editingTemplate ? '更新' : '建立'}`,
      })
      setShowTemplateDialog(false)
      loadData()
    }

    setIsSubmitting(false)
  }

  const handleDeleteTemplate = async () => {
    if (!deletingTemplate) return

    const result = await deleteTemplate(deletingTemplate.id)
    if (result.success) {
      toast({ title: '刪除成功', description: '模板已刪除' })
      loadData()
    } else {
      toast({ title: '刪除失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
    setDeletingTemplate(null)
  }

  const handleSetDefault = async (template: QuoteTemplate) => {
    const result = await setDefaultTemplate(template.id)
    if (result.success) {
      toast({ title: '設定成功', description: `「${template.name}」已設為預設模板` })
      loadData()
    } else {
      toast({ title: '設定失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
  }

  // Company info handlers
  const handleSaveCompanyInfo = async () => {
    setIsSavingCompany(true)
    const result = await updateCompanyInfo({
      company_name: companyForm.company_name || null,
      tax_id: companyForm.tax_id || null,
      address: companyForm.address || null,
      phone: companyForm.phone || null,
      email: companyForm.email || null,
      website: companyForm.website || null,
    })

    if (result.success) {
      toast({ title: '儲存成功', description: '公司資訊已更新' })
    } else {
      toast({ title: '儲存失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
    setIsSavingCompany(false)
  }

  // Default settings handlers
  const handleSaveDefaults = async () => {
    setIsSavingDefaults(true)
    const result = await updateDefaultSettings({
      default_tax_rate: defaultsForm.default_tax_rate / 100,
      default_validity_days: defaultsForm.default_validity_days,
      default_currency: defaultsForm.default_currency,
      default_payment_terms: defaultsForm.default_payment_terms || null,
      default_delivery_terms: defaultsForm.default_delivery_terms || null,
    })

    if (result.success) {
      toast({ title: '儲存成功', description: '預設值已更新' })
    } else {
      toast({ title: '儲存失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
    setIsSavingDefaults(false)
  }

  // Approval settings handlers
  const handleOpenApprovalDialog = (approval?: ApprovalSetting) => {
    if (approval) {
      setEditingApproval(approval)
      setApprovalForm({
        name: approval.name,
        threshold_amount: approval.threshold_amount,
        approver_role: approval.approver_role,
        is_active: approval.is_active,
      })
    } else {
      setEditingApproval(null)
      setApprovalForm({
        name: '',
        threshold_amount: 100000,
        approver_role: 'manager',
        is_active: true,
      })
    }
    setShowApprovalDialog(true)
  }

  const handleSaveApproval = async () => {
    if (!approvalForm.name.trim()) {
      toast({ title: '請輸入規則名稱', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)

    let result
    if (editingApproval) {
      result = await updateApprovalSetting(editingApproval.id, approvalForm)
    } else {
      result = await createApprovalSetting(approvalForm)
    }

    if (result.error) {
      toast({
        title: editingApproval ? '更新失敗' : '建立失敗',
        description: result.error,
        variant: 'destructive',
      })
    } else {
      toast({
        title: editingApproval ? '更新成功' : '建立成功',
        description: `審批規則「${approvalForm.name}」已${editingApproval ? '更新' : '建立'}`,
      })
      setShowApprovalDialog(false)
      loadData()
    }

    setIsSubmitting(false)
  }

  const handleDeleteApproval = async () => {
    if (!deletingApproval) return

    const result = await deleteApprovalSetting(deletingApproval.id)
    if (result.success) {
      toast({ title: '刪除成功', description: '審批規則已刪除' })
      loadData()
    } else {
      toast({ title: '刪除失敗', description: result.error || '發生錯誤', variant: 'destructive' })
    }
    setDeletingApproval(null)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">系統設定</h1>
        <p className="text-muted-foreground">管理報價單模板、公司資訊與系統設定</p>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            報價單模板
          </TabsTrigger>
          <TabsTrigger value="company">
            <Building className="h-4 w-4 mr-2" />
            公司資訊
          </TabsTrigger>
          <TabsTrigger value="defaults">
            <Settings className="h-4 w-4 mr-2" />
            預設值
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <ShieldCheck className="h-4 w-4 mr-2" />
            審批規則
          </TabsTrigger>
          <TabsTrigger value="cloud">
            <Cloud className="h-4 w-4 mr-2" />
            雲端產品
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>報價單模板</CardTitle>
                <CardDescription>管理報價單的外觀與預設條款</CardDescription>
              </div>
              <Button onClick={() => handleOpenTemplateDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                新增模板
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  尚無模板，點擊「新增模板」開始建立
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card key={template.id} className="relative">
                      {template.is_default && (
                        <Badge className="absolute top-2 right-2 bg-yellow-500">
                          <Star className="h-3 w-3 mr-1" />
                          預設
                        </Badge>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: template.primary_color || '#3b82f6' }}
                          />
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {template.terms_content || '未設定條款內容'}
                        </p>
                        <div className="flex items-center gap-2">
                          {!template.is_default && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSetDefault(template)}
                            >
                              <Star className="h-3 w-3 mr-1" />
                              設為預設
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenTemplateDialog(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingTemplate(template)}
                            disabled={template.is_default}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Company Info Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>公司資訊</CardTitle>
              <CardDescription>這些資訊會顯示在報價單上</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="company_name">公司名稱</Label>
                  <Input
                    id="company_name"
                    placeholder="您的公司名稱"
                    value={companyForm.company_name}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, company_name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">統一編號</Label>
                  <Input
                    id="tax_id"
                    placeholder="12345678"
                    value={companyForm.tax_id}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, tax_id: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">公司地址</Label>
                <Input
                  id="address"
                  placeholder="公司地址"
                  value={companyForm.address}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, address: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">聯絡電話</Label>
                  <Input
                    id="phone"
                    placeholder="02-1234-5678"
                    value={companyForm.phone}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">電子郵件</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@company.com"
                    value={companyForm.email}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">公司網站</Label>
                <Input
                  id="website"
                  placeholder="https://www.company.com"
                  value={companyForm.website}
                  onChange={(e) =>
                    setCompanyForm({ ...companyForm, website: e.target.value })
                  }
                />
              </div>
              <div className="pt-4">
                <Button onClick={handleSaveCompanyInfo} disabled={isSavingCompany}>
                  <Check className="mr-2 h-4 w-4" />
                  {isSavingCompany ? '儲存中...' : '儲存變更'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Defaults Tab */}
        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle>預設值設定</CardTitle>
              <CardDescription>新建報價單時的預設值</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>預設稅率</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={defaultsForm.default_tax_rate}
                      onChange={(e) =>
                        setDefaultsForm({
                          ...defaultsForm,
                          default_tax_rate: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-24"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>報價單有效天數</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={defaultsForm.default_validity_days}
                      onChange={(e) =>
                        setDefaultsForm({
                          ...defaultsForm,
                          default_validity_days: parseInt(e.target.value) || 30,
                        })
                      }
                      className="w-24"
                      min="1"
                    />
                    <span className="text-muted-foreground">天</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>預設幣別</Label>
                <div className="flex gap-2">
                  {CURRENCIES.map((currency) => (
                    <Badge
                      key={currency.value}
                      variant={
                        defaultsForm.default_currency === currency.value ? 'default' : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() =>
                        setDefaultsForm({ ...defaultsForm, default_currency: currency.value })
                      }
                    >
                      {currency.symbol} {currency.label}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>預設付款條件</Label>
                <Textarea
                  placeholder="例如：訂單確認後 30 天內付款"
                  value={defaultsForm.default_payment_terms}
                  onChange={(e) =>
                    setDefaultsForm({ ...defaultsForm, default_payment_terms: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>預設交貨條件</Label>
                <Textarea
                  placeholder="例如：工廠交貨 (EXW)"
                  value={defaultsForm.default_delivery_terms}
                  onChange={(e) =>
                    setDefaultsForm({ ...defaultsForm, default_delivery_terms: e.target.value })
                  }
                />
              </div>

              <div className="pt-4">
                <Button onClick={handleSaveDefaults} disabled={isSavingDefaults}>
                  <Check className="mr-2 h-4 w-4" />
                  {isSavingDefaults ? '儲存中...' : '儲存變更'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval Settings Tab */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>審批規則</CardTitle>
                <CardDescription>設定報價單需要審批的金額門檻與審批者</CardDescription>
              </div>
              <Button onClick={() => handleOpenApprovalDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                新增規則
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">載入中...</div>
              ) : approvalSettings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  尚無審批規則，點擊「新增規則」開始建立
                </div>
              ) : (
                <div className="space-y-4">
                  {approvalSettings.map((setting) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            setting.is_active ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                        <div>
                          <div className="font-medium">{setting.name}</div>
                          <div className="text-sm text-muted-foreground">
                            金額 &gt; {formatCurrency(setting.threshold_amount)} 需由
                            {APPROVER_ROLES.find((r) => r.value === setting.approver_role)?.label ||
                              setting.approver_role}
                            審批
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={setting.is_active ? 'default' : 'secondary'}>
                          {setting.is_active ? '啟用' : '停用'}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenApprovalDialog(setting)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingApproval(setting)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cloud Products Tab */}
        <TabsContent value="cloud">
          <CloudProductsCard />
        </TabsContent>
      </Tabs>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? '編輯模板' : '新增模板'}</DialogTitle>
            <DialogDescription>設定報價單模板的外觀與預設內容</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="template_name">模板名稱 *</Label>
                <Input
                  id="template_name"
                  value={templateForm.name}
                  onChange={(e) =>
                    setTemplateForm({ ...templateForm, name: e.target.value })
                  }
                  placeholder="輸入模板名稱"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_color">主題顏色</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="primary_color"
                    type="color"
                    value={templateForm.primary_color || '#3b82f6'}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, primary_color: e.target.value })
                    }
                    className="w-12 h-10 p-1"
                  />
                  <Input
                    value={templateForm.primary_color || '#3b82f6'}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, primary_color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={templateForm.logo_url || ''}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, logo_url: e.target.value })
                }
                placeholder="https://example.com/logo.png"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="header_content">頁首內容</Label>
              <Textarea
                id="header_content"
                value={templateForm.header_content || ''}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, header_content: e.target.value })
                }
                placeholder="報價單頁首文字..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms_content">標準條款</Label>
              <Textarea
                id="terms_content"
                value={templateForm.terms_content || ''}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, terms_content: e.target.value })
                }
                placeholder="輸入標準條款內容..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer_content">頁尾內容</Label>
              <Textarea
                id="footer_content"
                value={templateForm.footer_content || ''}
                onChange={(e) =>
                  setTemplateForm({ ...templateForm, footer_content: e.target.value })
                }
                placeholder="報價單頁尾文字..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>設為預設模板</Label>
                <p className="text-sm text-muted-foreground">新建報價單時自動套用此模板</p>
              </div>
              <Switch
                checked={templateForm.is_default}
                onCheckedChange={(checked) =>
                  setTemplateForm({ ...templateForm, is_default: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveTemplate} disabled={isSubmitting}>
              {isSubmitting ? '儲存中...' : editingTemplate ? '更新模板' : '建立模板'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingApproval ? '編輯審批規則' : '新增審批規則'}</DialogTitle>
            <DialogDescription>設定需要審批的金額門檻與審批者角色</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval_name">規則名稱 *</Label>
              <Input
                id="approval_name"
                value={approvalForm.name}
                onChange={(e) =>
                  setApprovalForm({ ...approvalForm, name: e.target.value })
                }
                placeholder="例如：大額訂單審批"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold_amount">金額門檻</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">NT$</span>
                <Input
                  id="threshold_amount"
                  type="number"
                  value={approvalForm.threshold_amount}
                  onChange={(e) =>
                    setApprovalForm({
                      ...approvalForm,
                      threshold_amount: parseInt(e.target.value) || 0,
                    })
                  }
                  min="0"
                  step="10000"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                報價單金額超過此門檻時需要審批
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="approver_role">審批者角色</Label>
              <Select
                value={approvalForm.approver_role}
                onValueChange={(value) =>
                  setApprovalForm({ ...approvalForm, approver_role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPROVER_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      {role.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>啟用規則</Label>
                <p className="text-sm text-muted-foreground">停用後此規則將不會生效</p>
              </div>
              <Switch
                checked={approvalForm.is_active}
                onCheckedChange={(checked) =>
                  setApprovalForm({ ...approvalForm, is_active: checked })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveApproval} disabled={isSubmitting}>
              {isSubmitting ? '儲存中...' : editingApproval ? '更新規則' : '建立規則'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除「{deletingTemplate?.name}」模板嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              className="bg-destructive text-destructive-foreground"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Approval Confirmation */}
      <AlertDialog open={!!deletingApproval} onOpenChange={() => setDeletingApproval(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除「{deletingApproval?.name}」審批規則嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteApproval}
              className="bg-destructive text-destructive-foreground"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
