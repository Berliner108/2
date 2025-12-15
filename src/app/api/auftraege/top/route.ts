import { NextResponse } from 'next/server'
import { fetchBoersenJobs } from '@/lib/jobs-boerse'

export const dynamic = 'force-dynamic'
export const revalidate = 30 // schneller/stabiler; wenn du immer "live" willst: 0

export async function GET() {
  const jobs = await fetchBoersenJobs({ limit: 12 }) // gleich Börse-Logik, nur limit
  return NextResponse.json(jobs, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  })
}
