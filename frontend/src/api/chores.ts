/// API calls for chores and people.

import type { Chore, CreateChoreRequest } from '../types/chore'
import type { Person } from '../types/person'
import { api } from './client'

/** Create a single-occurrence chore. */
export const createChore = (input: CreateChoreRequest): Promise<Chore> =>
  api.post<Chore>('/chores', input)

/** List all people (for the assignee picker). */
export const listPeople = (): Promise<Person[]> =>
  api.get<{ items: Person[] }>('/people').then((r) => r.items)
