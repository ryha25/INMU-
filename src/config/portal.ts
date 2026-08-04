const CURRENT_PORTAL_URL = 'https://inmu-portal-core.replit.app'

function resolvePortalUrl(): string {
  const configured = (import.meta as ImportMeta & {
    env?: Record<string, string | undefined>
  }).env?.VITE_PORTAL_URL?.trim()
  if (!configured) {
    return CURRENT_PORTAL_URL
  }
  return configured.replace(/\/$/, '')
}

export const PORTAL_URL = resolvePortalUrl()
