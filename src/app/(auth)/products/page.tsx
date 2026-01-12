'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductForm, ProductsTable } from '@/components/products'
import {
  getProducts,
  getProductCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductActive,
} from '@/actions/products'
import { toast } from 'sonner'
import type { Product, ProductCategory, ProductFormData } from '@/types'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [productsResult, categoriesResult] = await Promise.all([
        getProducts({
          search: searchQuery || undefined,
          category_id: categoryFilter === 'all' ? undefined : categoryFilter,
          is_active: activeFilter === 'all' ? undefined : activeFilter === 'true',
        }),
        getProductCategories(),
      ])

      if (productsResult.error) {
        toast.error(productsResult.error)
      } else {
        setProducts(productsResult.data || [])
      }

      if (categoriesResult.data) {
        setCategories(categoriesResult.data)
      }
    } catch {
      toast.error('載入資料失敗')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, categoryFilter, activeFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true)
    try {
      if (editingProduct) {
        const result = await updateProduct(editingProduct.id, data)
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('產品更新成功')
      } else {
        const result = await createProduct(data)
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('產品建立成功')
      }
      setIsDialogOpen(false)
      setEditingProduct(null)
      loadData()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteProduct(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('產品已刪除')
      loadData()
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    const result = await toggleProductActive(id, isActive)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(isActive ? '產品已上架' : '產品已下架')
      loadData()
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingProduct(null)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">產品管理</h1>
          <p className="text-muted-foreground">管理您的產品目錄和定價</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增產品
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋產品名稱或編號..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="所有分類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有分類</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeFilter} onValueChange={setActiveFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="所有狀態" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有狀態</SelectItem>
            <SelectItem value="true">上架中</SelectItem>
            <SelectItem value="false">已下架</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : (
        <ProductsTable
          products={products}
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? '編輯產品' : '新增產品'}
            </DialogTitle>
          </DialogHeader>
          <ProductForm
            product={editingProduct}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={handleCloseDialog}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
