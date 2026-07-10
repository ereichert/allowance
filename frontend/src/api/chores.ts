/// API calls for chores and people.

import type {
  Chore,
  ChoreListItem,
  ChoresListResponse,
  CreateChoreRequest,
  UpdateChoreRequest,
} from '../types/chore'
import type { Person } from '../types/person'
import { api } from './client'

/** Create a single-occurrence chore. */
export const createChore = (input: CreateChoreRequest): Promise<Chore> =>
  api.post<Chore>('/chores', input)

/** Update a chore. Full replace — see `UpdateChoreRequest`. */
export const updateChore = (id: string, input: UpdateChoreRequest): Promise<ChoreListItem> =>
  api.put<ChoreListItem>(`/chores/${id}`, input)

/** List all people (for the assignee picker). */
export const listPeople = (): Promise<Person[]> =>
  api.get<{ items: Person[] }>('/people').then((r) => r.items)

/** List chores for a given page. Defaults to the first page at the max page size. */
export const listChores = (page = 1, perPage = 100): Promise<ChoresListResponse> =>
  api.get<ChoresListResponse>(`/chores?page=${page}&per_page=${perPage}`)
