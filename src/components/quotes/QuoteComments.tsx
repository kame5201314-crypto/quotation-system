'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, Trash2, User, Building } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import {
  getQuoteComments,
  addComment,
  deleteComment,
  type QuoteComment,
} from '@/actions/comments'

interface QuoteCommentsProps {
  quoteId: string
}

export function QuoteComments({ quoteId }: QuoteCommentsProps) {
  const [comments, setComments] = useState<QuoteComment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [isInternal, setIsInternal] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingComment, setDeletingComment] = useState<QuoteComment | null>(null)

  const loadComments = async () => {
    const result = await getQuoteComments(quoteId)
    if (result.data) {
      setComments(result.data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadComments()
  }, [quoteId])

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    const result = await addComment({
      quote_id: quoteId,
      content: newComment,
      is_internal: isInternal,
    })

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('留言已新增')
      setNewComment('')
      loadComments()
    }
    setIsSubmitting(false)
  }

  const handleDelete = async () => {
    if (!deletingComment) return

    const result = await deleteComment(deletingComment.id, quoteId)
    if (result.success) {
      toast.success('留言已刪除')
      loadComments()
    } else {
      toast.error(result.error || '刪除失敗')
    }
    setDeletingComment(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          討論與留言
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment list */}
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">載入中...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">尚無留言</div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${
                  comment.is_internal ? 'bg-yellow-50 border-yellow-200' : 'bg-background'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {comment.user_id ? (
                      <User className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Building className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">
                      {comment.user_name || comment.customer_name || '匿名'}
                    </span>
                    {comment.is_internal && (
                      <Badge variant="outline" className="text-xs bg-yellow-100">
                        內部
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setDeletingComment(comment)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* New comment form */}
        <div className="pt-4 border-t space-y-3">
          <Textarea
            placeholder="輸入留言內容..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="internal"
                checked={isInternal}
                onCheckedChange={setIsInternal}
              />
              <Label htmlFor="internal" className="text-sm">
                僅內部可見
              </Label>
              {isInternal && (
                <span className="text-xs text-muted-foreground">
                  (客戶無法看到此留言)
                </span>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
              size="sm"
            >
              <Send className="mr-2 h-4 w-4" />
              {isSubmitting ? '發送中...' : '發送'}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingComment} onOpenChange={() => setDeletingComment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>
              確定要刪除此留言嗎？此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
