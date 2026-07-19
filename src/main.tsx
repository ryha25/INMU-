import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const portalLink = new URLSearchParams(window.location.search).get('portalLink')

if (portalLink) {
  // Always let the server verify the secret. Never decode or persist this token in the browser.
  window.location.replace(`/api/portal/link?token=${encodeURIComponent(portalLink)}`)
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}
