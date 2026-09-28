import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './styles/tokens.css'
import './styles/base.css'
import './styles/components.css'
import './styles/app.css'
import './styles/harness.css'

import App from './App'

const container = document.getElementById('root')
if (container === null) {
  throw new Error('Root element #root not found.')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
