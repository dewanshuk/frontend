import { useEffect } from 'react'
import { getMsalClient, loginRequest, cacheProfilePhotoIfNeeded } from '../../../src/lib/auth'

function RedirectHandler() {
  useEffect(() => {
    const handleRedirect = async () => {
      const client = getMsalClient()
      if (!client) {
        window.location.href = '/login'
        return
      }

      await client.initialize()

      try {
        const response = await client.handleRedirectPromise()
        if (response?.account) {
          client.setActiveAccount(response.account)
          const tokenResponse = await client.acquireTokenSilent({
            ...loginRequest,
            account: response.account,
          })
          localStorage.setItem('token', tokenResponse.accessToken)
          try {
            await cacheProfilePhotoIfNeeded(tokenResponse.accessToken, response.account)
          } catch {
            // ignore photo fetch errors
          }
          localStorage.setItem('user', JSON.stringify(response.account))
          window.location.href = '/'
        } else {
          window.location.href = '/login'
        }
      } catch (error) {
        console.error('Redirect handling failed:', error)
        window.location.href = '/login'
      }
    }

    handleRedirect()
  }, [])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Processing authentication...</p>
    </div>
  )
}

export default RedirectHandler