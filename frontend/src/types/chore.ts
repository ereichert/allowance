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

/** A person assigned to a chore, as embedded in chore list items. */
export interface Assignee {
  id: string
  name: string
}

/** A chore as returned by GET /chores: the chore plus its current assignees. */
export interface ChoreListItem extends Chore {
  assignees: Assignee[]
}

/** Paginated envelope returned by GET /chores. */
export interface ChoresListResponse {
  items: ChoreListItem[]
  total: number
  page: number
  per_page: number
}
