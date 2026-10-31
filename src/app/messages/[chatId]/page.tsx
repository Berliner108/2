'use client'



import {

  useCallback,

  useEffect,

  useRef,

  useState,

} from 'react'



import {

  useParams,

  useRouter,

  useSearchParams,

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


type OwnReport = {
  id: string
  conversation_id: string
  reason: string
  details: string | null
  status:
    | 'open'
    | 'reviewing'
    | 'resolved'
    | 'rejected'
  created_at: string
}

function getReportStatusLabel(
  status: OwnReport['status']
) {
  switch (status) {
    case 'open':
      return 'Offen'

    case 'reviewing':
      return 'In Prüfung'

    case 'resolved':
      return 'Erledigt'

    case 'rejected':
      return 'Abgewiesen'

    default:
      return status
  }
}



// =====================================================

// HELPER

// =====================================================



function getExtension(

  filename: string

) {

  const index =

    filename.lastIndexOf('.')



  if (

    index <= 0 ||

    index === filename.length - 1

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

  const parts = text.split(

    /(https?:\/\/[^\s]+)/g

  )



  return (

    <>

      {parts.map((part, index) => {

        if (

          /^https?:\/\//i.test(part)

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

      })}

    </>

  )

}



// =====================================================

// PAGE

// =====================================================



export default function ChatPage() {

  const params = useParams()



  const rawChatId =

  params.chatId



const chatId =

  Array.isArray(rawChatId)

    ? rawChatId[0]

    : rawChatId



const router = useRouter()

const searchParams = useSearchParams()



const isNewChat = chatId === 'new'



const newRecipientId =

  searchParams.get('recipientId') || ''



const newSourceType =

  searchParams.get('sourceType') || ''



const newSourceId =

  searchParams.get('sourceId') || ''



const newDisplayName =

  searchParams.get('displayName') || 'Unterhaltung'







  // =====================================================

  // STATES

  // =====================================================



  const [

    messages,

    setMessages,

  ] =

    useState<Message[]>([])



  const [

    myParticipantId,

    setMyParticipantId,

  ] =

    useState<string | null>(

      null

    )



  const [

    conversationType,

    setConversationType,

  ] =

    useState<

      'user' | 'support' | null

    >(null)



  const [

    displayName,

    setDisplayName,

  ] =

    useState(

      'Unterhaltung'

    )



  const [

    inputValue,

    setInputValue,

  ] =

    useState('')



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

  ] =

    useState(true)



  const [

    loadingOlder,

    setLoadingOlder,

  ] =

    useState(false)



  const [

    sending,

    setSending,

  ] =

    useState(false)



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

  ] =

    useState(false)



  const [

    nextBefore,

    setNextBefore,

  ] =

    useState<string | null>(

      null

    )



  // =====================================================

  // BLOCKIEREN

  // =====================================================



  const [

    blocked,

    setBlocked,

  ] =

    useState(false)



  const [

    blockLoading,

    setBlockLoading,

  ] =

    useState(false)



  // =====================================================

  // MELDEN

  // =====================================================



  const [

    reportOpen,

    setReportOpen,

  ] =

    useState(false)



  const [

    reportReason,

    setReportReason,

  ] =

    useState('')



  const [

    reportDetails,

    setReportDetails,

  ] =

    useState('')



  const [

    reportLoading,

    setReportLoading,

  ] =

    useState(false)



  const [

    reportSuccess,

    setReportSuccess,

  ] =

    useState(false)


  const [
    ownReport,
    setOwnReport,
  ] =
    useState<OwnReport | null>(
      null
    )



  // =====================================================

  // REFS

  // =====================================================



  const messageListRef =

    useRef<HTMLUListElement>(

      null

    )



  const initialScrollDone =

    useRef(false)



  // =====================================================

  // SCROLL

  // =====================================================



  const scrollToBottom =

    useCallback(() => {

      requestAnimationFrame(

        () => {

          const element =

            messageListRef.current



          if (!element) {

            return

          }



          element.scrollTop =

            element.scrollHeight

        }

      )

    }, [])



  // =====================================================

  // PREMIUM-CHECKOUT

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

            .catch(

              () => null

            )



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

  // LESESTATUS

  // =====================================================



  const markRead =

    useCallback(async () => {

      if (!chatId) {

        return

      }



      try {

        const res =

          await fetch(

            '/api/messages/read',

            {

              method:

                'POST',



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

      } catch (

        error

      ) {

        console.error(

          '[chat] mark read:',

          error

        )

      }

    }, [chatId])



  // =====================================================

  // BLOCK-STATUS LADEN

  // =====================================================



  const loadBlockStatus =

    useCallback(async () => {

      if (!chatId) {

        return

      }



      try {

        const res =

          await fetch(

            `/api/messages/block?conversationId=${encodeURIComponent(

              chatId

            )}`,

            {

              cache:

                'no-store',



              credentials:

                'include',

            }

          )



        const json =

          await res

            .json()

            .catch(

              () => null

            )



        if (

          res.ok &&

          json?.ok

        ) {

          setBlocked(

            Boolean(

              json.blocked

            )

          )

        }

      } catch (

        error

      ) {

        console.error(

          '[chat] block status:',

          error

        )

      }

    }, [chatId])



  // =====================================================
  // EIGENE MELDUNG LADEN
  // =====================================================

  const loadOwnReport =
    useCallback(async () => {
      if (
        !chatId ||
        isNewChat
      ) {
        setOwnReport(null)
        return
      }

      try {
        const res =
          await fetch(
            `/api/messages/report?conversationId=${encodeURIComponent(
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
          return
        }

        setOwnReport(
          json.report ?? null
        )
      } catch (error) {
        console.error(
          '[chat] own report:',
          error
        )
      }
    }, [
      chatId,
      isNewChat,
    ])


  // =====================================================

  // ERSTE NACHRICHTEN LADEN

  // =====================================================



  const loadInitialMessages =

    useCallback(async () => {

      if (!chatId) {

        return

      }



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

              cache:

                'no-store',



              credentials:

                'include',

            }

          )



        const json =

          await res

            .json()

            .catch(

              () => null

            )



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



        const loadedConversationType =

          json.conversation

            ?.type ??

            null



        setConversationType(

          loadedConversationType

        )



        setDisplayName(

          json.conversation

            ?.displayName ||

            'Unterhaltung'

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



        if (

          loadedConversationType ===

          'user'

        ) {

          await Promise.all([
            loadBlockStatus(),
            loadOwnReport(),
          ])

        } else {

          setBlocked(false)
          setOwnReport(null)

        }



        await markRead()

      } catch (

        error

      ) {

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

      loadBlockStatus,

      loadOwnReport,

      markRead,

    ])



  // =====================================================

  // CHATWECHSEL

  // =====================================================



  useEffect(() => {

    setMessages([])

    setSelectedFile(null)

    setInputValue('')

    setErrorMessage(null)



    setConversationType(

      null

    )



    setBlocked(false)



    setReportOpen(false)

    setReportSuccess(false)

    setReportReason('')

    setReportDetails('')

    setOwnReport(null)



    if (isNewChat) {

      setMessages([])

      setMyParticipantId(null)

      setConversationType('user')

      setDisplayName(newDisplayName)

      setLoading(false)

      return

    }



    setLoading(true)

    void loadInitialMessages()

  }, [

    chatId,

    isNewChat,

    newDisplayName,

    loadInitialMessages,

  ])



  // =====================================================

  // INITIAL NACH UNTEN SCROLLEN

  // =====================================================



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

  // REALTIME – NEUESTE NACHRICHTEN AKTUALISIEREN

  // =====================================================



  const refreshLatestMessages =

    useCallback(async () => {

      if (!chatId || isNewChat) {

        return

      }



      try {

        const res =

          await fetch(

            `/api/messages/${encodeURIComponent(

              chatId

            )}`,

            {

              cache:

                'no-store',



              credentials:

                'include',

            }

          )



        const json =

          await res

            .json()

            .catch(

              () => null

            )



        if (

          !res.ok ||

          !json?.ok ||

          !Array.isArray(

            json.messages

          )

        ) {

          return

        }



        setMyParticipantId(

          json.myParticipantId ??

            null

        )



        setConversationType(

          json.conversation

            ?.type ??

            null

        )



        setDisplayName(

          json.conversation

            ?.displayName ||

            'Unterhaltung'

        )



        setMessages(

          (current) => {

            const map =

              new Map<

                string,

                Message

              >()



            for (

              const message

              of current

            ) {

              map.set(

                message.id,

                message

              )

            }



            for (

              const message

              of json.messages

            ) {

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

          }

        )



        await markRead()



        requestAnimationFrame(

          scrollToBottom

        )

      } catch (

        error

      ) {

        console.error(

          '[chat] realtime refresh:',

          error

        )

      }

    }, [

      chatId,

      isNewChat,

      markRead,

      scrollToBottom,

    ])



  // =====================================================

  // REALTIME LISTENER

  // =====================================================



  useEffect(() => {

    const handleRealtimeMessage =

      () => {

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

  }, [

    refreshLatestMessages,

  ])



  // =====================================================

  // ÄLTERE NACHRICHTEN LADEN

  // =====================================================



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



      if (!list) {

        return

      }



      setLoadingOlder(

        true

      )



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

              cache:

                'no-store',



              credentials:

                'include',

            }

          )



        const json =

          await res

            .json()

            .catch(

              () => null

            )



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



            if (

              !currentList

            ) {

              return

            }



            const newHeight =

              currentList.scrollHeight



            currentList.scrollTop =

              newHeight -

              previousHeight

          }

        )

      } catch (

        error

      ) {

        console.error(

          '[chat] older messages:',

          error

        )

      } finally {

        setLoadingOlder(

          false

        )

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



    if (!list) {

      return

    }



    if (

      list.scrollTop <

      80

    ) {

      void loadOlderMessages()

    }

  }



  // =====================================================

  // BLOCKIEREN / ENTSPERREN

  // =====================================================



  async function toggleBlock() {

    if (

      !chatId ||

      blockLoading

    ) {

      return

    }



    if (

      !blocked &&

      !window.confirm(

        `Möchtest du ${displayName} wirklich blockieren? Danach könnt ihr euch gegenseitig keine neuen Nachrichten mehr senden.`

      )

    ) {

      return

    }



    setBlockLoading(

      true

    )



    setErrorMessage(

      null

    )



    try {

      const res =

        await fetch(

          '/api/messages/block',

          {

            method:

              'POST',



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



                blocked:

                  !blocked,

              }),

          }

        )



      const json =

        await res

          .json()

          .catch(

            () => null

          )



      if (

        !res.ok ||

        !json?.ok

      ) {

        throw new Error(

          blocked

            ? 'Blockierung konnte nicht aufgehoben werden.'

            : 'Nutzer konnte nicht blockiert werden.'

        )

      }



      const nowBlocked =

        Boolean(

          json.blocked

        )



      setBlocked(

        nowBlocked

      )



      if (nowBlocked) {

        setSelectedFile(

          null

        )

      }

    } catch (

      error

    ) {

      setErrorMessage(

        error instanceof Error

          ? error.message

          : 'Aktion konnte nicht durchgeführt werden.'

      )

    } finally {

      setBlockLoading(

        false

      )

    }

  }



  // =====================================================

  // MELDUNG ABSENDEN

  // =====================================================



  async function submitReport() {

    if (

      !chatId ||

      !reportReason ||

      reportLoading

    ) {

      return

    }



    setReportLoading(

      true

    )



    setErrorMessage(

      null

    )



    try {

      const res =

        await fetch(

          '/api/messages/report',

          {

            method:

              'POST',



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



                reason:

                  reportReason,



                details:

                  reportDetails.trim(),

              }),

          }

        )



      const json =

        await res

          .json()

          .catch(

            () => null

          )



      if (

        !res.ok ||

        !json?.ok

      ) {

        throw new Error(

          json?.message ||

            'Meldung konnte nicht gesendet werden.'

        )

      }



      setReportSuccess(

        true

      )



      setReportReason('')

      setReportDetails('')

      await loadOwnReport()

    } catch (

      error

    ) {

      setErrorMessage(

        error instanceof Error

          ? error.message

          : 'Meldung konnte nicht gesendet werden.'

      )

    } finally {

      setReportLoading(

        false

      )

    }

  }



  // =====================================================

  // DATEIAUSWAHL

  // =====================================================



  function selectFile(

    file: File

  ) {

    setErrorMessage(

      null

    )



    if (blocked) {

      setErrorMessage(

        'Du hast diesen Nutzer blockiert.'

      )



      return

    }



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



    setSelectedFile(

      file

    )

  }



  function handleFileInputChange(

    event:

      React.ChangeEvent<HTMLInputElement>

  ) {

    const file =

      event.target

        .files?.[0]



    event.target.value =

      ''



    if (file) {

      selectFile(file)

    }

  }



  function handleDrop(

    event:

      React.DragEvent<HTMLDivElement>

  ) {

    event.preventDefault()



    if (blocked) {

      return

    }



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

  // NACHRICHT SENDEN

  // =====================================================



  async function sendMessage() {

    if (

      !chatId ||

      sending ||

      blocked

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

      let activeConversationId = chatId



if (isNewChat) {

  if (

    !newRecipientId ||

    !newSourceType ||

    !newSourceId

  ) {

    throw new Error(

      'Die Unterhaltung konnte nicht vorbereitet werden.'

    )

  }



  const startRes = await fetch(

    '/api/messages/start',

    {

      method: 'POST',

      credentials: 'include',

      headers: {

        'Content-Type': 'application/json',

      },

      body: JSON.stringify({

        recipientId: newRecipientId,

        sourceType: newSourceType,

        sourceId: newSourceId,

        create: true,

      }),

    }

  )



  const startJson =

    await startRes

      .json()

      .catch(() => null)



  if (

    !startRes.ok ||

    !startJson?.conversationId

  ) {

    throw new Error(

      startJson?.message ||

        'Unterhaltung konnte nicht gestartet werden.'

    )

  }



  activeConversationId =

    String(startJson.conversationId)

}

      let attachment:

        | {

            storagePath:

              string



            originalFilename:

              string



            mimeType:

              string



            fileSize:

              number

          }

        | undefined



      // =================================================

      // DATEI VORBEREITEN

      // =================================================



      if (selectedFile) {

        setUploadStatus(

          'Datei wird vorbereitet …'

        )



        const prepareRes =

          await fetch(

            '/api/messages/attachments/prepare',

            {

              method:

                'POST',



              headers: {

                'Content-Type':

                  'application/json',

              },



              credentials:

                'include',



              body:

                JSON.stringify({

                  conversationId:

                  activeConversationId,



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

            .catch(

              () => null

            )



        if (

          !prepareRes.ok ||

          !prepareJson?.ok

        ) {

          if (

            prepareJson

              ?.error ===

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



        // =================================================

        // DIREKT ZU SUPABASE STORAGE

        // =================================================



        setUploadStatus(

          'Datei wird hochgeladen …'

        )



        const upload =

          prepareJson.upload



        const supabase =

          supabaseBrowser()



        const {

          error:

            uploadError,

        } =

          await supabase

            .storage

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



        if (

          uploadError

        ) {

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



      // =================================================

      // NACHRICHT SPEICHERN

      // =================================================



      const sendRes =

        await fetch(

          '/api/messages/send',

          {

            method:

              'POST',



            headers: {

              'Content-Type':

                'application/json',

            },



            credentials:

              'include',



            body:

              JSON.stringify({

                conversationId:

  activeConversationId,



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

          .catch(

            () => null

          )



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



        if (

          sendJson?.error ===

          'chat_blocked'

        ) {

          throw new Error(

            'Zwischen diesen Nutzern können derzeit keine Nachrichten gesendet werden.'

          )

        }



        throw new Error(

          sendJson?.message ||

            'Nachricht konnte nicht gesendet werden.'

        )

      }



      // =================================================

      // SUPPORT-AGENT: EIGENE PARTICIPANT-ID

      // =================================================



      if (

        !myParticipantId &&

        sendJson.message

          ?.sender_participant_id

      ) {

        setMyParticipantId(

          sendJson.message

            .sender_participant_id

        )

      }



      // =================================================

      // LOKAL SOFORT ANZEIGEN

      // =================================================



      if (

        sendJson.message

          ?.id

      ) {

        setMessages(

          (current) => {

            const exists =

              current.some(

                (

                  message

                ) =>

                  message.id ===

                  sendJson

                    .message

                    .id

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



if (isNewChat) {

  router.replace(

    `/messages/${encodeURIComponent(

      activeConversationId

    )}`

  )

}



window.dispatchEvent(

        new Event(

          'chat:refresh'

        )

      )



      requestAnimationFrame(

        scrollToBottom

      )

    } catch (

      error

    ) {

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



  // =====================================================

  // ENTER = SENDEN

  // SHIFT + ENTER = ZEILENUMBRUCH

  // =====================================================



  function handleKeyDown(

    event:

      React.KeyboardEvent<HTMLTextAreaElement>

  ) {

    if (

      event.key ===

        'Enter' &&

      !event.shiftKey

    ) {

      event.preventDefault()



      void sendMessage()

    }

  }



  // =====================================================

  // KEIN CHAT

  // =====================================================



  if (!chatId) {

    return (

      <p>

        Kein Chat ausgewählt.

      </p>

    )

  }



  // =====================================================

  // UI

  // =====================================================



  if (loading && !isNewChat) {

    return (

      <div

        className={styles.chatPage}

      >

        <div

          style={{

            minHeight: '60vh',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

          }}

        >

          <div

            role="status"

            aria-live="polite"

            aria-label="Chat wird geladen"

            style={{

              width: 36,

              height: 36,

              border: '3px solid #e5e5e5',

              borderTopColor: '#111',

              borderRadius: '50%',

              animation: 'chatSpin 0.8s linear infinite',

            }}

          />



          <style jsx>{`

            @keyframes chatSpin {

              to {

                transform: rotate(360deg);

              }

            }

          `}</style>

        </div>

      </div>

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

        onDrop={

          handleDrop

        }

        onDragOver={

          handleDragOver

        }

      >

        <h1>

          Unterhaltung mit{' '}

          {displayName}

        </h1>



        {/* =================================================

            FEHLER

        ================================================= */}



        {errorMessage && (

          <div

            className={

              styles.chatError

            }

          >

            {errorMessage}

          </div>

        )}



        {/* =================================================

            NACHRICHTEN

        ================================================= */}



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

                  Noch keine

                  Nachrichten.

                </li>

              )}



            {messages.map(

              (message) => {

                const mine =

                  Boolean(

                    myParticipantId &&

                    message

                      .sender_participant_id ===

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



        {/* =================================================

            BLOCKIERUNG

        ================================================= */}



        {blocked && (

          <div

            className={

              styles.blockNotice

            }

          >

            Du hast diesen Nutzer blockiert.

            Neue Nachrichten sind nicht

            möglich, bis du die Blockierung

            aufhebst.

          </div>

        )}



        {/* =================================================

            DATEIVORSCHAU

        ================================================= */}



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



        {/* =================================================

            UPLOADSTATUS

        ================================================= */}



        {uploadStatus && (

          <div

            className={

              styles.uploadStatus

            }

          >

            {uploadStatus}

          </div>

        )}



        {/* =================================================

            EINGABE

        ================================================= */}



        <div

          className={

            styles.inputWrapper

          }

        >

          <textarea

            className={

              styles.textInput

            }

            placeholder={

              blocked

                ? 'Nutzer ist blockiert'

                : 'Antwort schreiben...'

            }

            value={

              inputValue

            }

            onChange={(

              event

            ) =>

              setInputValue(

                event.target.value

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

              sending ||

              blocked

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

              blocked ||

              (!inputValue.trim() &&

                !selectedFile)

            }

          >

            {sending

              ? 'Senden …'

              : 'Senden'}

          </button>

        </div>



        {/* =================================================

            EXTRAS

        ================================================= */}



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

              multiple={

                false

              }

              disabled={

                sending ||

                blocked

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

              schreiben – im

              Einklang mit unseren

              AGB.

            </p>



            <p>

              Diese Unterhaltung

              kann zur

              Qualitätssicherung

              mitgelesen werden.

            </p>



            {conversationType === 'user' &&
              ownReport && (
                <div
                  className={
                    styles.reportStatusBox
                  }
                >
                  <strong>
                    Status deiner Meldung:
                  </strong>

                  <span
                    className={
                      styles.reportStatusValue
                    }
                  >
                    {getReportStatusLabel(
                      ownReport.status
                    )}
                  </span>
                </div>
              )}



            {/* =============================================

                AKTIONEN

            ============================================= */}



            <div

              className={

                styles.chatActions

              }

            >

              {!isNewChat &&
                conversationType === 'user' && (

                  <button

                    type="button"

                    className={

                      styles.reportButton

                    }

                    onClick={() => {

                      setReportOpen(true)

                      setReportSuccess(false)

                    }}

                  >

                    Unterhaltung / Nutzer melden

                  </button>

                )}



              {!isNewChat &&

                    conversationType === 'user' && (

                  <button

                    type="button"

                    className={

                      styles.blockButton

                    }

                    onClick={() =>

                      void toggleBlock()

                    }

                    disabled={

                      blockLoading

                    }

                  >

                    {blockLoading

                      ? 'Bitte warten …'

                      : blocked

                        ? 'Blockierung aufheben'

                        : 'Nutzer blockieren'}

                  </button>

                )}

            </div>



            {/* =============================================

                MELDEBOX

            ============================================= */}



            {reportOpen &&
              conversationType === 'user' && (

              <div

                className={

                  styles.reportBox

                }

              >

                {reportSuccess ? (

                  <>

                    <strong>

                      Meldung wurde

                      übermittelt.

                    </strong>



                    <p>

                      Wir prüfen die

                      Unterhaltung.

                    </p>



                    <button

                      type="button"

                      className={

                        styles.reportCancelButton

                      }

                      onClick={() =>

                        setReportOpen(

                          false

                        )

                      }

                    >

                      Schließen

                    </button>

                  </>

                ) : (

                  <>

                    <strong>

                      Unterhaltung melden

                    </strong>



                    <select

                      className={

                        styles.reportSelect

                      }

                      value={

                        reportReason

                      }

                      onChange={(

                        event

                      ) =>

                        setReportReason(

                          event

                            .target

                            .value

                        )

                      }

                    >

                      <option value="">

                        Grund auswählen

                      </option>



                      <option value="spam">

                        Spam / Werbung

                      </option>



                      <option value="beleidigung">

                        Beleidigung /

                        Belästigung

                      </option>



                      <option value="betrug">

                        Betrug /

                        Täuschung

                      </option>



                      <option value="unangemessene_inhalte">

                        Unangemessene

                        Inhalte

                      </option>



                      <option value="sonstiges">

                        Sonstiges

                      </option>

                    </select>



                    <textarea

                      className={

                        styles.reportTextarea

                      }

                      value={

                        reportDetails

                      }

                      maxLength={

                        2000

                      }

                      placeholder="Optional: Beschreibe kurz, was passiert ist."

                      onChange={(

                        event

                      ) =>

                        setReportDetails(

                          event

                            .target

                            .value

                        )

                      }

                    />



                    <div

                      className={

                        styles.reportActions

                      }

                    >

                      <button

                        type="button"

                        className={

                          styles.reportCancelButton

                        }

                        onClick={() => {

                          setReportOpen(

                            false

                          )



                          setReportReason(

                            ''

                          )



                          setReportDetails(

                            ''

                          )

                        }}

                      >

                        Abbrechen

                      </button>



                      <button

                        type="button"

                        className={

                          styles.reportSubmitButton

                        }

                        disabled={

                          !reportReason ||

                          reportLoading

                        }

                        onClick={() =>

                          void submitReport()

                        }

                      >

                        {reportLoading

                          ? 'Wird gesendet …'

                          : 'Meldung senden'}

                      </button>

                    </div>

                  </>

                )}

              </div>

            )}

          </div>

        </div>

      </div>

    </div>

  )

}