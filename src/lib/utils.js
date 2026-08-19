import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const DOC_TYPE_LABEL_MAP = {
  "EWS": "Early Warnings",
  "Flyer": "Flyers",
  "Guidance Note": "Guidance Notes",
  "Law Regulation": "Law & Regulation",
  "Law/Regulation": "Law & Regulation",
  "Training Material": "Training Resources",
  "Latest News & Announcements": "Announcements",
  "Latest News and Announcements": "Announcements",
}

export function normaliseDocTypeLabel(label) {
  if (!label) return label
  return DOC_TYPE_LABEL_MAP[label] ?? label
}

export function markdownToDisplayHtml(md) {
  if (!md) return ""

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  }

  function processInline(text) {
    let result = ""
    let remaining = text
    while (remaining.length > 0) {
      const boldIdx = remaining.indexOf("**")
      const italicIdx = remaining.indexOf("_")
      const hasBold = boldIdx !== -1 && remaining.indexOf("**", boldIdx + 2) !== -1
      const hasItalic = italicIdx !== -1 && remaining.indexOf("_", italicIdx + 1) !== -1

      if (!hasBold && !hasItalic) {
        result += escapeHtml(remaining).replace(/\n/g, "<br/>")
        break
      }

      const nextBold = hasBold ? boldIdx : Infinity
      const nextItalic = hasItalic ? italicIdx : Infinity

      if (nextBold <= nextItalic) {
        result += escapeHtml(remaining.slice(0, nextBold)).replace(/\n/g, "<br/>")
        remaining = remaining.slice(nextBold + 2)
        const closeIdx = remaining.indexOf("**")
        if (closeIdx === -1) { result += "**" + escapeHtml(remaining).replace(/\n/g, "<br/>"); break }
        result += `<strong>${processInline(remaining.slice(0, closeIdx))}</strong>`
        remaining = remaining.slice(closeIdx + 2)
      } else {
        result += escapeHtml(remaining.slice(0, nextItalic)).replace(/\n/g, "<br/>")
        remaining = remaining.slice(nextItalic + 1)
        const closeIdx = remaining.indexOf("_")
        if (closeIdx === -1) { result += "_" + escapeHtml(remaining).replace(/\n/g, "<br/>"); break }
        result += `<em>${processInline(remaining.slice(0, closeIdx))}</em>`
        remaining = remaining.slice(closeIdx + 1)
      }
    }
    return result
  }

  return processInline(md)
}

