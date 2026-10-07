'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { addPropertyBlock } from '@/lib/actions/properties'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SubmitButton } from '@/components/ui/submit-button'

export function PropertyBlockForm({ propertyId }: { propertyId: string }) {
  const [state, formAction] = useActionState(addPropertyBlock, null)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (state?.message) {
      formRef.current?.reset()
      router.refresh()
    }
  }, [state, router])

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-2">
      <input type="hidden" name="property_id" value={propertyId} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="block_name">Block name</Label>
        <Input id="block_name" name="name" required placeholder="Block C" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="block_floor_count">Floors</Label>
        <Input id="block_floor_count" name="floor_count" type="number" min={1} step={1} defaultValue={1} className="w-24" />
      </div>
      <SubmitButton pendingText="Adding…">Add block</SubmitButton>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
