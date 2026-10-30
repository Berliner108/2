import { supabaseAdmin } from '@/lib/supabase-admin'
import type { ChatSourceType } from './constants'

type SourceValidationResult =
  | {
      ok: true
      snapshot: Record<string, unknown>
    }
  | {
      ok: false
      status: 400 | 403 | 404 | 500
      error: string
      message: string
    }

export async function validateChatSource({
  sourceType,
  sourceId,
  senderId,
  recipientId,
}: {
  sourceType: ChatSourceType
  sourceId: string
  senderId: string
  recipientId: string
}): Promise<SourceValidationResult> {
  const admin = supabaseAdmin()

  try {
    switch (sourceType) {
      case 'rating_profile': {
        if (sourceId !== recipientId) {
          return {
            ok: false,
            status: 403,
            error: 'invalid_source',
            message: 'Dieses Profil gehört nicht zum Empfänger.',
          }
        }

        const { data, error } = await admin
          .from('profiles')
          .select('id, username, company_name')
          .eq('id', recipientId)
          .maybeSingle()

        if (error) {
          return {
            ok: false,
            status: 500,
            error: 'source_check_failed',
            message: 'Profil konnte nicht geprüft werden.',
          }
        }

        if (!data) {
          return {
            ok: false,
            status: 404,
            error: 'source_not_found',
            message: 'Profil wurde nicht gefunden.',
          }
        }

        return {
          ok: true,
          snapshot: {
            username: data.username ?? null,
            company_name: data.company_name ?? null,
          },
        }
      }

      case 'job': {
        const { data, error } = await admin
          .from('jobs')
          .select(`
            id,
            user_id,
            description,
            status,
            published
          `)
          .eq('id', sourceId)
          .maybeSingle()

        if (error) {
          return {
            ok: false,
            status: 500,
            error: 'source_check_failed',
            message: 'Auftrag konnte nicht geprüft werden.',
          }
        }

        if (!data) {
          return {
            ok: false,
            status: 404,
            error: 'source_not_found',
            message: 'Auftrag wurde nicht gefunden.',
          }
        }

        if (
          data.user_id !== recipientId ||
          data.published !== true ||
          data.status !== 'open'
        ) {
          return {
            ok: false,
            status: 403,
            error: 'source_not_available',
            message: 'Dieser Auftrag ist nicht verfügbar.',
          }
        }

        return {
          ok: true,
          snapshot: {
            description: data.description ?? null,
          },
        }
      }

      case 'lack_request': {
        const { data, error } = await admin
          .from('lack_requests')
          .select(`
            id,
            owner_id,
            title,
            status,
            published
          `)
          .eq('id', sourceId)
          .maybeSingle()

        if (error) {
          return {
            ok: false,
            status: 500,
            error: 'source_check_failed',
            message: 'Lackanfrage konnte nicht geprüft werden.',
          }
        }

        if (!data) {
          return {
            ok: false,
            status: 404,
            error: 'source_not_found',
            message: 'Lackanfrage wurde nicht gefunden.',
          }
        }

        if (
          data.owner_id !== recipientId ||
          data.published !== true ||
          data.status !== 'open'
        ) {
          return {
            ok: false,
            status: 403,
            error: 'source_not_available',
            message: 'Diese Lackanfrage ist nicht verfügbar.',
          }
        }

        return {
          ok: true,
          snapshot: {
            title: data.title ?? null,
          },
        }
      }

      case 'article': {
        const { data, error } = await admin
          .from('articles')
          .select(`
            id,
            owner_id,
            title,
            published,
            sold_out,
            archived
          `)
          .eq('id', sourceId)
          .maybeSingle()

        if (error) {
          return {
            ok: false,
            status: 500,
            error: 'source_check_failed',
            message: 'Artikel konnte nicht geprüft werden.',
          }
        }

        if (!data) {
          return {
            ok: false,
            status: 404,
            error: 'source_not_found',
            message: 'Artikel wurde nicht gefunden.',
          }
        }

        if (
          data.owner_id !== recipientId ||
          data.published !== true ||
          data.archived === true ||
          data.sold_out === true
        ) {
          return {
            ok: false,
            status: 403,
            error: 'source_not_available',
            message: 'Dieser Artikel ist nicht verfügbar.',
          }
        }

        return {
          ok: true,
          snapshot: {
            title: data.title ?? null,
          },
        }
      }

      case 'order': {
        const { data: order, error: orderError } =
          await admin
            .from('orders')
            .select('id, buyer_id, supplier_id, kind')
            .eq('id', sourceId)
            .maybeSingle()

        if (orderError) {
          return {
            ok: false,
            status: 500,
            error: 'source_check_failed',
            message: 'Vorgang konnte nicht geprüft werden.',
          }
        }

        if (order) {
          const parties = new Set([
            String(order.buyer_id),
            String(order.supplier_id),
          ])

          if (
            !parties.has(senderId) ||
            !parties.has(recipientId)
          ) {
            return {
              ok: false,
              status: 403,
              error: 'invalid_order_participants',
              message:
                'Dieser Vorgang gehört nicht zu diesen Nutzern.',
            }
          }

          return {
            ok: true,
            snapshot: {
              kind: order.kind ?? null,
            },
          }
        }

        const { data: shopOrder, error: shopOrderError } =
          await admin
            .from('shop_orders')
            .select(`
              id,
              buyer_id,
              seller_id,
              article_title
            `)
            .eq('id', sourceId)
            .maybeSingle()

        if (shopOrderError) {
          return {
            ok: false,
            status: 500,
            error: 'source_check_failed',
            message: 'Bestellung konnte nicht geprüft werden.',
          }
        }

        if (!shopOrder) {
          return {
            ok: false,
            status: 404,
            error: 'source_not_found',
            message: 'Bestellung wurde nicht gefunden.',
          }
        }

        const parties = new Set([
          String(shopOrder.buyer_id),
          String(shopOrder.seller_id),
        ])

        if (
          !parties.has(senderId) ||
          !parties.has(recipientId)
        ) {
          return {
            ok: false,
            status: 403,
            error: 'invalid_order_participants',
            message:
              'Diese Bestellung gehört nicht zu diesen Nutzern.',
          }
        }

        return {
          ok: true,
          snapshot: {
            title: shopOrder.article_title ?? null,
          },
        }
      }
    }
  } catch (error) {
    console.error('[chat/source-validation]', error)

    return {
      ok: false,
      status: 500,
      error: 'source_check_failed',
      message: 'Chat-Ursprung konnte nicht geprüft werden.',
    }
  }
}