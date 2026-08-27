import {
  Edit,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getAskAiTheme } from "./constants"

export function ConversationSidebar({
  search,
  onSearchChange,
  onNewChat,
  newChatDisabled,
  conversations,
  activeId,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onTogglePinConversation,
  pinningSessionId = null,
  variant = "default",
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  isLoading = false,
  chatsError = null,
  onRetryChats,
  isSearchActive = false,
}) {
  const theme = getAskAiTheme(variant)
  const showEmptySearch = isSearchActive && !isLoading && conversations.length === 0 && !chatsError

  return (
    <aside
      className={cn(
        "flex max-h-[38vh] w-full shrink-0 flex-col gap-3.5 self-stretch overflow-hidden rounded-2xl border px-4 py-5 shadow-[0_2px_10px_rgba(23,28,143,0.05)] backdrop-blur-sm",
        // 248px squeezed titles to 2 clamped lines with the date/actions row
        // fighting for space. Widened again to 380px to keep pace with the
        // larger row font; ChatPanel is flex-1 so it absorbs the difference.
        "lg:max-h-none lg:w-[380px] lg:max-w-[380px]",
        theme.borderClass,
      )}
      style={{ backgroundColor: theme.sidebarBg }}
    >
      <h1
        className="px-0.5 text-[23px] font-bold tracking-tight"
        style={{ color: theme.primary }}
      >
        Your Conversations
      </h1>

      <div className="relative">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search conversations..."
          className="h-[52px] rounded-full border-zinc-200 bg-white pr-12 text-[19px] text-zinc-900 shadow-none placeholder:text-zinc-400"
        />
        <Search
          className="pointer-events-none absolute right-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2"
          style={{ color: theme.accent }}
          strokeWidth={2.25}
        />
      </div>

      <button
        type="button"
        onClick={onNewChat}
        disabled={newChatDisabled}
        className={cn(
          "flex w-full shrink-0 items-center justify-center gap-2.5 rounded-xl px-4 py-4 text-[19px] font-semibold text-white shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          theme.ringClass,
        )}
        style={{ background: theme.gradient }}
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
          <Plus className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
        New chat
      </button>

      {chatsError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[17px] text-rose-700">
          <p>{chatsError}</p>
          <button
            type="button"
            onClick={onRetryChats}
            className="mt-1.5 font-semibold underline underline-offset-2 hover:opacity-80"
          >
            Retry
          </button>
        </div>
      ) : null}

      <nav
        className={cn(
          "-mr-1.5 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1.5 scrollbar-thin",
          theme.scrollbarClass,
        )}
      >
        {showEmptySearch ? (
          <p className="px-1 py-6 text-center text-[19px] text-zinc-500">No Conversations Found</p>
        ) : null}

        {conversations.map((c) => {
          const isActive = activeId === c.id
          const ItemIcon = c.isLocal ? MessageCircle : c.title?.length > 24 ? FileText : MessageCircle

          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectConversation(c.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault()
                  onSelectConversation(c.id)
                }
              }}
              className={cn(
                "group cursor-pointer rounded-xl border px-3 py-3 text-left text-sm font-medium text-zinc-900 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2",
                isActive ? "border-transparent" : "border-transparent hover:bg-zinc-50",
                theme.ringClass,
              )}
              style={
                isActive
                  ? { backgroundColor: theme.activeBg, boxShadow: `inset 0 0 0 1.5px ${theme.accent}` }
                  : undefined
              }
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: isActive ? "#ffffff" : theme.iconBg }}
                >
                  <ItemIcon className="h-[18px] w-[18px]" style={{ color: theme.accent }} strokeWidth={2} />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                  <span className="line-clamp-2 text-[19px] font-medium leading-snug">{c.title}</span>
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="truncate text-[15px] font-normal text-zinc-500">
                      {c.updatedAt || "\u00a0"}
                    </span>
                    {!c.isLocal ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onTogglePinConversation?.(c.id, !c.isPinned)
                          }}
                          disabled={pinningSessionId === c.id}
                          className="inline-flex rounded-md p-1 text-zinc-400 transition-colors hover:bg-white hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={c.isPinned ? "Unpin chat" : "Pin chat"}
                          title={c.isPinned ? "Unpin" : "Pin"}
                        >
                          <Pin
                            className={cn("h-4 w-4", c.isPinned && "fill-current")}
                            style={c.isPinned ? { color: theme.accent } : undefined}
                          />
                        </button>
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(event) => event.stopPropagation()}
                              className="inline-flex rounded-md p-1 text-zinc-400 transition-colors hover:bg-white hover:text-zinc-700"
                              aria-label="Chat actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem
                              className="cursor-pointer text-zinc-900 focus:bg-transparent focus:text-zinc-900 data-[highlighted]:bg-transparent data-[highlighted]:text-zinc-900"
                              onClick={(event) => {
                                event.stopPropagation()
                                onRenameConversation?.(c.id)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" style={{ color: theme.accent }} />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-red-600 focus:bg-transparent focus:text-red-600 data-[highlighted]:bg-transparent data-[highlighted]:text-red-600"
                              onClick={(event) => {
                                event.stopPropagation()
                                onDeleteConversation?.(c.id)
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {hasMore && !showEmptySearch ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-3 text-[19px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </nav>
    </aside>
  )
}
