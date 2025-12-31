import {
  getSupabaseServerClient,
  getSupabaseServiceClient,
} from '@/data/database/client'
import type {
  Notification,
  NotificationInsert,
  NotificationUpdate,
} from '@/data/types/notification.types'

const TABLE = 'notifications'

function normalizeNotification(record: unknown): Notification {
  if (!record) {
    throw new Error('Notification record is missing')
  }

  return record as Notification
}

function resolveClient(useServiceRole: boolean) {
  if (useServiceRole) {
    return getSupabaseServiceClient()
  }

  return getSupabaseServerClient()
}

export async function createNotification(
  payload: NotificationInsert,
  { useServiceRole = false }: { useServiceRole?: boolean } = {}
): Promise<Notification> {
  const supabase = await resolveClient(useServiceRole)

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeNotification(data)
}

export async function getNotificationsByUserId(
  userId: string
): Promise<Notification[]> {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Notification[]
}

export async function updateNotification(
  notificationId: string,
  userId: string,
  updates: NotificationUpdate
): Promise<Notification> {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeNotification(data)
}

export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  const supabase = await getSupabaseServerClient()

  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
}

