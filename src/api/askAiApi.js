import { genericApi } from "./axiosInstance"
import { getAccessToken, isAzureAdEnabled } from "../lib/auth"

const getAuthHeaders = async () => {
  let token = null

  if (isAzureAdEnabled()) {
    token = await getAccessToken()
  }

  if (!token && typeof window !== "undefined") {
    token = window.localStorage?.getItem?.("token") ?? null
  }

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const getChatBaseUrl = () => genericApi.defaults.baseURL || import.meta.env.VITE_GENERIC_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

export const askAiChat = async ({ sessionId, query }) => {
  const response = await genericApi.post("/api/ask-ai/chat", {
    sessionId,
    query,
  })

  return response.data
}

// export const streamAskAiChat = async ({ sessionId, query, onChunk }) => {
//   const response = await fetch(`${getChatBaseUrl()}/api/ask-ai/chat`, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//       ...(await getAuthHeaders()),
//     },
//     body: JSON.stringify({ sessionId, query }),
//   })

//   if (!response.ok) {
//     const errorText = await response.text()
//     throw new Error(errorText || response.statusText)
//   }

//   if (!response.body) {
//     return
//   }

//   const reader = response.body.getReader()
//   const decoder = new TextDecoder()

//   let done = false
//   while (!done) {
//     const { value, done: readerDone } = await reader.read()
//     if (value) {
//       const chunk = decoder.decode(value, { stream: !readerDone })
//       onChunk(chunk)
//     }
//     done = readerDone
//   }
// }
export const streamAskAiChat = async ({
  sessionId,
  query,
  onChunk,
  onSources,
}) => {
  const response = await fetch(`${getChatBaseUrl()}/api/ask-ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: JSON.stringify({ sessionId, query }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(errorText || response.statusText)
  }

  if (!response.body) {
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })

    const sourceMarker = "\n\n[SOURCES_JSON]\n"

    if (buffer.includes(sourceMarker)) {
      const [answerText, sourceJson] = buffer.split(sourceMarker)

      if (answerText) {
        onChunk(answerText)
      }

      try {
        const sources = JSON.parse(sourceJson.trim())

        if (onSources) {
          onSources(sources)
        }
      } catch (err) {
        console.error("Failed to parse sources", err)
      }

      buffer = ""
    } else {
      onChunk(buffer)
      buffer = ""
    }
  }
}

export const saveAskAiChat = async ({ sessionId, query, response: responseText, sources }) => {
  const response = await genericApi.post("/api/ask-ai/chat/save", {
    sessionId,
    query,
    response: responseText,
    sources,
  })

  return response.data
}

export const getAskAiMessages = async ({ sessionId }) => {
  const response = await genericApi.post(
    "/api/ask-ai/messages",
    {},
    {
      params: { sessionId },
    },
  )

  return response.data
}

export const renameAskAiChat = async ({ sessionId, newTitle }) => {
  const response = await genericApi.patch("/api/ask-ai/chat/rename", {
    sessionId,
    newTitle,
  })

  return response.data
}

export const deleteAskAiChat = async ({ sessionId }) => {
  const response = await genericApi.delete("/api/ask-ai/chat", {
    params: { sessionId },
  })

  return response.data
}

export const pinAskAiChat = async ({ sessionId, isPinned }) => {
  const response = await genericApi.patch("/api/ask-ai/chat/pin", {
    sessionId,
    isPinned,
  })

  return response.data
}

export const getAskAiChats = async ({ limit = 5, offset = 0, search = "" } = {}) => {
  const response = await genericApi.get("/api/ask-ai/chats", {
    params: {
      limit,
      offset,
      search,
    },
  })

  return response.data
}

export const getAskAiPrompts = async () => {
  const response = await genericApi.get("/api/ask-ai/prompts")
  return response.data
}

export const openCitation = async (blobPath) => {
  const response = await fetch(
    `${getChatBaseUrl()}/api/ask-ai/citation?blob_path=${encodeURIComponent(blobPath)}`,
    {
      method: "GET",
      headers: {
        ...(await getAuthHeaders()),
      },
    },
  )

  if (!response.ok) {
    let message = `Citation failed: ${response.status}`

    try {
      const data = await response.json()
      message = data.error || message
    } catch {
      // ignore
    }

    throw new Error(message)
  }

  const data = await response.json()

  if (!data.redirect_url) {
    throw new Error("Redirect URL not found")
  }

  window.open(data.redirect_url, "_blank", "noopener,noreferrer")
}