'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { MoreHorizontal, Pencil, Trash2, FileText, Mail, Phone } from 'lucide-react'
import { CUSTOMER_LEVELS } from '@/config/constants'
import type { Customer } from '@/types'

interface CustomersTableProps {
  customers: Customer[]
  onEdit: (customer: Customer) => void
  onDelete: (id: string) => Promise<void>
  onViewQuotes?: (customerId: string) => void
}

export function CustomersTable({
  customers,
  onEdit,
  onDelete,
  onViewQuotes,
}: CustomersTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const getLevelConfig = (level: string) => {
    return CUSTOMER_LEVELS.find((l) => l.value === level) || CUSTOMER_LEVELS[1]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await onDelete(deleteId)
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>尚無客戶資料</p>
        <p className="text-sm mt-1">點擊「新增客戶」開始建立</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>公司名稱</TableHead>
              <TableHead>聯絡人</TableHead>
              <TableHead>聯絡方式</TableHead>
              <TableHead>等級</TableHead>
              <TableHead className="text-right">信用額度</TableHead>
              <TableHead className="text-center">客戶入口</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const levelConfig = getLevelConfig(customer.customer_level)
              return (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="font-medium">{customer.company_name}</div>
                    {customer.address && (
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {customer.address}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{customer.contact_name || '-'}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {customer.contact_email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">{customer.contact_email}</span>
                        </div>
                      )}
                      {customer.contact_phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{customer.contact_phone}</span>
                        </div>
                      )}
                      {!customer.contact_email && !customer.contact_phone && '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={`${levelConfig.color} text-white`}
                    >
                      {levelConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(customer.credit_limit)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={customer.portal_enabled ? 'default' : 'outline'}>
                      {customer.portal_enabled ? '已啟用' : '未啟用'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">開啟選單</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(customer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          編輯
                        </DropdownMenuItem>
                        {onViewQuotes && (
                          <DropdownMenuItem onClick={() => onViewQuotes(customer.id)}>
                            <FileText className="mr-2 h-4 w-4" />
                            查看報價單
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteId(customer.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          刪除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此客戶？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。刪除後，此客戶的相關報價單將保留但無法再新增。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '刪除中...' : '確定刪除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
