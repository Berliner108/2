import { NextResponse } from 'next/server'
import { fetchBoersenJobs } from '@/lib/jobs-boerse'

export const revalidate = 300

export async function GET() {
  try {
    const jobs = await fetchBoersenJobs({ limit: 12 })

    return NextResponse.json(jobs, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    })
  } catch (error: any) {
    console.error('[auftraege/top] Fehler:', error)

    return NextResponse.json(
      { error: error?.message ?? 'Aufträge konnten nicht geladen werden.' },
      { status: 500 }
    )
  }
}