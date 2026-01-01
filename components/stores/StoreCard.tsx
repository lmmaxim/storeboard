'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${month}/${day}/${year}`
}
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Store, MoreVertical, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Store as StoreType } from '@/data/types/store.types'
import { updateStoreAction, deleteStoreAction } from '@/app/(authenticated)/stores/actions'

interface StoreCardProps {
  store: StoreType
}

export function StoreCard({ store }: StoreCardProps) {
  const router = useRouter()
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newName, setNewName] = useState(store.name)
  const [isRenaming, setIsRenaming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isConnected = !!store.shopify_access_token_encrypted

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === store.name) {
      setRenameOpen(false)
      return
    }

    setIsRenaming(true)
    try {
      await updateStoreAction(store.id, { name: newName.trim() })
      toast.success(`${newName} has been renamed.`, {
        duration: 4000,
      })
      setRenameOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to rename store', {
        duration: 4000,
      })
      setIsRenaming(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteStoreAction(store.id)
      toast.success(`${store.name} has been deleted.`, {
        duration: 4000,
      })
      setDeleteOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete store', {
        duration: 4000,
      })
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-zinc-100 p-2 dark:bg-zinc-800">
                <Store className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{store.name}</CardTitle>
                <CardDescription className="mt-1">
                  {store.shopify_domain}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Badge variant="default" className="bg-green-500">
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">Not Connected</Badge>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteOpen(true)}
                    className="text-red-600 focus:text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            Created {formatDate(store.created_at)}
          </div>
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Store</DialogTitle>
            <DialogDescription>
              Enter a new name for {store.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Store name"
                disabled={isRenaming}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRenaming) {
                    handleRename()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRenameOpen(false)}
              disabled={isRenaming}
            >
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim() || isRenaming}>
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Store</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{store.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Store'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
