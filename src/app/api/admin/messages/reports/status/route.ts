import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set([
  'open',
  'reviewing',
  'resolved',
  'rejected',
])

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function PATCH(
  req: Request
) {
  try {
    // =====================================================
    // 1) AUTH
    // =====================================================

    const sb =
      await supabaseServer()

    const {
      data: { user },
      error: authError,
    } =
      await sb.auth.getUser()

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'not_authenticated',
        },
        {
          status: 401,
        }
      )
    }

    // =====================================================
    // 2) ADMIN-PRÜFUNG
    // =====================================================

    const adminEmails = (
      process.env.ADMIN_EMAILS ??
      ''
    )
      .split(',')
      .map(
        (email) =>
          email
            .trim()
            .toLowerCase()
      )
      .filter(Boolean)

    const myEmail =
      (
        user.email ??
        ''
      ).toLowerCase()

    if (
      !adminEmails.includes(
        myEmail
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'not_authorized',
        },
        {
          status: 403,
        }
      )
    }

    const {
      data: profile,
      error:
        profileError,
    } =
      await sb
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (
      profileError ||
      profile?.role !==
        'admin'
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'not_authorized',
        },
        {
          status: 403,
        }
      )
    }

    // =====================================================
    // 3) BODY
    // =====================================================

    const body =
      await req
        .json()
        .catch(
          () => null
        )

    const reportId =
      typeof body?.reportId ===
      'string'
        ? body.reportId
        : ''

    const status =
      typeof body?.status ===
      'string'
        ? body.status
        : ''

    if (
      !isUuid(reportId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'invalid_report_id',
        },
        {
          status: 400,
        }
      )
    }

    if (
      !ALLOWED_STATUSES.has(
        status
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'invalid_status',
        },
        {
          status: 400,
        }
      )
    }

    // =====================================================
    // 4) STATUS ÄNDERN
    // =====================================================

    const admin =
      supabaseAdmin()

    const {
      data: report,
      error:
        updateError,
    } =
      await admin
        .from(
          'chat_reports'
        )
        .update({
          status,
        })
        .eq(
          'id',
          reportId
        )
        .select(`
          id,
          status
        `)
        .maybeSingle()

    if (
      updateError
    ) {
      console.error(
        '[admin/reports/status] update:',
        updateError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'update_failed',
        },
        {
          status: 500,
        }
      )
    }

    if (!report) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'report_not_found',
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json({
      ok: true,
      report,
    })
  } catch (error) {
    console.error(
      '[admin/reports/status] unexpected:',
      error
    )

    return NextResponse.json(
      {
        ok: false,
        error:
          'internal_error',
      },
      {
        status: 500,
      }
    )
  }
}