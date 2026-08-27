import { useCallback, useEffect, useRef, useState } from "react"
import {
  deleteAskAiChat,
  getAskAiChats,
  getAskAiMessages,
  getAskAiPrompts,
  pinAskAiChat,
  renameAskAiChat,
  saveAskAiChat,
  streamAskAiChat,
} from "@/api/askAiApi"
import { ChatPanel } from "@/components/ai/ChatPanel"
import { ConversationSidebar } from "@/components/ai/ConversationSidebar"
import { ASK_AI_PAGE_GRADIENT, ASK_AI_PALETTE, getAskAiTheme } from "@/components/ai/constants"
import { readAskAiSession, writeAskAiSession } from "@/components/ai/askAiSessionStore"
import { landingShellInnerClassName } from "@/components/landing/landingTheme"
import CenterToast from "@/components/shared/CenterToast"
import RaiseQueryModal from "@/components/compliance/RaiseQueryModal"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

const CHATS_PAGE_SIZE = 5

/**
 * Soft colour blooms layered over the page gradient. Purely decorative and
 * non-interactive, so it never intercepts clicks on the chat surface.
 */
function AskAiBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ backgroundColor: `${ASK_AI_PALETTE.blue}14` }}
      />
      <div
        className="absolute -right-24 top-1/3 h-[380px] w-[380px] rounded-full blur-3xl"
        style={{ backgroundColor: `${ASK_AI_PALETTE.cyan}16` }}
      />
      <div
        className="absolute -bottom-28 left-1/3 h-[360px] w-[360px] rounded-full blur-3xl"
        style={{ backgroundColor: `${ASK_AI_PALETTE.teal}12` }}
      />
    </div>
  )
}

const createConversation = (title = "New chat") => ({ id: crypto.randomUUID(), title, isLocal: true })

const mapRemoteChat = (chat) => ({
  id: chat.sessionId,
  title: chat.title,
  updatedAt: chat.updatedAt,
  isPinned: Boolean(chat.is_pinned),
})

const sortConversations = (chats) => {
  const localChats = chats.filter((chat) => chat.isLocal)
  const remoteChats = chats.filter((chat) => !chat.isLocal)
  const pinned = remoteChats.filter((chat) => chat.isPinned)
  const unpinned = remoteChats.filter((chat) => !chat.isPinned)
  return [...localChats, ...pinned, ...unpinned]
}

const mapHistoryMessages = (history) =>
  Array.isArray(history)
    ? history.map((item) => ({
        role: item.role,
        text: item.content,
        sources: item.sources || [],
        createdAt: item.createdAt || item.timestamp || item.updatedAt || null,
      }))
    : []

const isEmptyLocalChat = (chat, messagesById) => {
  if (!chat?.isLocal) return false
  const msgs = messagesById[chat.id] ?? []
  return !msgs.some((message) => message.role === "user")
}

const createFreshSession = () => {
  const conversation = createConversation()
  return {
    conversations: [conversation],
    messagesById: { [conversation.id]: [] },
    activeId: conversation.id,
    feedbackByMessage: {},
    input: "",
  }
}

