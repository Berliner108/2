'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useParams,
} from 'next/navigation'

import {
  supabaseBrowser,
} from '@/lib/supabase-browser'

import styles from '../messages.module.css'

const MAX_FILE_SIZE =
  25 * 1024 * 1024

const ALLOWED_EXTENSIONS =
  new Set([
    'jpg',
    'jpeg',
    'png',
    'webp',

    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'csv',
    'txt',
    'ppt',
    'pptx',

    'dxf',
    'dwg',
    'step',
    'stp',
    'iges',
    'igs',
  ])

type Attachment = {
  id: string
  original_filename: string
  mime_type: string
  file_extension: string
  file_size: number
  storage_path: string
}

type Message = {
  id: string
  conversation_id: string
  sender_participant_id: string | null
  message_type:
    | 'text'
    | 'file'
    | 'system'
    | 'context'

  content: string | null
  client_message_id: string | null
  created_at: string

  message_attachments?: Attachment[]
}

type ConversationListItem = {
  id: string
  type: 'user' | 'support'
  displayName: string
}

function getExtension(
  filename: string
) {
  const index =
    filename.lastIndexOf('.')

  if (
    index <= 0 ||
    index ===
      filename.length - 1
  ) {
    return ''
  }

  return filename
    .slice(index + 1)
    .toLowerCase()
}

