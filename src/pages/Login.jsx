import { FileWarning, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Login screen — Figma "Login - select" (node 50:5701).
 * Left: brand hero + feature pills. Right: SSO + anonymous report.
 */
function Login({ onLogin, isLoggingIn }) {
  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-white md:flex-row">
      {/* Hero panel */}
      <div
        className={cn(
          "relative min-h-[42vh] flex-1 overflow-hidden md:min-h-[100dvh]",
          "md:rounded-tr-[40px] md:rounded-br-[40px]",
        )}
      >
        <img
          src="/assets/login/banner.png"
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#1e3a8a]/25 via-transparent to-[#4c1d95]/30"
          aria-hidden
        />

        {/* Top branding row */}
        <div className="relative z-10 flex items-start justify-between gap-4 px-6 pt-6 sm:px-10 sm:pt-8 md:px-14 md:pt-12">
          <p className="max-w-[min(100%,22rem)] text-base font-bold uppercase leading-tight tracking-wide text-white sm:text-xl md:text-2xl">
            Compliance Connect
          </p>
          <img
            src="/assets/login/logo-white.png"
            alt="Maruti Suzuki"
            className="h-9 w-auto shrink-0 sm:h-10 md:h-12"
          />
        </div>

        {/* Feature pills */}
        <div className="relative z-10 mt-8 flex flex-wrap items-start justify-center gap-4 px-5 sm:mt-12 sm:gap-5 sm:px-8 md:mt-16 md:justify-start md:gap-6 md:px-14 lg:gap-8">
          {/* Ask Compliance */}
          <div className="relative">
            <div className="flex items-center gap-4 rounded-full bg-[#929292]/90 px-8 py-6 shadow-lg backdrop-blur-[15px] sm:gap-6 sm:px-10 sm:py-7">
              <img
                src="/assets/login/robot.svg"
                alt=""
                className="size-12 shrink-0 sm:size-14 md:size-16"
              />
              <div className="leading-[1.3] text-[#f3f3f3]">
                <p className="text-sm font-extrabold uppercase tracking-wide sm:text-lg md:text-2xl">
                  Ask Compliance
                </p>
                <p className="text-sm font-normal uppercase sm:text-lg md:text-2xl">
                  (AI Chatbot)
                </p>
              </div>
            </div>
            {/* <span className="absolute -bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#e8b931] px-3.5 py-1 text-center text-sm font-bold leading-none text-[#1e1e1e] sm:text-base md:text-lg">
              Coming Soon!
            </span> */}
          </div>

          {/* Portal */}
          <div className="mt-2 flex items-center gap-4 rounded-full bg-[#2563eb] px-8 py-6 shadow-lg backdrop-blur-[15px] sm:mt-6 sm:gap-6 sm:px-10 sm:py-7 md:mt-8">
            <img
              src="/assets/login/compliance.svg"
              alt=""
              className="size-12 shrink-0 sm:size-14 md:size-16"
            />
            <p className="max-w-[12rem] text-left text-sm font-extrabold uppercase leading-[1.35] text-[#f3f3f3] sm:max-w-[14rem] sm:text-lg md:text-2xl">
              {/* <span className="font-medium">New </span> */}
              Compliance Connect Portal
              <span className="font-medium">!</span>
            </p>
          </div>

          {/* Knowledge Hub */}
          <div className="flex items-center gap-4 rounded-full bg-[#00b6fd] px-8 py-6 shadow-lg backdrop-blur-[15px] sm:gap-6 sm:px-10 sm:py-7">
            <img
              src="/assets/login/book-open.svg"
              alt=""
              className="size-12 shrink-0 sm:size-14 md:size-16"
            />
            <div className="leading-[1.3] text-white">
              <p className="text-sm font-extrabold uppercase sm:text-lg md:text-2xl">
                Compliance
              </p>
              <p className="text-sm font-extrabold uppercase sm:text-lg md:text-2xl">
                Knowledge Hub
              </p>
            </div>
          </div>
        </div>

        <p className="absolute bottom-5 left-6 z-10 text-sm font-normal text-white sm:left-10 sm:text-base md:bottom-8 md:left-14 md:text-xl">
          Version 1.0.0
        </p>
      </div>

      {/* Login panel */}
      <aside className="flex w-full shrink-0 flex-col bg-white px-6 py-10 sm:px-10 md:w-[min(100%,501px)] md:min-h-[100dvh] md:px-[60px] md:py-12">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-[32px] font-medium tracking-[-0.8px] text-[#1e1e1e] sm:text-[40px]">
            Login
          </h1>

          <Button
            type="button"
            size="lg"
            className={cn(
              "mt-8 h-auto w-full max-w-[380px] gap-2 rounded-lg px-6 py-3",
              "bg-[#2563ebe6] text-lg font-semibold text-white hover:bg-[#2563eb]",
            )}
            onClick={() => onLogin?.()}
            disabled={isLoggingIn}
          >
            <LogIn className="size-6 shrink-0" strokeWidth={2} aria-hidden />
            {isLoggingIn ? "Signing in..." : "Login via SSO"}
          </Button>
        </div>

        {/* <Button
          type="button"
          size="lg"
          className={cn(
            "mt-10 h-auto w-full max-w-[380px] gap-2 rounded-lg px-6 py-3",
            "bg-[rgba(139,92,246,0.15)] text-lg font-semibold text-[#8b5cf6]",
            "hover:bg-[rgba(139,92,246,0.22)] hover:text-[#7c3aed]",
          )}
        >
          <FileWarning className="size-6 shrink-0" strokeWidth={2} aria-hidden />
          Report Anonymous
        </Button> */}
      </aside>
    </div>
  );
}

export default Login;
