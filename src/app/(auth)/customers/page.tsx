'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
import { CustomerForm, CustomersTable } from '@/components/customers'
import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '@/actions/customers'
import { toast } from 'sonner'
import { CUSTOMER_LEVELS } from '@/config/constants'
import type { Customer, CustomerFormData } from '@/types'

export default function CustomersPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getCustomers({
        search: searchQuery || undefined,
        customer_level: levelFilter as 'vip' | 'normal' | 'new' | undefined,
      })

      if (result.error) {
        toast.error(result.error)
      } else {
        setCustomers(result.data || [])
      }
    } catch {
      toast.error('載入資料失敗')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, levelFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSubmit = async (data: CustomerFormData) => {
    setIsSubmitting(true)
    try {
      if (editingCustomer) {
        const result = await updateCustomer(editingCustomer.id, data)
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('客戶更新成功')
      } else {
        const result = await createCustomer(data)
        if (result.error) {
          toast.error(result.error)
          return
        }
        toast.success('客戶建立成功')
      }
      setIsDialogOpen(false)
      setEditingCustomer(null)
      loadData()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteCustomer(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('客戶已刪除')
      loadData()
    }
  }

  const handleViewQuotes = (customerId: string) => {
    router.push(`/quotes?customer_id=${customerId}`)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCustomer(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">客戶管理</h1>
          <p className="text-muted-foreground">管理您的客戶資料庫</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新增客戶
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋公司名稱、聯絡人或 Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="所有等級" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">所有等級</SelectItem>
            {CUSTOMER_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Customers Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">載入中...</div>
      ) : (
        <CustomersTable
          customers={customers}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onViewQuotes={handleViewQuotes}
        />
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? '編輯客戶' : '新增客戶'}
            </DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={editingCustomer}
            onSubmit={handleSubmit}
            onCancel={handleCloseDialog}
            isLoading={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
