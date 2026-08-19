/**
 * In-memory Ask AI session cache so chat state survives route changes
 * within the same browser tab (until full reload).
 */

let sessionSnapshot = null

export function readAskAiSession() {
  return sessionSnapshot
}

export function writeAskAiSession(snapshot) {
  sessionSnapshot = snapshot
}
