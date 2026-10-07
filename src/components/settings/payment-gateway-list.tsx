'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { togglePaymentGatewayActive, deletePaymentGateway } from '@/lib/actions/integrations'
import { DeleteButton } from '@/components/dashboard/delete-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getPaymentProviderMeta } from '@/lib/paymentProviders'
import type { Tables } from '@/lib/types/database'

export function PaymentGatewayList({ gateways }: { gateways: Tables<'payment_gateways'>[] }) {
  const [isPending, startTransition] = useTransition()

  if (gateways.length === 0) {
    return <p className="text-sm text-slate-400">No payment gateways configured yet.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-slate-100">
      {gateways.map((gw) => {
        const meta = getPaymentProviderMeta(gw.provider)
        return (
          <div key={gw.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-slate-900">{gw.display_name ?? meta?.label ?? gw.provider}</p>
              <p className="text-xs text-slate-500">{meta?.label ?? gw.provider}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={gw.is_active ? 'success' : 'default'}>{gw.is_active ? 'Active' : 'Inactive'}</Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await togglePaymentGatewayActive(gw.id, !gw.is_active)
                    if (result?.error) toast.error(result.error)
                  })
                }
              >
                {gw.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <DeleteButton
                action={deletePaymentGateway.bind(null, gw.id)}
                confirmText={`Remove ${meta?.label ?? gw.provider}? Tenants will no longer see this payment option.`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
