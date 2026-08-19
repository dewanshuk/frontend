import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  ArrowUp,
  ArrowDown,
  Bot,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  FileText,
  Heart,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Link, useLocation } from "react-router-dom"
import { getAskAiTheme } from "./constants"
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
  h1: ({ children }) => <h1 className="mb-2 mt-4 text-base font-semibold text-zinc-800 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-3 text-sm font-semibold text-zinc-800 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-sm font-semibold text-zinc-800 first:mt-0">{children}</h3>,
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
    <pre className="mb-3 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs last:mb-0">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-4 border-zinc-200" />,
  table: ({ children }) => (
    <div className="mb-3 w-full overflow-x-auto last:mb-0">
      <table className="w-full min-w-[20rem] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-100">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-zinc-200 last:border-b-0">{children}</tr>,
  th: ({ children }) => (
    <th className="border border-zinc-200 px-3 py-2 text-left text-xs font-semibold text-zinc-800">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border border-zinc-200 px-3 py-2 align-top text-xs text-zinc-700">{children}</td>
  ),
}

function AssistantMarkdown({ text }) {
  const content = useMemo(() => normalizeAssistantText(text), [text])

  return (
    <div className="ask-ai-markdown text-sm leading-relaxed text-zinc-600 break-words [overflow-wrap:anywhere]">
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
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Copy message"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>

        {isLong ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
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
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                <Heart className="h-3 w-3 fill-rose-500 text-rose-500" />
                Thanks
              </span>
            ) : null}
          </>
        ) : null}
      </div>

      {showFeedback && feedback === "down" ? (
        <p className="text-xs leading-relaxed text-zinc-500">
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
            className="rounded-2xl px-4 py-3 text-sm leading-relaxed text-white break-words whitespace-pre-wrap [overflow-wrap:anywhere]"
            style={{ backgroundColor: theme.primary }}
          >
            {displayText}
          </div>
          {timestamp ? <p className="text-right text-[11px] text-zinc-400">{timestamp}</p> : null}
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
          style={{ backgroundColor: `${theme.primary}33` }}
        >
          <Bot className="h-5 w-5" style={{ color: theme.accentSoft }} />
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
        style={{ backgroundColor: `${theme.primary}33` }}
      >
        <Bot className="h-5 w-5" style={{ color: theme.accentSoft }} />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        {message.role === "assistant" ? (
          <AssistantMarkdown text={displayText} />
        ) : (
          <p className="break-words text-sm leading-relaxed text-zinc-600 [overflow-wrap:anywhere]">{displayText}</p>
        )}

        {timestamp ? <p className="text-[11px] text-zinc-400">{timestamp}</p> : null}

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
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
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
                <p className="text-sm font-semibold text-zinc-900">{message.citation.title}</p>
                <div className="mt-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0" style={{ color: theme.accent }} />
                  <span className="text-xs font-bold tracking-wide" style={{ color: theme.accent }}>
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
    <section className="flex min-h-[min(480px,52vh)] min-w-0 flex-1 flex-col bg-white lg:min-h-0">
      {title ? (
        <header className="shrink-0 px-4 pb-2 pt-4 sm:px-6 sm:pt-5">
          <p className="text-sm font-medium text-zinc-600">{title}</p>
        </header>
      ) : null}

      {pendingChatLoad ? (
        <div className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:mx-8">
          <span>
            Couldn’t load “{pendingChatLoad.title}”. Your current chat is still open.
          </span>
          <button
            type="button"
            onClick={onRetryChatLoad}
            disabled={isLoadingMessages}
            className="shrink-0 rounded-md bg-white px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-60"
          >
            {isLoadingMessages ? "Retrying…" : "Retry"}
          </button>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-2 sm:px-8 scrollbar-thin scrollbar-thumb-zinc-300 scrollbar-track-transparent"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              Start the conversation by typing a question below.
            </p>
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
        <div className="pointer-events-none relative z-10 -mt-2 flex justify-center px-8">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow"
            aria-label="Jump to latest"
          >
            <ArrowDown className="h-4 w-4 text-zinc-600" />
            {showJumpToLatest || unreadCount > 0 ? "Jump to latest" : null}
            {unreadCount > 0 ? (
              <span
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold text-white"
                style={{ backgroundColor: theme.accent }}
              >
                {unreadCount}
              </span>
            ) : null}
          </button>
        </div>
      )}

      <div className="shrink-0 border-t border-zinc-200 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-800">
              Disclaimer: AI-generated
              responses may be incomplete or inaccurate. Please verify information with
              the referenced sources. For clarification, contact the Compliance team (
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
          {showSuggestedPrompts ? (
            <div className="mb-3 flex gap-2">
              {suggestedPrompts.map((item) => {
                const promptText = item.prompt || ""
                return (
                  <button
                    key={item.id}
                    type="button"
                    title={promptText}
                    onClick={() => {
                      handleInputChange(promptText)
                      inputRef.current?.focus()
                    }}
                    className="min-w-0 flex-1 truncate rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-left text-[11px] leading-snug text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-white sm:text-xs"
                  >
                    {promptText}
                  </button>
                )
              })}
            </div>
          ) : null}
          <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 py-1.5 pl-4 pr-1.5 shadow-sm">
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
              placeholder="What would you like to know?"
              disabled={isSending}
              rows={1}
              maxLength={PROMPT_MAX_LENGTH}
              className="max-h-32 min-h-[40px] min-w-0 flex-1 resize-none border-0 bg-transparent py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              style={{ backgroundColor: theme.accent }}
              aria-label="Send message"
            >
              <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
          <div className="mt-1.5 flex justify-end px-1">
            <span
              className={cn(
                "text-[11px] tabular-nums",
                input.length >= PROMPT_MAX_LENGTH ? "font-medium text-rose-600" : "text-zinc-400",
              )}
            >
              {input.length}/{PROMPT_MAX_LENGTH}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
