import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  ArrowDown,
  Bot,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  FileText,
  Heart,
  Send,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Link, useLocation } from "react-router-dom"
import { ASK_AI_PALETTE, getAskAiTheme } from "./constants"
import { isLandingThemedPath, toLandingPath } from "@/lib/appNavigation"
import { cn } from "@/lib/utils"
import { openCitation } from "@/api/askAiApi"

const PROMPT_MAX_LENGTH = 5000
const COLLAPSE_THRESHOLD = 600
const VIRTUALIZE_THRESHOLD = 40

const normalizeAssistantText = (text) => {
  if (typeof text !== "string") return String(text ?? "")

  return text
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
}

const markdownComponents = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-800">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="mb-2 mt-4 text-2xl font-semibold text-zinc-800 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-3 text-xl font-semibold text-zinc-800 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-xl font-semibold text-zinc-800 first:mt-0">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-zinc-300 pl-3 text-zinc-500 last:mb-0">{children}</blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className)
    if (!isBlock) {
      return (
        <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800" {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className={cn("font-mono text-[0.85em] text-zinc-800", className)} {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-lg last:mb-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-4 border-zinc-200" />,
  table: ({ children }) => (
    <div className="mb-3 w-full overflow-x-auto last:mb-0">
      <table className="w-full min-w-[20rem] border-collapse text-left text-[19px]">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-100">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-zinc-200 last:border-b-0">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-zinc-200 px-3 py-2 text-left text-lg font-semibold text-zinc-800">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-zinc-200 px-3 py-2 align-top text-lg text-zinc-700">{children}</td>
  ),
}

function AssistantMarkdown({ text }) {
  const content = useMemo(() => normalizeAssistantText(text), [text])

  return (
    <div className="ask-ai-markdown text-[19px] leading-relaxed text-zinc-600 break-words [overflow-wrap:anywhere]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

const formatTimestamp = (value) => {
  if (!value) return ""
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

function MessageActions({
  text,
  messageKey,
  feedback,
  onFeedback,
  onRaiseQuery,
  isLong,
  expanded,
  onToggleExpand,
  theme,
  showFeedback = true,
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text || "")
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore clipboard errors
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[17px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Copy message"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>

        {isLong ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[17px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            aria-label={expanded ? "Collapse message" : "Expand message"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Collapse" : "Expand"}
          </button>
        ) : null}

        {showFeedback ? (
          <>
            {!feedback ? (
              <>
                <button
                  type="button"
                  onClick={() => onFeedback(messageKey, "up")}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100"
                  aria-label="Thumbs up"
                >
                  <ThumbsUp className="h-3.5 w-3.5" style={{ color: theme.accent }} />
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(messageKey, "down")}
                  className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100"
                  aria-label="Thumbs down"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}

            {feedback === "up" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[17px] font-medium text-rose-600">
                <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                Thanks
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      {showFeedback && feedback === "down" ? (
        <p className="text-[17px] leading-relaxed text-zinc-500">
          You may raise a query to the Compliance team by{" "}
          <button
            type="button"
            onClick={onRaiseQuery}
            className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-80"
            style={{ color: theme.accent }}
          >
            clicking here
          </button>
          .
        </p>
      ) : null}
    </div>
  )
}

function TypingDots({ theme }) {
  return (
    <div className="flex items-center gap-1.5" aria-label="Assistant is typing" role="status">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="ask-ai-typing-dot h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: theme.accent,
            animationDelay: `${dot * 0.16}s`,
          }}
        />
      ))}
    </div>
  )
}

function ChatMessage({
  message,
  index,
  activeId,
  feedbackByMessage,
  onFeedback,
  onRaiseQuery,
  theme,
  knowledgeHubLink,
  expandedByKey,
  onToggleExpand,
  isWaitingForReply = false,
}) {
  const messageKey = `${activeId}-${index}`
  const feedback = feedbackByMessage[messageKey]
  const text = message.text || ""
  const isLong = text.length > COLLAPSE_THRESHOLD
  const expanded = Boolean(expandedByKey[messageKey])
  const displayText = isLong && !expanded ? `${text.slice(0, COLLAPSE_THRESHOLD)}…` : text
  const timestamp = formatTimestamp(message.createdAt)

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-1">
          <div
            className="rounded-2xl px-4 py-3 text-[19px] leading-relaxed text-white break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
            style={{ background: theme.gradient }}
          >
            {displayText}
          </div>
          {timestamp ? <p className="text-right text-[14px] text-zinc-400">{timestamp}</p> : null}
          <div className="flex justify-end">
            <MessageActions
              text={text}
              messageKey={messageKey}
              feedback={feedback}
              onFeedback={onFeedback}
              isLong={isLong}
              expanded={expanded}
              onToggleExpand={() => onToggleExpand(messageKey)}
              theme={theme}
              showFeedback={false}
            />
          </div>
        </div>
      </div>
    )
  }

  if (isWaitingForReply) {
    return (
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: theme.gradient }}
        >
          <Bot className="h-5 w-5 text-white" />
        </div>
        <div className="flex h-9 min-w-0 flex-1 items-center">
          <TypingDots theme={theme} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: theme.gradient }}
      >
        <Bot className="h-5 w-5 text-white" />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {message.role === "assistant" ? (
          <AssistantMarkdown text={displayText} />
        ) : (
          <p className="break-words text-[19px] leading-relaxed text-zinc-600 [overflow-wrap:anywhere]">{displayText}</p>
        )}

        {timestamp ? <p className="text-[14px] text-zinc-400">{timestamp}</p> : null}

        <MessageActions
          text={text}
          messageKey={messageKey}
          feedback={feedback}
          onFeedback={onFeedback}
          onRaiseQuery={onRaiseQuery}
          isLong={isLong}
          expanded={expanded}
          onToggleExpand={() => onToggleExpand(messageKey)}
          theme={theme}
          showFeedback
        />
        {message.sources?.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.sources.map((source) => (
              <button
                key={source.blob_path}
                type="button"
                // onClick={() => {
                //   console.log("getChatBaseUrl():", getChatBaseUrl())
                //   const url =
                //     `${getChatBaseUrl()}/api/ask-ai/citation?blob_path=` +
                //     encodeURIComponent(source.blob_path)

                //   console.log("Citation URL:", url)

                //   window.open(url, "_blank")
                // }}
                onClick={async () => {
                  try {
                    await openCitation(source.blob_path)
                  } catch (err) {
                    console.error("Citation open failed", err)
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[17px] font-medium transition-colors hover:brightness-[0.97]"
                style={{
                  borderColor: `${ASK_AI_PALETTE.blue}2e`,
                  backgroundColor: ASK_AI_PALETTE.tintBlue,
                  color: ASK_AI_PALETTE.navy,
                }}
              >
                <FileText
                  className="h-3.5 w-3.5"
                  style={{ color: theme.accent }}
                />
                {source.label} (
                    {source.document_type === "event" ? "Gallery" : source.document_type}
                  )

              </button>
            ))}
          </div>
        ) : null}

        {message.citation ? (
          <div>
            <Link
              to={knowledgeHubLink}
              className="flex w-full max-w-[320px] items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition-opacity hover:bg-zinc-100"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[19px] font-semibold text-zinc-900">{message.citation.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0" style={{ color: theme.accent }} />
                  <span className="text-[17px] font-bold tracking-wide" style={{ color: theme.accent }}>
                    {message.citation.tag}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-zinc-400" />
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ChatPanel({
  title,
  messages,
  activeId,
  feedbackByMessage,
  onFeedback,
  onRaiseQuery,
  input,
  onInputChange,
  onSend,
  isSending,
  variant = "default",
  pendingChatLoad = null,
  onRetryChatLoad,
  isLoadingMessages = false,
  suggestedPrompts = [],
}) {
  const theme = getAskAiTheme(variant)
  const location = useLocation()
  const useLandingLinks = variant === "landing" || isLandingThemedPath(location.pathname)
  const knowledgeHubLink = useLandingLinks ? toLandingPath("/knowledgeHub") : "/knowledgeHub"

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const prevMessageCountRef = useRef(0)
  const stickToBottomRef = useRef(true)

  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const [expandedByKey, setExpandedByKey] = useState({})

  const canSend = Boolean(input.trim()) && !isSending
  const useVirtual = messages.length >= VIRTUALIZE_THRESHOLD
  const showSuggestedPrompts = messages.length === 0 && suggestedPrompts.length > 0 && !isSending

  const scrollToBottom = (behavior = "auto") => {
    const el = scrollRef.current
    if (!el) return
    try {
      el.scrollTo({ top: el.scrollHeight, behavior })
    } catch {
      el.scrollTop = el.scrollHeight
    }
    stickToBottomRef.current = true
    setIsAtBottom(true)
    setUnreadCount(0)
    setShowJumpToLatest(false)
  }

  const virtualizer = useVirtualizer({
    count: useVirtual ? messages.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: 8,
    measureElement:
      typeof window !== "undefined" && !navigator.userAgent.includes("Firefox")
        ? (element) => element.getBoundingClientRect().height
        : undefined,
  })

  // Reset scroll / arrow / unread state whenever the active chat changes.
  useLayoutEffect(() => {
    stickToBottomRef.current = true
    setIsAtBottom(true)
    setUnreadCount(0)
    setShowJumpToLatest(false)
    setExpandedByKey({})
    prevMessageCountRef.current = messages.length
    requestAnimationFrame(() => scrollToBottom("auto"))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset on chat switch
  }, [activeId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 24
      stickToBottomRef.current = atBottom
      setIsAtBottom(atBottom)
      if (atBottom) {
        setUnreadCount(0)
        setShowJumpToLatest(false)
      }
    }

    el.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener("scroll", onScroll)
  }, [activeId])

  // Auto-scroll when messages change if user is at bottom or streaming while stuck to bottom.
  useEffect(() => {
    const prevCount = prevMessageCountRef.current
    const nextCount = messages.length

    if (nextCount > prevCount && !stickToBottomRef.current) {
      setUnreadCount((count) => count + (nextCount - prevCount))
      setShowJumpToLatest(true)
    }

    prevMessageCountRef.current = nextCount

    if (stickToBottomRef.current || (isSending && isAtBottom)) {
      scrollToBottom("auto")
    }
  }, [messages, isSending, isAtBottom, activeId])

  // Restore focus to the prompt after sending finishes or when switching chats.
  useEffect(() => {
    if (!isSending) {
      inputRef.current?.focus()
    }
  }, [isSending, activeId])

  const resizeInput = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }

  useEffect(() => {
    resizeInput()
  }, [input])

  const handleInputChange = (value) => {
    onInputChange(value.slice(0, PROMPT_MAX_LENGTH))
  }

  const handleSend = () => {
    if (!canSend) return
    if (!stickToBottomRef.current) {
      setShowJumpToLatest(true)
    }
    onSend()
  }

  const handleToggleExpand = (messageKey) => {
    setExpandedByKey((prev) => ({ ...prev, [messageKey]: !prev[messageKey] }))
  }

  const renderMessage = (m, i) => {
    const isWaitingForReply =
      isSending &&
      i === messages.length - 1 &&
      m.role === "assistant" &&
      !(m.text || "").trim()

    return (
      <ChatMessage
        key={`${activeId}-${i}`}
        message={m}
        index={i}
        activeId={activeId}
        feedbackByMessage={feedbackByMessage}
        onFeedback={onFeedback}
        onRaiseQuery={onRaiseQuery}
        theme={theme}
        knowledgeHubLink={knowledgeHubLink}
        expandedByKey={expandedByKey}
        onToggleExpand={handleToggleExpand}
        isWaitingForReply={isWaitingForReply}
      />
    )
  }

  return (
    <section className="flex min-h-[min(660px,70vh)] min-w-0 flex-1 flex-col gap-3 lg:min-h-0">
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-[0_2px_10px_rgba(23,28,143,0.05)] backdrop-blur-sm",
          theme.borderClass,
        )}
        style={{ backgroundColor: theme.panelBg }}
      >
        {title ? (
          <header className="shrink-0 px-5 pb-1 pt-4">
            <p className="inline-flex items-center gap-2 text-[19px] font-semibold" style={{ color: theme.accent }}>
              <span
                className="h-3.5 w-1 rounded-full"
                style={{ background: theme.gradient }}
                aria-hidden="true"
              />
              {title}
            </p>
          </header>
        ) : null}

        {pendingChatLoad ? (
          <div className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[19px] text-amber-800 sm:mx-5">
            <span>
              Couldn’t load “{pendingChatLoad.title}”. Your current chat is still open.
            </span>
            <button
              type="button"
              onClick={onRetryChatLoad}
              disabled={isLoadingMessages}
              className="shrink-0 rounded-md bg-white px-3 py-1.5 text-[17px] font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-60"
            >
              {isLoadingMessages ? "Retrying…" : "Retry"}
            </button>
          </div>
        ) : null}

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-2 sm:px-6 scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent"
        >

          <div className="flex w-full min-w-0 flex-col gap-6">
            {messages.length === 0 ? (

              <div className="flex flex-col items-center justify-center py-[clamp(8px,2vh,40px)] text-center">
                {/* Icon */}
                <div className="relative mb-[clamp(10px,2.2vh,32px)]">
                  <div
                    className="flex size-[clamp(60px,9vh,112px)] items-center justify-center rounded-[clamp(1rem,1.8vh,2rem)]"
                    style={{
                      background: `linear-gradient(135deg, ${ASK_AI_PALETTE.tintBlue} 0%, ${ASK_AI_PALETTE.tintCyan} 100%)`,
                    }}
                  >
                    <div className="flex size-[clamp(42px,6.4vh,80px)] items-center justify-center rounded-[clamp(0.75rem,1.4vh,1.5rem)] bg-white shadow-[0_2px_10px_rgba(23,28,143,0.12)]">
                      <svg
                        className="size-[clamp(21px,3.2vh,40px)]"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <defs>
                          <linearGradient id="askAiEmptyIcon" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={ASK_AI_PALETTE.navy} />
                            <stop offset="55%" stopColor={ASK_AI_PALETTE.blue} />
                            <stop offset="100%" stopColor={ASK_AI_PALETTE.cyan} />
                          </linearGradient>
                        </defs>
                        <g stroke="url(#askAiEmptyIcon)">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          <line x1="9" y1="10" x2="15" y2="10" />
                          <line x1="12" y1="7" x2="12" y2="13" />
                        </g>
                      </svg>
                    </div>
                  </div>
                  <span
                    className="absolute right-0 -top-2 text-[clamp(13px,2vh,24px)] leading-none"
                    style={{ color: ASK_AI_PALETTE.cyan }}
                  >
                    ✦
                  </span>
                  <span
                    className="absolute -right-3 top-4 text-[clamp(9px,1.2vh,14px)] leading-none"
                    style={{ color: ASK_AI_PALETTE.teal }}
                  >
                    ✦
                  </span>
                </div>

                {/* Heading */}
                <h2
                  className="text-[clamp(26px,3.6vh,46px)] font-bold leading-tight"
                  style={{ color: "#171c4d" }}
                >
                  Hello! How can I help you today?
                </h2>
                <p className="mt-[clamp(4px,0.9vh,14px)] text-[clamp(17px,2vh,24px)] text-zinc-500">
                  Ask anything related to Compliance.
                </p>

                {/* Suggested prompts */}
                {suggestedPrompts.length > 0 ? (
                  <div className="mt-[clamp(12px,2.8vh,40px)] w-full max-w-3xl">
                    <div className="mb-[clamp(8px,1.4vh,20px)] flex items-center gap-3">
                      <span className="h-px flex-1 bg-zinc-200" />
                      <span className="text-[clamp(13px,1.5vh,18px)] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                        Try these examples
                      </span>
                      <span className="h-px flex-1 bg-zinc-200" />
                    </div>
                    <div className="flex flex-wrap justify-center gap-[clamp(8px,1.3vh,16px)]">
                      {suggestedPrompts.map((item, idx) => {
                        const promptText = item.prompt || ""
                        const icons = [
                          <svg key="doc" className="size-[clamp(14px,1.6vh,20px)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
                          <svg key="search" className="size-[clamp(14px,1.6vh,20px)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
                          <svg key="folder" className="size-[clamp(14px,1.6vh,20px)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
                        ]
                        const chip = theme.promptChips[idx % theme.promptChips.length]
                        return (
                          <button
                            key={item.id}
                            type="button"
                            title={promptText}
                            onClick={() => {
                              handleInputChange(promptText)
                              inputRef.current?.focus()
                            }}
                            className="group flex items-center gap-[clamp(8px,1.1vh,12px)] rounded-2xl border px-[clamp(10px,1.4vh,16px)] py-[clamp(8px,1.4vh,16px)] text-left text-[clamp(15px,1.75vh,20px)] font-medium shadow-[0_1px_3px_rgba(16,24,40,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(23,28,143,0.14)]"
                            style={{
                              // Widened alongside the larger chip font so prompt
                              // text still fits the 2-line clamp without truncating.
                              minWidth: "280px",
                              maxWidth: "340px",
                              backgroundColor: chip.cardBg,
                              borderColor: `${chip.border}59`,
                              color: chip.fg,
                            }}
                          >
                            <span
                              className="flex size-[clamp(30px,4vh,44px)] shrink-0 items-center justify-center rounded-xl"
                              style={{ backgroundColor: chip.chipBg, color: chip.fg }}
                            >
                              {icons[idx % icons.length]}
                            </span>
                            <span className="line-clamp-2 flex-1 leading-snug">{promptText}</span>
                            <ChevronRight
                              className="size-[clamp(14px,1.6vh,20px)] shrink-0 transition-transform group-hover:translate-x-0.5"
                              style={{ color: chip.fg }}
                            />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {useVirtual ? (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const m = messages[virtualRow.index]
                  return (
                    <div
                      key={virtualRow.key}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${virtualRow.start}px)`,
                        paddingBottom: "1.5rem",
                      }}
                    >
                      {renderMessage(m, virtualRow.index)}
                    </div>
                  )
                })}
              </div>
            ) : (
              messages.map((m, i) => renderMessage(m, i))
            )}
          </div>
        </div>

        {(!isAtBottom || showJumpToLatest) && (
          <div className="pointer-events-none relative z-10 -mt-2 flex justify-center px-8 pb-2">
            <button
              type="button"
              onClick={() => scrollToBottom("smooth")}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-[17px] font-medium text-zinc-700 shadow"
              aria-label="Jump to latest"
            >
              <ArrowDown className="h-4 w-4 text-zinc-600" />
              {showJumpToLatest || unreadCount > 0 ? "Jump to latest" : null}
              {unreadCount > 0 ? (
                <span
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[13px] font-semibold text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  {unreadCount}
                </span>
              ) : null}
            </button>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="shrink-0 rounded-xl border border-amber-200/80 bg-[#fffaf0]/90 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" strokeWidth={2} />
          <p className="text-[17px] leading-relaxed text-amber-900">
            Disclaimer: AI-generated responses may be incomplete or inaccurate. Please verify information
            with the referenced sources.<br/> For clarification, contact the Compliance team (
            <button
              type="button"
              onClick={onRaiseQuery}
              className="font-semibold underline underline-offset-2 transition-opacity hover:opacity-80"
              style={{ color: theme.accent }}
            >
              click here
            </button>
            ).
          </p>
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0">
        {showSuggestedPrompts ? null : null}
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border bg-white/90 py-2 pl-3 pr-2 shadow-[0_2px_10px_rgba(23,28,143,0.06)] backdrop-blur-sm",
            theme.borderClass,
          )}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type your question here..."
            disabled={isSending}
            rows={1}
            maxLength={PROMPT_MAX_LENGTH}
            className="max-h-36 min-h-[48px] min-w-0 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-[19px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: theme.gradient }}
            aria-label="Send message"
          >
            <Send className="h-4 w-4 -translate-x-px" strokeWidth={2.25} />
          </button>
        </div>
        <div className="mt-1 flex justify-end px-1">
          <span
            className={cn(
              "text-[14px] tabular-nums",
              input.length >= PROMPT_MAX_LENGTH ? "font-medium text-rose-600" : "text-zinc-400",
            )}
          >
            {input.length}/{PROMPT_MAX_LENGTH}
          </span>
        </div>
      </div>
    </section>
  )
}
