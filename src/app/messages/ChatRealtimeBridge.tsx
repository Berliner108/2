'use client'

import { useEffect } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

export default function ChatRealtimeBridge() {
  useEffect(() => {
    const supabase = supabaseBrowser()

    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const start = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (!active || error || !user) {
        return
      }

      const topic = `chat-user:${user.id}`

      channel = supabase.channel(topic, {
        config: {
          private: true,
        },
      })

      channel
        .on(
          'broadcast',
          {
            event: 'message_inserted',
          },
          (event) => {
            /*
             * Aktuell geöffneten Chat informieren.
             */
            window.dispatchEvent(
              new CustomEvent(
                'chat:message-inserted',
                {
                  detail:
                    event?.payload ?? null,
                }
              )
            )

            /*
             * Sidebar aktualisieren:
             * letzter Text, Reihenfolge, unread.
             */
            window.dispatchEvent(
              new Event('chat:refresh')
            )
          }
        )

        .on(
          'broadcast',
          {
            event: 'unread_changed',
          },
          (event) => {
            window.dispatchEvent(
              new CustomEvent(
                'chat:unread-changed',
                {
                  detail:
                    event?.payload ?? null,
                }
              )
            )

            window.dispatchEvent(
              new Event('chat:refresh')
            )
          }
        )

        .subscribe((status, error) => {
          if (error) {
            console.error(
              '[chat/realtime] subscription error:',
              error
            )
          }

          if (status === 'CHANNEL_ERROR') {
            console.error(
              '[chat/realtime] channel error'
            )
          }

          if (status === 'TIMED_OUT') {
            console.error(
              '[chat/realtime] subscription timed out'
            )
          }
        })
    }

    void start()

    return () => {
      active = false

      if (channel) {
        void supabase.removeChannel(channel)
      }
    }
  }, [])

  return null
}