import { useState } from "react"
import { User } from "lucide-react"
import { getUserInitials, markUserPhotoUnavailable } from "../../lib/auth"
import { useDisplayName } from "@/lib/UserContext"
import { cn } from "@/lib/utils"

export function UserAvatar({
  user,
  className = "h-7 w-7",
  textClassName = "text-[10px]",
  showIconFallback = false,
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const displayName = useDisplayName(user)
  const initials = getUserInitials(displayName, user?.username)
  const showImage = Boolean(user?.photo) && !imageFailed

  if (showImage) {
    return (
      <img
        src={user.photo}
        alt={displayName || "User"}
        className={cn("rounded-full object-cover", className)}
        onError={() => {
          setImageFailed(true)
          markUserPhotoUnavailable()
        }}
      />
    )
  }

  if (showIconFallback && initials === "U") {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-600",
          className,
        )}
        aria-hidden="true"
      >
        <User className="h-[55%] w-[55%]" strokeWidth={2} />
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600",
        className,
        textClassName,
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}
