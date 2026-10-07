'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updatePropertyBlock, deletePropertyBlock } from '@/lib/actions/properties'
import { Input } from '@/components/ui/input'
import { SubmitButton } from '@/components/ui/submit-button'
import { DeleteButton } from '@/components/dashboard/delete-button'
import type { Tables } from '@/lib/types/database'

export function PropertyBlockRow({ block, propertyId }: { block: Tables<'property_blocks'>; propertyId: string }) {
  const [state, formAction] = useActionState(updatePropertyBlock, null)
  const router = useRouter()

  useEffect(() => {
    if (state?.message) router.refresh()
  }, [state, router])

  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium text-slate-900">{block.name}</span>
        <form action={formAction} className="flex items-center gap-2">
          <input type="hidden" name="block_id" value={block.id} />
          <input type="hidden" name="property_id" value={propertyId} />
          <Input
            key={block.floor_count}
            name="floor_count"
            type="number"
            min={1}
            step={1}
            defaultValue={block.floor_count}
            className="w-20"
            aria-label={`Floors in ${block.name}`}
          />
          <span className="text-sm text-slate-500">floor{block.floor_count === 1 ? '' : 's'}</span>
          <SubmitButton size="sm" pendingText="Saving…">
            Save
          </SubmitButton>
          <DeleteButton action={deletePropertyBlock.bind(null, block.id, propertyId)} />
        </form>
      </div>
      {state?.error && <p className="text-right text-xs text-red-600">{state.error}</p>}
    </div>
  )
}
