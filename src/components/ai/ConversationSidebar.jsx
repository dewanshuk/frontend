import { Edit, MessageSquarePlus, MoreHorizontal, Pin, Search, Trash2 } from "lucide-react"
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
        "flex max-h-[38vh] w-full max-w-[240px] shrink-0 flex-col gap-3 self-start border-b px-4 py-4 lg:max-h-none lg:w-[240px] lg:max-w-[240px] lg:self-stretch lg:border-b-0 lg:border-r lg:px-4 lg:py-6",
        theme.borderClass,
      )}
      style={{ backgroundColor: theme.sidebarBg }}
    >
      <h1 className="text-lg font-bold tracking-tight text-zinc-900">Your Conversations</h1>
      <div className="relative">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search"
          className="h-11 rounded-full border-zinc-200 bg-white pr-11 text-zinc-900 placeholder:text-zinc-400"
        />
        <Search
          className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2"
          style={{ color: theme.accent }}
          strokeWidth={2.25}
        />
      </div>

      <button
        type="button"
        onClick={onNewChat}
        disabled={newChatDisabled}
        className={cn(
          "flex w-full shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
          theme.ringClass,
        )}
        style={{ backgroundColor: theme.accent }}
      >
        <MessageSquarePlus className="h-4 w-4 shrink-0" strokeWidth={2.25} />
        New chat
      </button>

      {chatsError ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
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
          "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto scrollbar-thin",
          theme.scrollbarClass,
        )}
      >
        {showEmptySearch ? (
          <p className="px-1 py-6 text-center text-sm text-zinc-500">No Conversations Found</p>
        ) : null}

        {conversations.map((c) => (
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
              "cursor-pointer rounded-lg py-3 pl-4 pr-2 text-left text-sm font-medium text-zinc-900 transition-colors",
              "hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2",
              theme.ringClass,
            )}
            style={{
              backgroundColor: theme.cardBg,
              boxShadow: activeId === c.id ? `inset 0 0 0 2px ${theme.primary}` : undefined,
            }}
          >
            <div className="flex flex-col gap-1 text-left">
              <span className="line-clamp-2 text-sm font-medium leading-snug">{c.title}</span>
              <div className="flex items-center justify-between gap-0">
                {c.updatedAt ? (
                  <span className="text-xs font-normal text-zinc-500">{c.updatedAt}</span>
                ) : (
                  <span className="text-xs font-normal text-zinc-500">&nbsp;</span>
                )}
                {!c.isLocal ? (
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onTogglePinConversation?.(c.id, !c.isPinned)
                      }}
                      disabled={pinningSessionId === c.id}
                      className="inline-flex rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                          className="inline-flex rounded-md p-1 text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-800"
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
        ))}

        {hasMore && !showEmptySearch ? (
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </nav>
    </aside>
  )
}
