/// Page for creating a single-occurrence chore.
/// Composes useCreateChore + usePeople + AddChoreForm.

import { useState } from 'react'
import { AddChoreForm } from '../components/AddChoreForm'
import { useCreateChore } from '../hooks/useCreateChore'
import { usePeople } from '../hooks/usePeople'
import type { CreateChoreRequest } from '../types/chore'

export function AddChorePage() {
  const { submit, status, errorMessage, reset } = useCreateChore()
  const { people } = usePeople()
  const [formKey, setFormKey] = useState(0)

  async function handleSubmit(input: CreateChoreRequest) {
    reset()
    const result = await submit(input)
    if (result === 'success') {
      // Remount the form so it clears and autoFocus fires on the description field.
      setFormKey((k) => k + 1)
    }
  }

  return (
    <main>
      <h1>Add Chore</h1>

      {status === 'success' && (
        <p role="status">Chore saved successfully.</p>
      )}

      {status === 'error' && errorMessage && (
        <p role="alert">{errorMessage}</p>
      )}

      <AddChoreForm
        key={formKey}
        people={people}
        onSave={handleSubmit}
        disabled={status === 'loading'}
      />
    </main>
  )
}
