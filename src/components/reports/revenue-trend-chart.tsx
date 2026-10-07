'use client'

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export function RevenueTrendChart({ data }: { data: { label: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="label" fontSize={12} stroke="#94a3b8" />
        <YAxis fontSize={12} stroke="#94a3b8" />
        <Tooltip formatter={(value) => `KES ${Number(value).toLocaleString()}`} />
        <Line type="monotone" dataKey="total" stroke="#0b8172" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
