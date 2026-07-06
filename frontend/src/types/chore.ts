export interface Chore {
  id: string
  description: string
  value_cents: number
  recurrence_cron: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/** Input for creating a single-occurrence chore. */
export interface CreateChoreRequest {
  description: string
  value_cents?: number
  due_at?: string
  assignee_ids?: string[]
}

/** Paginated envelope returned by GET /chores. */
export interface ChoresListResponse {
  items: Chore[]
  total: number
  page: number
  per_page: number
}
