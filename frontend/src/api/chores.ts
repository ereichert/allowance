/// API calls for chores and people.

import type { Chore, ChoresListResponse, CreateChoreRequest } from '../types/chore'
import type { Person } from '../types/person'
import { api } from './client'

/** Create a single-occurrence chore. */
export const createChore = (input: CreateChoreRequest): Promise<Chore> =>
  api.post<Chore>('/chores', input)

/** List all people (for the assignee picker). */
export const listPeople = (): Promise<Person[]> =>
  api.get<{ items: Person[] }>('/people').then((r) => r.items)

/** List chores for a given page. Defaults to the first page at the max page size. */
export const listChores = (page = 1, perPage = 100): Promise<ChoresListResponse> =>
  api.get<ChoresListResponse>(`/chores?page=${page}&per_page=${perPage}`)
