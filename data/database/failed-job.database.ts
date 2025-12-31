import { getSupabaseServiceClient } from '@/data/database/client'
import type {
  FailedJob,
  FailedJobInsert,
  FailedJobUpdate,
} from '@/data/types/failed-job.types'

const TABLE = 'failed_jobs'

function normalizeFailedJob(record: unknown): FailedJob {
  if (!record) {
    throw new Error('Failed job record is missing')
  }

  return record as FailedJob
}

export async function insertFailedJob(
  payload: FailedJobInsert
): Promise<FailedJob> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeFailedJob(data)
}

export async function updateFailedJob(
  jobId: string,
  updates: FailedJobUpdate
): Promise<FailedJob> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', jobId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return normalizeFailedJob(data)
}

export async function getFailedJobs(): Promise<FailedJob[]> {
  const supabase = getSupabaseServiceClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as FailedJob[]
}

