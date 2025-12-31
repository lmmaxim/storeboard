'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

interface DeleteStoreButtonProps {
  storeId: string
  storeName: string
  onDelete: () => Promise<void>
}

export function DeleteStoreButton({ storeId, storeName, onDelete }: DeleteStoreButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (confirmText !== storeName) {
      toast.error('Store name does not match')
      return
    }

    setIsDeleting(true)
    try {
      await onDelete()
      setOpen(false)
      // Add success message as query param so it shows on the destination page
      router.push(`/stores?success=${encodeURIComponent('Store deleted successfully')}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete store')
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Store
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Store</DialogTitle>
          <DialogDescription>
            This will permanently delete the store &quot;{storeName}&quot; and all associated data.
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="confirm">
            Type <strong>{storeName}</strong> to confirm:
          </Label>
          <Input
            id="confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={storeName}
            className="mt-2"
            disabled={isDeleting}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== storeName || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Store'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

