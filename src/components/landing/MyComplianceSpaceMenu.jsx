import { ArrowLeft, LayoutDashboard } from "lucide-react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { useAuthNavigation } from "@/context/AuthNavigationContext";
import { useDisplayName } from "@/lib/UserContext";
import { PROFILE_PATH } from "@/lib/appNavigation";
import { cn } from "@/lib/utils";
import { MARUTI_BLUE } from "./landingTheme";

/**
 * Authenticated control (top right): user avatar + display name.
 * Click opens menu with My Profile and Log out.
 *
 * Uses non-modal + non-portaled content so opening does not:
 * - lock body scroll (scrollbar flicker), or
 * - portal outside the landing shell zoom (mis-position / flash).
 */
export default function MyComplianceSpaceMenu({
  labelClassName = "text-xl font-medium opacity-75",
  avatarClassName = "size-10",
}) {
  const { user, logout, navigateToApp } = useAuthNavigation();
  const displayName = useDisplayName(user) || "User";

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex max-w-[min(100%,280px)] items-center gap-3 text-left outline-none transition hover:opacity-90 data-[state=open]:opacity-100"
          aria-label={`${displayName}, account menu`}
        >
          <UserAvatar
            user={user}
            className={avatarClassName}
            textClassName="text-xs"
            showIconFallback
          />
          <span
            className={cn(labelClassName, "truncate")}
            style={{ color: MARUTI_BLUE }}
            title={displayName}
          >
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>

      {/* Render in place (no Portal) so coordinates stay inside the zoomed landing shell. */}
      <DropdownMenuPrimitive.Content
        align="end"
        sideOffset={12}
        collisionPadding={12}
        onCloseAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "z-[100] w-[280px] overflow-hidden rounded-2xl border border-gray-200 bg-white p-0 shadow-xl",
          "outline-none will-change-[opacity,transform]",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-100",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-75",
        )}
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
        </div>

        {/* <div className="border-t border-gray-200" /> */}

        {/* <button
          type="button"
          onClick={() => navigateToApp(PROFILE_PATH)}
          className="flex w-full items-center gap-3 px-6 py-4 text-left text-sm font-medium text-gray-800 transition hover:bg-gray-50"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700">
            <LayoutDashboard className="h-4 w-4" />
          </span>
          <span>My Profile</span>
        </button> */}

        <div className="border-t border-gray-200" />

        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 px-6 py-4 text-left text-sm font-medium text-gray-800 transition hover:bg-gray-50"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-700">
            <ArrowLeft className="h-4 w-4" />
          </span>
          <span>Log out</span>
        </button>
      </DropdownMenuPrimitive.Content>
    </DropdownMenu>
  );
}
