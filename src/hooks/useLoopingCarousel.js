import { useCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * Infinite (looping) horizontal carousel track.
 * Layout: [clone of last] + real slides + [clone of first]
 * Track indices: 0 = clone last, 1..total = real, total+1 = clone first
 * When the track lands on a clone, it snaps (no animation) to the real twin
 * so last→first / first→last feels like a continuous slide.
 */
export function useLoopingCarousel({ total = 0, slideMs = 650 } = {}) {
  const canLoop = total > 1
  const [trackIndex, setTrackIndex] = useState(canLoop ? 1 : 0)
  const [enableTransition, setEnableTransition] = useState(true)
  const [resumeVersion, setResumeVersion] = useState(0)
  const trackIndexRef = useRef(trackIndex)
  const pendingJumpRef = useRef(null)
  const transitionFallbackRef = useRef(null)

  useEffect(() => {
    trackIndexRef.current = trackIndex
  }, [trackIndex])

  useEffect(() => {
    setEnableTransition(false)
    setTrackIndex(canLoop ? 1 : 0)
    trackIndexRef.current = canLoop ? 1 : 0
    pendingJumpRef.current = null
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEnableTransition(true))
    })
    return () => cancelAnimationFrame(id)
  }, [total, canLoop])

  const logicalIndex = useMemo(() => {
    if (total <= 0) return 0
    if (!canLoop) return 0
    if (trackIndex === 0) return total - 1
    if (trackIndex === total + 1) return 0
    return Math.min(Math.max(trackIndex - 1, 0), total - 1)
  }, [canLoop, total, trackIndex])

  const snapWithoutTransition = useCallback((nextIndex) => {
    if (transitionFallbackRef.current) {
      clearTimeout(transitionFallbackRef.current)
      transitionFallbackRef.current = null
    }
    pendingJumpRef.current = nextIndex
    setEnableTransition(false)
    setTrackIndex(nextIndex)
    trackIndexRef.current = nextIndex
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (pendingJumpRef.current === nextIndex) {
          pendingJumpRef.current = null
          setEnableTransition(true)
        }
      })
    })
  }, [])

  // Browsers can omit transitionend while a tab is backgrounded/throttled.
  // Always recover clone positions after the expected animation duration.
  useEffect(() => {
    if (!canLoop) return undefined
    if (trackIndex !== 0 && trackIndex !== total + 1) return undefined

    transitionFallbackRef.current = setTimeout(() => {
      const current = trackIndexRef.current
      if (current === total + 1) {
        snapWithoutTransition(1)
      } else if (current === 0) {
        snapWithoutTransition(total)
      }
    }, slideMs + 120)

    return () => {
      if (transitionFallbackRef.current) {
        clearTimeout(transitionFallbackRef.current)
        transitionFallbackRef.current = null
      }
    }
  }, [canLoop, slideMs, snapWithoutTransition, total, trackIndex])

  // Normalize immediately when the page becomes active again and let
  // autoplay consumers restart their timers.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden || !canLoop) return
      const current = trackIndexRef.current
      if (current <= 0) {
        snapWithoutTransition(total)
      } else if (current >= total + 1) {
        snapWithoutTransition(1)
      }
      setResumeVersion((version) => version + 1)
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleVisibilityChange)
    }
  }, [canLoop, snapWithoutTransition, total])

  const goToLogical = useCallback(
    (logical) => {
      if (total <= 0) return
      if (!canLoop) {
        setTrackIndex(0)
        return
      }
      const target = ((logical % total) + total) % total
      setEnableTransition(true)
      setTrackIndex(target + 1)
    },
    [canLoop, total],
  )

  const next = useCallback(() => {
    if (total <= 0) return
    if (!canLoop) return
    const current = trackIndexRef.current
    if (current >= total + 1) {
      snapWithoutTransition(1)
      return
    }
    setEnableTransition(true)
    setTrackIndex((i) => i + 1)
  }, [canLoop, snapWithoutTransition, total])

  const prev = useCallback(() => {
    if (total <= 0) return
    if (!canLoop) return
    const current = trackIndexRef.current
    if (current <= 0) {
      snapWithoutTransition(total)
      return
    }
    setEnableTransition(true)
    setTrackIndex((i) => i - 1)
  }, [canLoop, snapWithoutTransition, total])

  const onTransitionEnd = useCallback(
    (event) => {
      // Only handle the track transform; ignore bubbled child transitions.
      if (event?.target !== event?.currentTarget) return
      if (event?.propertyName && event.propertyName !== "transform") return
      if (!canLoop) return
      const current = trackIndexRef.current
      if (current === total + 1) {
        snapWithoutTransition(1)
      } else if (current === 0) {
        snapWithoutTransition(total)
      }
    },
    [canLoop, snapWithoutTransition, total],
  )

  /** Build track slides: clones for seamless wrap when total > 1 */
  const buildTrackItems = useCallback(
    (items = []) => {
      if (!Array.isArray(items) || items.length === 0) return []
      if (items.length === 1) return items
      return [items[items.length - 1], ...items, items[0]]
    },
    [],
  )

  return {
    trackIndex,
    logicalIndex,
    enableTransition,
    resumeVersion,
    canLoop,
    slideMs,
    next,
    prev,
    goToLogical,
    onTransitionEnd,
    buildTrackItems,
  }
}

export const LOOPING_CAROUSEL_EASE = "cubic-bezier(0.22, 1, 0.36, 1)"
