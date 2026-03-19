import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import '@shared/styles/tokens.css'
import '@shared/styles/primitives.css'
import './style.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('app')!).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(BrowserRouter, null, React.createElement(App)),
  ),
)
