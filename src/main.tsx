import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import type { Data } from './lib/types'
import type { CCData } from './agents/claudeCode'
import type { CapData } from './agents/capability'
import './styles.css'

const root = createRoot(document.getElementById('root')!)
const get = <T,>(f: string) => fetch(`${import.meta.env.BASE_URL}${f}`).then(r => r.json() as Promise<T>)

Promise.all([get<Data>('radar.json'), get<CCData>('claude-code.json'), get<CapData>('capability.json')])
  .then(([radar, cc, cap]) => root.render(<StrictMode><App radar={radar} cc={cc} cap={cap} /></StrictMode>))
