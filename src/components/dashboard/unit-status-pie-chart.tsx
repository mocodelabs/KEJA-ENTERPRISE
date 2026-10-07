'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

type Slice = { name: string; value: number; color: string }

export function UnitStatusPieChart({ occupied, vacant, maintenance }: { occupied: number; vacant: number; maintenance: number }) {
  const total = occupied + vacant + maintenance

  const data: Slice[] = [
    { name: 'Occupied', value: occupied, color: '#0b8172' },
    { name: 'Vacant', value: vacant, color: '#cbd5e1' },
    { name: 'Maintenance', value: maintenance, color: '#f59e0b' },
  ].filter((s) => s.value > 0)

  if (total === 0) {
    return <p className="py-16 text-center text-sm text-slate-400">No units yet.</p>
  }

  const percentOf = (value: number) => Math.round((value / total) * 100)

  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              cornerRadius={4}
              isAnimationActive={false}
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} unit${value === 1 ? '' : 's'}`, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-slate-900">{percentOf(occupied)}%</span>
          <span className="text-xs text-slate-500">occupied</span>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
        {data.map((slice) => (
          <li key={slice.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: slice.color }} />
            {slice.name} {percentOf(slice.value)}%
          </li>
        ))}
      </ul>
    </div>
  )
}