export default function AskAiContent({ variant = "default" }) {
  const [sessionSeed] = useState(() => readAskAiSession() ?? createFreshSession())
  const [search, setSearch] = useState("")
  const [feedbackByMessage, setFeedbackByMessage] = useState(() => sessionSeed.feedbackByMessage ?? {})
  const [input, setInput] = useState(() => sessionSeed.input ?? "")
  const [isSending, setIsSending] = useState(false)
  const [toast, setToast] = useState({ open: false, variant: "success", message: "" })
  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameSessionId, setRenameSessionId] = useState(null)
  const [renameTitle, setRenameTitle] = useState("")
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteSessionId, setDeleteSessionId] = useState(null)
  const [deleteSessionTitle, setDeleteSessionTitle] = useState("")
  const [isActionPending, setIsActionPending] = useState(false)
  const [raiseQueryOpen, setRaiseQueryOpen] = useState(false)

  const [conversations, setConversations] = useState(() => sessionSeed.conversations)
  const [messagesById, setMessagesById] = useState(() => sessionSeed.messagesById)
  const [activeId, setActiveId] = useState(() => sessionSeed.activeId)

  const [hasMoreChats, setHasMoreChats] = useState(false)
  const [isLoadingChats, setIsLoadingChats] = useState(false)
  const [isLoadingMoreChats, setIsLoadingMoreChats] = useState(false)
  const [chatsError, setChatsError] = useState(null)
  const [pendingChatLoad, setPendingChatLoad] = useState(null)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [pinningSessionId, setPinningSessionId] = useState(null)
  const [suggestedPrompts, setSuggestedPrompts] = useState([])

  const chatsOffsetRef = useRef(0)
  const searchRef = useRef(search)
  const activeIdRef = useRef(activeId)

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const messages = messagesById[activeId] ?? []
  const activeConversation = conversations.find((c) => c.id === activeId)
  // Disable only when the active chat is already an unused empty local chat.
  const newChatDisabled = Boolean(activeConversation && isEmptyLocalChat(activeConversation, messagesById))
  const isSearchActive = search.trim().length >= 2

  // Persist opened chat + messages for the browser session (survives route changes).
  useEffect(() => {
    writeAskAiSession({
      conversations,
      messagesById,
      activeId,
      feedbackByMessage,
      input,
    })
  }, [conversations, messagesById, activeId, feedbackByMessage, input])

  const getSearchQuery = (value = search) => {
    const trimmed = value.trim()
    return trimmed.length >= 2 ? trimmed : ""
  }

  const loadChats = useCallback(async ({ append = false, searchValue } = {}) => {
    const searchQuery = getSearchQuery(searchValue ?? searchRef.current)
    const offset = append ? chatsOffsetRef.current : 0

    if (append) {
      setIsLoadingMoreChats(true)
    } else {
      setIsLoadingChats(true)
      setChatsError(null)
    }

    try {
      const newChats = await getAskAiChats({
        limit: CHATS_PAGE_SIZE,
        offset,
        search: searchQuery,
      })
      const remoteChats = Array.isArray(newChats) ? newChats.map(mapRemoteChat) : []

      chatsOffsetRef.current = offset + remoteChats.length
      setHasMoreChats(remoteChats.length >= CHATS_PAGE_SIZE)

      setConversations((prev) => {
        if (append) {
          const existingIds = new Set(prev.map((chat) => chat.id))
          return sortConversations([
            ...prev,
            ...remoteChats.filter((chat) => !existingIds.has(chat.id)),
          ])
        }

        // Search: show backend results only (no local/frontend filtering).
        if (searchQuery) {
          return sortConversations(remoteChats)
        }

        const localChats = prev.filter((chat) => chat.isLocal)
        const remoteIds = new Set(remoteChats.map((chat) => chat.id))
        // Keep the currently open remote chat in the sidebar even if it's past page 1.
        const activeRemote = prev.find(
          (chat) =>
            chat.id === activeIdRef.current &&
            !chat.isLocal &&
            !remoteIds.has(chat.id),
        )

        return sortConversations([
          ...localChats.filter((chat) => !remoteIds.has(chat.id)),
          ...(activeRemote ? [activeRemote] : []),
          ...remoteChats,
        ])
      })
    } catch (error) {
      console.error("Failed to load CompliAI chats", error)
      setChatsError("Could not load conversations.")
      if (!append) {
        setToast({
          open: true,
          variant: "error",
          message: "Could not load conversations. Please try again.",
        })
      }
    } finally {
      setIsLoadingChats(false)
      setIsLoadingMoreChats(false)
    }
  }, [])

  useEffect(() => {
    searchRef.current = search
    const trimmed = search.trim()

    // Search only when empty (full list) or >= 2 characters.
    if (trimmed.length === 1) return

    const timer = window.setTimeout(() => {
      chatsOffsetRef.current = 0
      loadChats({ append: false, searchValue: search })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [search, loadChats])

  useEffect(() => {
    let cancelled = false

    const loadPrompts = async () => {
      try {
        const response = await getAskAiPrompts()
        const prompts = Array.isArray(response?.data) ? response.data : []
        if (!cancelled) {
          setSuggestedPrompts(prompts.slice(0, 3))
        }
      } catch (error) {
        console.error("Failed to load CompliAI prompts", error)
        if (!cancelled) {
          setSuggestedPrompts([])
        }
      }
    }

    loadPrompts()
    return () => {
      cancelled = true
    }
  }, [])

  const loadChatMessages = async (id, { switchOnSuccess = true } = {}) => {
    const selectedConversation = conversations.find((c) => c.id === id)
    if (!selectedConversation || selectedConversation.isLocal) {
      setMessagesById((prev) => ({ ...prev, [id]: prev[id] ?? [] }))
      if (switchOnSuccess) {
        setActiveId(id)
        setInput("")
        setPendingChatLoad(null)
      }
      return true
    }

    if (messagesById[id] !== undefined) {
      if (switchOnSuccess) {
        setActiveId(id)
        setInput("")
        setPendingChatLoad(null)
      }
      return true
    }

    setIsLoadingMessages(true)
    try {
      const history = await getAskAiMessages({ sessionId: id })
      setMessagesById((prev) => ({ ...prev, [id]: mapHistoryMessages(history) }))
      if (switchOnSuccess) {
        setActiveId(id)
        setInput("")
        setPendingChatLoad(null)
      }
      return true
    } catch (error) {
      console.error("Failed to load chat history", error)
      setPendingChatLoad({
        sessionId: id,
        title: selectedConversation.title,
      })
      setToast({
        open: true,
        variant: "error",
        message: "Could not load that chat. Please retry.",
      })
      return false
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const selectConversation = async (id) => {
    if (id === activeId) return
    await loadChatMessages(id, { switchOnSuccess: true })
  }

  const retryPendingChatLoad = async () => {
    if (!pendingChatLoad?.sessionId) return
    await loadChatMessages(pendingChatLoad.sessionId, { switchOnSuccess: true })
  }

  const openRenameConversation = (id) => {
    const current = conversations.find((c) => c.id === id)
    if (!current) return

    setRenameSessionId(id)
    setRenameTitle(current.title)
    setRenameModalOpen(true)
  }

  const handleRenameSubmit = async () => {
    const trimmedTitle = renameTitle.trim()
    if (!trimmedTitle || !renameSessionId) return

    setIsActionPending(true)
    try {
      await renameAskAiChat({ sessionId: renameSessionId, newTitle: trimmedTitle })
      updateConversationTitle(renameSessionId, trimmedTitle)
      setRenameModalOpen(false)
      setToast({ open: true, variant: "success", message: "Chat renamed successfully" })
    } catch (error) {
      console.error("Failed to rename chat", error)
      setToast({ open: true, variant: "error", message: "Could not rename chat. Please try again." })
    } finally {
      setIsActionPending(false)
    }
  }

  const openDeleteConversation = (id) => {
    const current = conversations.find((c) => c.id === id)
    if (!current) return

    setDeleteSessionId(id)
    setDeleteSessionTitle(current.title)
    setDeleteModalOpen(true)
  }

  const handleTogglePinConversation = async (id, isPinned) => {
    const current = conversations.find((c) => c.id === id)
    if (!current || current.isLocal || pinningSessionId) return

    setPinningSessionId(id)
    try {
      await pinAskAiChat({ sessionId: id, isPinned })
      chatsOffsetRef.current = 0
      await loadChats({ append: false })
    } catch (error) {
      console.error("Failed to update chat pin", error)
      setToast({
        open: true,
        variant: "error",
        message: isPinned ? "Could not pin chat. Please try again." : "Could not unpin chat. Please try again.",
      })
    } finally {
      setPinningSessionId(null)
    }
  }

  const handleDeleteSubmit = async () => {
    if (!deleteSessionId) return

    setIsActionPending(true)
    try {
      await deleteAskAiChat({ sessionId: deleteSessionId })
      const remainingConversations = conversations.filter((conversation) => conversation.id !== deleteSessionId)
      setConversations(remainingConversations)
      setMessagesById((prev) => {
        const next = { ...prev }
        delete next[deleteSessionId]
        return next
      })

      if (pendingChatLoad?.sessionId === deleteSessionId) {
        setPendingChatLoad(null)
      }

      if (activeId === deleteSessionId) {
        if (remainingConversations.length > 0) {
          setActiveId(remainingConversations[0].id)
        } else {
          const conversation = createConversation()
          setConversations([conversation])
          setMessagesById({ [conversation.id]: [] })
          setActiveId(conversation.id)
        }
      }

      setDeleteModalOpen(false)
      setToast({ open: true, variant: "success", message: "Chat deleted successfully" })
    } catch (error) {
      console.error("Failed to delete chat", error)
      setToast({ open: true, variant: "error", message: "Could not delete chat. Please try again." })
    } finally {
      setIsActionPending(false)
    }
  }

  const startNewChat = () => {
    const existingEmpty = conversations.find((chat) => isEmptyLocalChat(chat, messagesById))
    if (existingEmpty) {
      setActiveId(existingEmpty.id)
      setInput("")
      setPendingChatLoad(null)
      chatsOffsetRef.current = 0
      loadChats({ append: false })
      return
    }

    const conversation = createConversation()
    setConversations((prev) => [conversation, ...prev])
    setMessagesById((prev) => ({ ...prev, [conversation.id]: [] }))
    setActiveId(conversation.id)
    setInput("")
    setPendingChatLoad(null)
    chatsOffsetRef.current = 0
    loadChats({ append: false })
  }

  const updateConversationTitle = (id, title) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id ? { ...conversation, title } : conversation,
      ),
    )
  }

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const convId = activeId
    const now = new Date().toISOString()
    setMessagesById((prev) => ({
      ...prev,
      [convId]: [
        ...(prev[convId] ?? []),
        { role: "user", text: trimmed, createdAt: now },
        { role: "assistant", text: "", sources: [], createdAt: now },
      ],
    }))
    setInput("")

    const currentConversation = conversations.find((c) => c.id === convId)
    if (currentConversation?.title === "New chat") {
      updateConversationTitle(convId, trimmed.slice(0, 30))
    }

    setIsSending(true)

    let responseText = ""
    let responseSources = []

    try {
      await streamAskAiChat({
        sessionId: convId,
        query: trimmed,
        onChunk: (chunk) => {
          responseText += chunk
          setMessagesById((prev) => {
            const conversationMessages = prev[convId] ?? []
            if (conversationMessages.length === 0) {
              return prev
            }

            const updatedMessages = [...conversationMessages]
            const lastIndex = updatedMessages.length - 1
            const lastMessage = updatedMessages[lastIndex]

            if (lastMessage?.role === "assistant") {
              updatedMessages[lastIndex] = { ...lastMessage, text: (lastMessage.text || "") + chunk }
            }

            return {
              ...prev,
              [convId]: updatedMessages,
            }
          })
        },
        onSources: (sources) => {
          responseSources = sources || []
            setMessagesById((prev) => {
                const conversationMessages = prev[convId] ?? []

                if (conversationMessages.length === 0) {
                    return prev
                }

                const updatedMessages = [...conversationMessages]

                const lastIndex = updatedMessages.length - 1

                if (updatedMessages[lastIndex]?.role === "assistant") {
                    updatedMessages[lastIndex] = {
                        ...updatedMessages[lastIndex],
                        sources,
                    }
                }

                return {
                    ...prev,
                    [convId]: updatedMessages,
                }
            })
        }
      })

      await saveAskAiChat({ sessionId: convId, query: trimmed, response: responseText, sources: responseSources })

      // Mark local chat as persisted and refresh sidebar from backend.
      if (currentConversation?.isLocal) {
        setConversations((prev) =>
          prev.map((chat) => (chat.id === convId ? { ...chat, isLocal: false } : chat)),
        )
      }
      chatsOffsetRef.current = 0
      await loadChats({ append: false })
    } catch (error) {
      setMessagesById((prev) => {
        const conversationMessages = prev[convId] ?? []
        if (conversationMessages.length === 0) {
          return {
            ...prev,
            [convId]: [
              {
                role: "assistant",
                text: "Sorry, we couldn't process your request. Please try again.",
                createdAt: new Date().toISOString(),
              },
            ],
          }
        }

        const updatedMessages = [...conversationMessages]
        const lastIndex = updatedMessages.length - 1
        const lastMessage = updatedMessages[lastIndex]

        if (lastMessage?.role === "assistant") {
          updatedMessages[lastIndex] = {
            ...lastMessage,
            text: "Sorry, we couldn't process your request. Please try again.",
          }
        } else {
          updatedMessages.push({
            role: "assistant",
            text: "Sorry, we couldn't process your request. Please try again.",
            createdAt: new Date().toISOString(),
          })
        }

        return {
          ...prev,
          [convId]: updatedMessages,
        }
      })
      console.error("CompliAI error", error)
    } finally {
      setIsSending(false)
    }
  }

  const setFeedback = (messageKey, type) => {
    setFeedbackByMessage((prev) => ({ ...prev, [messageKey]: type }))
  }

  const theme = getAskAiTheme(variant)
  const primaryButtonStyle = { backgroundColor: theme.accent }

  const chatSurface = (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4 lg:flex-row lg:items-stretch">
      <ConversationSidebar
        search={search}
        onSearchChange={setSearch}
        onNewChat={startNewChat}
        newChatDisabled={newChatDisabled}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={selectConversation}
        onRenameConversation={openRenameConversation}
        onDeleteConversation={openDeleteConversation}
        onTogglePinConversation={handleTogglePinConversation}
        pinningSessionId={pinningSessionId}
        variant={variant}
        hasMore={hasMoreChats}
        onLoadMore={() => loadChats({ append: true })}
        isLoadingMore={isLoadingMoreChats}
        isLoading={isLoadingChats}
        chatsError={chatsError}
        onRetryChats={() => loadChats({ append: false })}
        isSearchActive={isSearchActive}
      />

      <ChatPanel
        title={variant === "landing" ? "CompliAI" : undefined}
        messages={messages}
        activeId={activeId}
        feedbackByMessage={feedbackByMessage}
        onFeedback={setFeedback}
        onRaiseQuery={() => setRaiseQueryOpen(true)}
        input={input}
        onInputChange={setInput}
        onSend={sendMessage}
        isSending={isSending}
        variant={variant}
        pendingChatLoad={pendingChatLoad}
        onRetryChatLoad={retryPendingChatLoad}
        isLoadingMessages={isLoadingMessages}
        suggestedPrompts={suggestedPrompts}
      />
    </div>
  )

  return (
    <>
      {variant === "landing" ? (
        <div className="relative overflow-hidden" style={{ background: ASK_AI_PAGE_GRADIENT }}>
          <AskAiBackdrop />
          <div className={landingShellInnerClassName("relative z-[1] pb-6 pt-4")}>
            <div className="flex h-[calc(125dvh-22rem)] min-h-[660px] min-w-0 flex-col">
              {chatSurface}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="relative flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden py-6 md:py-8"
          style={{ background: ASK_AI_PAGE_GRADIENT }}
        >
          <AskAiBackdrop />
          <h1
            className="relative z-[1] mb-4 text-xl font-semibold tracking-tight"
            style={{ color: theme.primary }}
          >
            CompliAI
          </h1>
          <div className="relative z-[1] flex h-[min(860px,calc(100dvh-14rem))] min-h-[560px] min-w-0 max-w-full flex-1 flex-col">
            {chatSurface}
          </div>
        </div>
      )}

      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-600">Enter a new title for this chat.</p>
            <Input
              value={renameTitle}
              onChange={(event) => setRenameTitle(event.target.value)}
              placeholder="Chat title"
              autoFocus
            />
          </div>
          <DialogFooter className="mt-6 gap-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => setRenameModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={primaryButtonStyle}
              onClick={handleRenameSubmit}
              disabled={isActionPending || !renameTitle.trim()}
            >
              Rename
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chat</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-600">
              Are you sure you want to delete the chat "{deleteSessionTitle}"? This action cannot be undone.
            </p>
          </div>
          <DialogFooter className="mt-6 gap-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleDeleteSubmit}
              disabled={isActionPending}
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RaiseQueryModal open={raiseQueryOpen} onOpenChange={setRaiseQueryOpen} />

      <CenterToast
        open={toast.open}
        variant={toast.variant}
        message={toast.message}
        onClose={() => setToast((current) => ({ ...current, open: false }))}
      />
    </>
  )
}