function formatTime(
  value: string
) {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return ''
  }

  return new Intl.DateTimeFormat(
    'de-DE',
    {
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(date)
}

function formatFileSize(
  bytes: number
) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`
}

function LinkifiedText({
  text,
}: {
  text: string
}) {
  const parts =
    text.split(
      /(https?:\/\/[^\s]+)/g
    )

  return (
    <>
      {parts.map(
        (part, index) => {
          if (
            /^https?:\/\//i.test(
              part
            )
          ) {
            return (
              <a
                key={`${part}-${index}`}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  styles.messageLink
                }
              >
                {part}
              </a>
            )
          }

          return part
        }
      )}
    </>
  )
}

export default function ChatPage() {
  const params = useParams()

  const rawChatId =
    params.chatId

  const chatId =
    Array.isArray(rawChatId)
      ? rawChatId[0]
      : rawChatId

  const [messages, setMessages] =
    useState<Message[]>([])

  const [
    myParticipantId,
    setMyParticipantId,
  ] = useState<string | null>(
    null
  )

  const [
    displayName,
    setDisplayName,
  ] = useState('Unterhaltung')

  const [
    inputValue,
    setInputValue,
  ] = useState('')

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<File | null>(
      null
    )

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    loadingOlder,
    setLoadingOlder,
  ] = useState(false)

  const [
    sending,
    setSending,
  ] = useState(false)

  const [
    uploadStatus,
    setUploadStatus,
  ] =
    useState<string | null>(
      null
    )

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null
    )

  const [
    hasMore,
    setHasMore,
  ] = useState(false)

  const [
    nextBefore,
    setNextBefore,
  ] =
    useState<string | null>(
      null
    )

  const messageListRef =
    useRef<HTMLUListElement>(
      null
    )

  const initialScrollDone =
    useRef(false)

  const scrollToBottom =
    useCallback(() => {
      requestAnimationFrame(
        () => {
          const element =
            messageListRef.current

          if (!element) return

          element.scrollTop =
            element.scrollHeight
        }
      )
    }, [])

  // =====================================================
  // Premium-Checkout
  // =====================================================

  const startPremiumCheckout =
    useCallback(async () => {
      try {
        const res =
          await fetch(
            '/api/stripe/premium-checkout',
            {
              method: 'POST',
              credentials:
                'include',
            }
          )

        const json =
          await res
            .json()
            .catch(() => null)

        if (
          res.ok &&
          json?.url
        ) {
          window.location.href =
            json.url
          return
        }

        setErrorMessage(
          json?.error ||
            'Premium Mitgliedschaft konnte nicht gestartet werden.'
        )
      } catch {
        setErrorMessage(
          'Premium Mitgliedschaft konnte nicht gestartet werden.'
        )
      }
    }, [])

  // =====================================================
  // Chatliste für Namen laden
  // =====================================================

  const loadConversationName =
    useCallback(async () => {
      if (!chatId) return

      try {
        const res =
          await fetch(
            '/api/messages',
            {
              cache: 'no-store',
              credentials:
                'include',
            }
          )

        const json =
          await res
            .json()
            .catch(() => null)

        if (
          !res.ok ||
          !json?.ok
        ) {
          return
        }

        const chats =
          (
            json.conversations ??
            []
          ) as ConversationListItem[]

        const chat =
          chats.find(
            (item) =>
              item.id === chatId
          )

        if (chat) {
          setDisplayName(
            chat.displayName
          )
        }
      } catch (error) {
        console.error(
          '[chat] name load:',
          error
        )
      }
    }, [chatId])

  // =====================================================
  // Als gelesen markieren
  // =====================================================

  const markRead =
    useCallback(async () => {
      if (!chatId) return

      try {
        const res =
          await fetch(
            '/api/messages/read',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              credentials:
                'include',

              body:
                JSON.stringify({
                  conversationId:
                    chatId,
                }),
            }
          )

        if (res.ok) {
          window.dispatchEvent(
            new Event(
              'chat:refresh'
            )
          )
        }
      } catch (error) {
        console.error(
          '[chat] mark read:',
          error
        )
      }
    }, [chatId])

  // =====================================================
  // Erste Nachrichten laden
  // =====================================================

  const loadInitialMessages =
    useCallback(async () => {
      if (!chatId) return

      setLoading(true)
      setErrorMessage(null)
      initialScrollDone.current =
        false

      try {
        const res =
          await fetch(
            `/api/messages/${encodeURIComponent(
              chatId
            )}`,
            {
              cache: 'no-store',
              credentials:
                'include',
            }
          )

        const json =
          await res
            .json()
            .catch(() => null)

        if (
          !res.ok ||
          !json?.ok
        ) {
          setErrorMessage(
            json?.message ||
              'Nachrichten konnten nicht geladen werden.'
          )

          return
        }

        setMessages(
          Array.isArray(
            json.messages
          )
            ? json.messages
            : []
        )

        setMyParticipantId(
          json.myParticipantId ??
            null
        )

        setHasMore(
          Boolean(
            json.hasMore
          )
        )

        setNextBefore(
          json.nextBefore ??
            null
        )

        await markRead()
      } catch (error) {
        console.error(
          '[chat] initial load:',
          error
        )

        setErrorMessage(
          'Nachrichten konnten nicht geladen werden.'
        )
      } finally {
        setLoading(false)
      }
    }, [
      chatId,
      markRead,
    ])

  useEffect(() => {
    setMessages([])
    setSelectedFile(null)
    setInputValue('')
    setErrorMessage(null)

    void Promise.all([
      loadConversationName(),
      loadInitialMessages(),
    ])
  }, [
    chatId,
    loadConversationName,
    loadInitialMessages,
  ])

  useEffect(() => {
    if (
      loading ||
      initialScrollDone.current
    ) {
      return
    }

    initialScrollDone.current =
      true

    scrollToBottom()
  }, [
    loading,
    messages,
    scrollToBottom,
  ])

  // =====================================================
  // Ältere Nachrichten laden
  // =====================================================
  const refreshLatestMessages =
  useCallback(async () => {
    if (!chatId) return

    try {
      const res = await fetch(
        `/api/messages/${encodeURIComponent(
          chatId
        )}`,
        {
          cache: 'no-store',
          credentials: 'include',
        }
      )

      const json =
        await res
          .json()
          .catch(() => null)

      if (
        !res.ok ||
        !json?.ok ||
        !Array.isArray(json.messages)
      ) {
        return
      }

      setMyParticipantId(
        json.myParticipantId ?? null
      )

      setMessages((current) => {
        const map =
          new Map<string, Message>()

        /*
         * Bereits geladene ältere Nachrichten behalten.
         */
        for (const message of current) {
          map.set(
            message.id,
            message
          )
        }

        /*
         * Neueste Seite darüber aktualisieren.
         */
        for (const message of json.messages) {
          map.set(
            message.id,
            message
          )
        }

        return Array.from(
          map.values()
        ).sort(
          (a, b) =>
            new Date(
              a.created_at
            ).getTime() -
            new Date(
              b.created_at
            ).getTime()
        )
      })

      /*
       * Wenn wir diesen Chat gerade offen haben,
       * ist die eingehende Nachricht gelesen.
       */
      await markRead()

      requestAnimationFrame(
        scrollToBottom
      )
    } catch (error) {
      console.error(
        '[chat] realtime refresh:',
        error
      )
    }
  }, [
    chatId,
    markRead,
    scrollToBottom,
  ])
  useEffect(() => {
  const handleRealtimeMessage = () => {
    void refreshLatestMessages()
  }

  window.addEventListener(
    'chat:message-inserted',
    handleRealtimeMessage
  )

  return () => {
    window.removeEventListener(
      'chat:message-inserted',
      handleRealtimeMessage
    )
  }
}, [refreshLatestMessages])

  const loadOlderMessages =
    useCallback(async () => {
      if (
        !chatId ||
        !hasMore ||
        !nextBefore ||
        loadingOlder
      ) {
        return
      }

      const list =
        messageListRef.current

      if (!list) return

      setLoadingOlder(true)

      const previousHeight =
        list.scrollHeight

      try {
        const res =
          await fetch(
            `/api/messages/${encodeURIComponent(
              chatId
            )}?before=${encodeURIComponent(
              nextBefore
            )}`,
            {
              cache: 'no-store',
              credentials:
                'include',
            }
          )

        const json =
          await res
            .json()
            .catch(() => null)

        if (
          !res.ok ||
          !json?.ok
        ) {
          return
        }

        const older =
          Array.isArray(
            json.messages
          )
            ? json.messages
            : []

        setMessages(
          (current) => [
            ...older,
            ...current,
          ]
        )

        setHasMore(
          Boolean(
            json.hasMore
          )
        )

        setNextBefore(
          json.nextBefore ??
            null
        )

        requestAnimationFrame(
          () => {
            const currentList =
              messageListRef.current

            if (!currentList) {
              return
            }

            const newHeight =
              currentList.scrollHeight

            currentList.scrollTop =
              newHeight -
              previousHeight
          }
        )
      } catch (error) {
        console.error(
          '[chat] older messages:',
          error
        )
      } finally {
        setLoadingOlder(false)
      }
    }, [
      chatId,
      hasMore,
      nextBefore,
      loadingOlder,
    ])

  function handleScroll() {
    const list =
      messageListRef.current

    if (!list) return

    if (list.scrollTop < 80) {
      void loadOlderMessages()
    }
  }

  // =====================================================
  // Dateiauswahl
  // =====================================================

  function selectFile(
    file: File
  ) {
    setErrorMessage(null)

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setErrorMessage(
        'Dateien dürfen höchstens 25 MB groß sein.'
      )
      return
    }

    const extension =
      getExtension(
        file.name
      )

    if (
      !ALLOWED_EXTENSIONS.has(
        extension
      )
    ) {
      setErrorMessage(
        'Dieser Dateityp ist im Chat nicht erlaubt.'
      )
      return
    }

    setSelectedFile(file)
  }

  function handleFileInputChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0]

    event.target.value = ''

    if (file) {
      selectFile(file)
    }
  }

  function handleDrop(
    event:
      React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault()

    const file =
      event.dataTransfer
        .files?.[0]

    event.dataTransfer.clearData()

    if (file) {
      selectFile(file)
    }
  }

  function handleDragOver(
    event:
      React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault()
  }

  // =====================================================
  // Nachricht senden
  // =====================================================

  async function sendMessage() {
    if (
      !chatId ||
      sending
    ) {
      return
    }

    const content =
      inputValue.trim()

    if (
      !content &&
      !selectedFile
    ) {
      return
    }

    setSending(true)
    setErrorMessage(null)

    const clientMessageId =
      crypto.randomUUID()

    try {
      let attachment:
        | {
            storagePath: string
            originalFilename: string
            mimeType: string
            fileSize: number
          }
        | undefined

      // -------------------------------------------------
      // Datei vorbereiten + direkt zu Supabase hochladen
      // -------------------------------------------------

      if (selectedFile) {
        setUploadStatus(
          'Datei wird vorbereitet …'
        )

        const prepareRes =
          await fetch(
            '/api/messages/attachments/prepare',
            {
              method: 'POST',

              headers: {
                'Content-Type':
                  'application/json',
              },

              credentials:
                'include',

              body:
                JSON.stringify({
                  conversationId:
                    chatId,

                  filename:
                    selectedFile.name,

                  size:
                    selectedFile.size,

                  mimeType:
                    selectedFile.type ||
                    'application/octet-stream',
                }),
            }
          )

        const prepareJson =
          await prepareRes
            .json()
            .catch(() => null)

        if (
          !prepareRes.ok ||
          !prepareJson?.ok
        ) {
          if (
            prepareJson?.error ===
            'premium_required'
          ) {
            await startPremiumCheckout()
            return
          }

          throw new Error(
            prepareJson?.message ||
              'Datei-Upload konnte nicht vorbereitet werden.'
          )
        }

        setUploadStatus(
          'Datei wird hochgeladen …'
        )

        const upload =
          prepareJson.upload

        const supabase =
          supabaseBrowser()

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from(
              'chat-attachments'
            )
            .uploadToSignedUrl(
              upload.path,
              upload.token,
              selectedFile,
              {
                contentType:
                  selectedFile.type ||
                  upload.mimeType ||
                  'application/octet-stream',
              }
            )

        if (uploadError) {
          throw new Error(
            `Upload fehlgeschlagen: ${uploadError.message}`
          )
        }

        attachment = {
          storagePath:
            upload.path,

          originalFilename:
            upload.originalFilename,

          mimeType:
            upload.mimeType,

          fileSize:
            upload.fileSize,
        }

        setUploadStatus(
          'Nachricht wird gesendet …'
        )
      }

      // -------------------------------------------------
      // Nachricht speichern
      // -------------------------------------------------

      const sendRes =
        await fetch(
          '/api/messages/send',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            credentials:
              'include',

            body:
              JSON.stringify({
                conversationId:
                  chatId,

                content,

                clientMessageId,

                attachment:
                  attachment ??
                  null,
              }),
          }
        )

      const sendJson =
        await sendRes
          .json()
          .catch(() => null)

      if (
        !sendRes.ok ||
        !sendJson?.ok
      ) {
        if (
          sendJson?.error ===
          'premium_required'
        ) {
          await startPremiumCheckout()
          return
        }

        throw new Error(
          sendJson?.message ||
            'Nachricht konnte nicht gesendet werden.'
        )
      }

      if (
        sendJson.message?.id
      ) {
        setMessages(
          (current) => {
            const exists =
              current.some(
                (message) =>
                  message.id ===
                  sendJson.message.id
              )

            if (exists) {
              return current
            }

            return [
              ...current,
              sendJson.message,
            ]
          }
        )
      }

      setInputValue('')
      setSelectedFile(null)

      window.dispatchEvent(
        new Event(
          'chat:refresh'
        )
      )

      requestAnimationFrame(
        scrollToBottom
      )
    } catch (error) {
      console.error(
        '[chat] send:',
        error
      )

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Nachricht konnte nicht gesendet werden.'
      )
    } finally {
      setSending(false)
      setUploadStatus(null)
    }
  }

  function handleKeyDown(
    event:
      React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault()

      void sendMessage()
    }
  }

  if (!chatId) {
    return (
      <p>
        Kein Chat ausgewählt.
      </p>
    )
  }

  return (
    <div
      className={
        styles.chatPage
      }
    >
      <div
        className={
          styles.chatWrapper
        }
        onDrop={handleDrop}
        onDragOver={
          handleDragOver
        }
      >
        <h1>
          Unterhaltung mit{' '}
          {displayName}
        </h1>

        {errorMessage && (
          <div
            className={
              styles.chatError
            }
          >
            {errorMessage}
          </div>
        )}

        {loading ? (
          <div
            className={
              styles.chatLoading
            }
          >
            Nachrichten werden
            geladen …
          </div>
        ) : (
          <ul
            className={
              styles.messageList
            }
            ref={
              messageListRef
            }
            onScroll={
              handleScroll
            }
          >
            {loadingOlder && (
              <li
                className={
                  styles.loadOlderInfo
                }
              >
                Ältere Nachrichten
                werden geladen …
              </li>
            )}

            {!loadingOlder &&
              hasMore && (
                <li
                  className={
                    styles.loadOlderInfo
                  }
                >
                  Nach oben scrollen,
                  um ältere Nachrichten
                  zu laden.
                </li>
              )}

            {messages.length ===
              0 && (
              <li
                className={
                  styles.noMessages
                }
              >
                Noch keine Nachrichten.
              </li>
            )}

            {messages.map(
              (message) => {
                const mine =
                  Boolean(
                    myParticipantId &&
                    message.sender_participant_id ===
                      myParticipantId
                  )

                return (
                  <li
                    key={
                      message.id
                    }
                    className={`${styles.messageItem} ${
                      mine
                        ? styles.messageRight
                        : styles.messageLeft
                    }`}
                  >
                    {message.content && (
                      <div>
                        <LinkifiedText
                          text={
                            message.content
                          }
                        />
                      </div>
                    )}

                    {message
                      .message_attachments
                      ?.map(
                        (
                          attachment
                        ) => (
                          <a
                            key={
                              attachment.id
                            }
                            href={`/api/messages/attachments/${attachment.id}/download`}
                            className={
                              styles.attachment
                            }
                          >
                            <span
                              className={
                                styles.attachmentName
                              }
                            >
                              {
                                attachment.original_filename
                              }
                            </span>

                            <span
                              className={
                                styles.attachmentSize
                              }
                            >
                              {formatFileSize(
                                attachment.file_size
                              )}
                            </span>
                          </a>
                        )
                      )}

                    <div
                      className={
                        styles.messageMeta
                      }
                    >
                      {mine
                        ? 'Du'
                        : displayName}{' '}
                      ·{' '}
                      {formatTime(
                        message.created_at
                      )}
                    </div>
                  </li>
                )
              }
            )}
          </ul>
        )}

        {selectedFile && (
          <div
            className={
              styles.filePreview
            }
          >
            <span>
              {selectedFile.name}{' '}
              (
              {formatFileSize(
                selectedFile.size
              )}
              )
            </span>

            <button
              type="button"
              disabled={
                sending
              }
              onClick={() =>
                setSelectedFile(
                  null
                )
              }
              aria-label="Datei entfernen"
            >
              ×
            </button>
          </div>
        )}

        {uploadStatus && (
          <div
            className={
              styles.uploadStatus
            }
          >
            {uploadStatus}
          </div>
        )}

        <div
          className={
            styles.inputWrapper
          }
        >
          <textarea
            className={
              styles.textInput
            }
            placeholder="Antwort schreiben..."
            value={
              inputValue
            }
            onChange={(
              event
            ) =>
              setInputValue(
                event.target
                  .value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            rows={2}
            maxLength={
              10000
            }
            disabled={
              sending
            }
          />

          <button
            type="button"
            className={
              styles.sendButton
            }
            onClick={() =>
              void sendMessage()
            }
            disabled={
              sending ||
              (!inputValue.trim() &&
                !selectedFile)
            }
          >
            {sending
              ? 'Senden …'
              : 'Senden'}
          </button>
        </div>

        <div
          className={
            styles.chatExtras
          }
        >
          <label
            className={
              styles.fileLabel
            }
          >
            Datei anhängen:

            <input
              type="file"
              className={
                styles.fileInput
              }
              onChange={
                handleFileInputChange
              }
              multiple={false}
              disabled={
                sending
              }
              accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.ppt,.pptx,.dxf,.dwg,.step,.stp,.iges,.igs"
            />
          </label>

          <div
            className={
              styles.notice
            }
          >
            <p>
              Bitte nur ethisch
              vertretbare Inhalte
              schreiben – im Einklang
              mit unseren AGB.
            </p>

            <p>
              Diese Unterhaltung kann
              zur Qualitätssicherung
              mitgelesen werden.
            </p>

            <button
              type="button"
              className={
                styles.reportButton
              }
            >
              Unterhaltung / Nutzer
              melden
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}