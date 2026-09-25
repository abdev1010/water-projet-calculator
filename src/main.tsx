import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/tokens.css'
import './styles/calc.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* HashRouter, not BrowserRouter: it survives a page refresh on static
        hosting under a repo subpath without any server rewrite rules. */}
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
)
