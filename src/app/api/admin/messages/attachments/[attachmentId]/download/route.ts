import { NextResponse } from 'next/server'

import { supabaseServer } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CHAT_ATTACHMENT_BUCKET =
  'chat-attachments'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      attachmentId: string
    }>
  }
) {
  try {
    const {
      attachmentId,
    } = await params

    if (
      !attachmentId ||
      !isUuid(attachmentId)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'invalid_attachment_id',
        },
        {
          status: 400,
        }
      )
    }

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
    // 2) ADMIN PRÜFEN
    // =====================================================

    const adminEmails = (
      process.env.ADMIN_EMAILS ??
      ''
    )
      .split(',')
      .map((email) =>
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
    // 3) ANHANG LADEN
    // =====================================================

    const admin =
      supabaseAdmin()

    const {
      data: attachment,
      error:
        attachmentError,
    } =
      await admin
        .from(
          'message_attachments'
        )
        .select(`
          id,
          storage_path,
          original_filename
        `)
        .eq(
          'id',
          attachmentId
        )
        .maybeSingle()

    if (
      attachmentError
    ) {
      console.error(
        '[admin/chat/download] attachment:',
        attachmentError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'attachment_lookup_failed',
        },
        {
          status: 500,
        }
      )
    }

    if (
      !attachment ||
      !attachment.storage_path
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'attachment_not_found',
        },
        {
          status: 404,
        }
      )
    }

    // =====================================================
    // 4) SIGNED URL
    // =====================================================

    const {
      data:
        signedData,
      error:
        signedError,
    } =
      await admin
        .storage
        .from(
          CHAT_ATTACHMENT_BUCKET
        )
        .createSignedUrl(
          attachment.storage_path,
          60,
          {
            download:
              attachment.original_filename ||
              true,
          }
        )

    if (
      signedError ||
      !signedData?.signedUrl
    ) {
      console.error(
        '[admin/chat/download] signed url:',
        signedError
      )

      return NextResponse.json(
        {
          ok: false,
          error:
            'signed_url_failed',
        },
        {
          status: 500,
        }
      )
    }

    // =====================================================
    // 5) DOWNLOAD
    // =====================================================

    return NextResponse.redirect(
      signedData.signedUrl
    )
  } catch (error) {
    console.error(
      '[admin/chat/download] unexpected:',
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