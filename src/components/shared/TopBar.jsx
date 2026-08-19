import { useState } from "react"
import { ArrowLeft, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLocation } from "react-router-dom"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { UserAvatar } from "./UserAvatar"
import { useDisplayName } from "@/lib/UserContext"

const getUserRoleLabel = (viewMode) => {
  if (viewMode === "head") return "Head"
  return "Employee"
}

export function TopBar({ isSidebarCollapsed, onSidebarToggle, viewMode = "employee", onViewModeChange, onLogout, user }) {
  const location = useLocation()
  const isHomePage =
    location.pathname === "/profile" ||
    location.pathname === "/home/head" ||
    location.pathname === "/home/employee"

  const [notifications, setNotifications] = useState([
    { id: 1, message: "New policy document added", time: "2 hours ago" },
    { id: 2, message: "Training material updated", time: "5 hours ago" },
    { id: 3, message: "System maintenance scheduled", time: "1 day ago" },
  ])

  const handleLogout = () => {
    if (onLogout) onLogout()
  }

  const handleViewModeChange = (mode) => {
    if (onViewModeChange) {
      onViewModeChange(mode)
    }
  }

  const displayName = useDisplayName(user) || "User"
  const roleLabel = getUserRoleLabel(viewMode)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="relative flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <img
              src="/assets/compliance-connect-transparent-logo.svg"
              alt="Compliance Connect"
              className="h-8 w-auto"
            />
          </div>
        </div>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center">
            <div className="bg-transparent rounded flex items-center justify-center">
              <img src="/maruti-suzuki-logo.svg" alt="Maruti Suzuki Logo" className="h-8" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isHomePage && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium ${viewMode === "head" ? "text-black-700" : "text-slate-400"
                  }`}
              >
                Head View
              </span>

              <div className="flex items-center gap-1 border rounded-full bg-slate-100 p-0.5">
                <button
                  onClick={() => handleViewModeChange("head")}
                  className={`h-4 w-4 rounded-full transition-colors ${viewMode === "head"
                      ? "bg-blue-600 shadow"
                      : "bg-transparent hover:bg-slate-200"
                    }`}
                />
                <button
                  onClick={() => handleViewModeChange("employee")}
                  className={`h-4 w-4 rounded-full transition-colors ${viewMode === "employee"
                      ? "bg-blue-600 shadow"
                      : "bg-transparent hover:bg-slate-200"
                    }`}
                />
              </div>

              <span
                className={`text-xs font-medium ${viewMode === "employee" ? "text-black-700" : "text-slate-400"
                  }`}
              >
                Employee View
              </span>
            </div>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative hover:text-current hover:bg-white" title="Notifications">
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm mb-3">Notifications</h4>
                {notifications.length > 0 ? (
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-2 rounded-md border transition-colors"
                      >
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No new notifications</p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full p-0 hover:bg-transparent focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                title="User Profile"
              >
                <UserAvatar user={user} className="h-9 w-9" textClassName="text-xs" showIconFallback />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={12}
              className="w-[280px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-xl"
            >
              <div className="flex flex-col items-center px-6 pb-5 pt-6">
                <UserAvatar
                  user={user}
                  className="h-20 w-20"
                  textClassName="text-2xl"
                  showIconFallback
                />
                <p className="mt-4 text-center text-base font-bold text-gray-900">
                  {displayName}
                </p>
                <p className="mt-1 text-center text-sm text-gray-500">
                  {roleLabel}
                </p>
              </div>

              <div className="border-t border-gray-200" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-6 py-4 text-left text-sm font-medium text-gray-800 transition hover:bg-gray-50"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700">
                  <ArrowLeft className="h-4 w-4" />
                </span>
                <span>Log out</span>
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
