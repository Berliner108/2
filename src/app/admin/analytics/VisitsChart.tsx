'use client'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type Pt = { date: string; count: number }

export default function VisitsChart({ data }: { data: Pt[] }) {
  return (
    <div style={{ width: '100%', height: 280, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopOpacity={0.8}/>
              <stop offset="100%" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Area type="monotone" dataKey="count" strokeWidth={2} fillOpacity={1} fill="url(#g)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
