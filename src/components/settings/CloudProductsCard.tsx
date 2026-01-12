'use client'

import { useState, useEffect } from 'react'
import { Cloud, RefreshCw, Check, ExternalLink, Search, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  getCloudProductSettings,
  saveCloudProductSettings,
  fetchCloudProducts,
  type CloudProduct,
} from '@/actions/cloud-products'

export function CloudProductsCard() {
  const [sheetUrl, setSheetUrl] = useState('')
  const [products, setProducts] = useState<CloudProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setIsLoading(true)
    const { data } = await getCloudProductSettings()
    if (data) {
      setSheetUrl(data.google_sheet_url || '')
      setLastSynced(data.last_synced_at)

      // Load products if URL exists
      if (data.google_sheet_url) {
        const { data: productData } = await fetchCloudProducts(data.google_sheet_url)
        if (productData) setProducts(productData)
      }
    }
    setIsLoading(false)
  }

  const handleSave = async () => {
    setIsSaving(true)
    const { success, error } = await saveCloudProductSettings(sheetUrl)

    if (success) {
      toast({ title: '儲存成功', description: '雲端產品設定已更新' })
      loadSettings()
    } else {
      toast({ title: '儲存失敗', description: error || '發生錯誤', variant: 'destructive' })
    }
    setIsSaving(false)
  }

  const handleSync = async () => {
    if (!sheetUrl) return

    setIsSyncing(true)
    const { data, error } = await fetchCloudProducts(sheetUrl)

    if (error) {
      toast({ title: '同步失敗', description: error, variant: 'destructive' })
    } else if (data) {
      setProducts(data)
      toast({ title: '同步成功', description: `已載入 ${data.length} 筆產品` })
    }
    setIsSyncing(false)
  }

  const filteredProducts = products.filter(p =>
    !searchQuery ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatCurrency = (amount: number) => {
    return `NT$${amount.toLocaleString()}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('zh-TW')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Cloud className="h-5 w-5 text-blue-500" />
          <CardTitle>雲端產品價格</CardTitle>
        </div>
        <CardDescription>
          連結 Google Sheets 自動同步產品價格，建立報價單時可直接輸入貨號帶入價格
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Setup Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>設定說明</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>1. 在 Google Sheets 建立產品清單，需包含以下欄位：</p>
            <ul className="list-disc list-inside ml-4 text-sm">
              <li><strong>貨號</strong>（或 SKU、產品編號）</li>
              <li><strong>品名</strong>（或 name、產品名稱）</li>
              <li><strong>單價</strong>（或 price、價格）</li>
            </ul>
            <p>2. 點擊「檔案」→「共用」→「發布到網路」，選擇「整份文件」並發布</p>
            <p>3. 複製 Google Sheets 網址貼到下方</p>
          </AlertDescription>
        </Alert>

        {/* URL Input */}
        <div className="space-y-2">
          <Label htmlFor="sheet_url">Google Sheets 連結</Label>
          <div className="flex gap-2">
            <Input
              id="sheet_url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSave} disabled={isSaving}>
              <Check className="h-4 w-4 mr-2" />
              {isSaving ? '儲存中...' : '儲存'}
            </Button>
          </div>
          {lastSynced && (
            <p className="text-xs text-muted-foreground">
              上次同步：{formatDate(lastSynced)}
            </p>
          )}
        </div>

        {/* Sync Button & Search */}
        {sheetUrl && (
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? '同步中...' : '重新同步'}
            </Button>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜尋貨號或品名..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Badge variant="secondary">{products.length} 筆產品</Badge>
          </div>
        )}

        {/* Products Preview */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">載入中...</div>
        ) : products.length > 0 ? (
          <div className="rounded-md border max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background">貨號</TableHead>
                  <TableHead className="sticky top-0 bg-background">品名</TableHead>
                  <TableHead className="sticky top-0 bg-background text-right">單價</TableHead>
                  <TableHead className="sticky top-0 bg-background">單位</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.slice(0, 100).map((product, index) => (
                  <TableRow key={`${product.sku}-${index}`}>
                    <TableCell className="font-mono">{product.sku}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(product.unit_price)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.unit || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredProducts.length > 100 && (
              <div className="p-2 text-center text-sm text-muted-foreground border-t">
                顯示前 100 筆，共 {filteredProducts.length} 筆
              </div>
            )}
          </div>
        ) : sheetUrl ? (
          <div className="text-center py-8 text-muted-foreground">
            尚無產品資料，請點擊「重新同步」載入資料
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            請輸入 Google Sheets 連結以載入產品資料
          </div>
        )}

        {/* Help Link */}
        <div className="pt-4 border-t">
          <a
            href="https://support.google.com/docs/answer/183965"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            如何發布 Google Sheets 到網路？
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
