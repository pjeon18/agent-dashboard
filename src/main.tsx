import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import type { Data } from './lib/types'
import './styles.css'

const root = createRoot(document.getElementById('root')!)

fetch(`${import.meta.env.BASE_URL}radar.json`)
  .then(r => r.json() as Promise<Data>)
  .then(data => root.render(<StrictMode><App data={data} /></StrictMode>))
