import React, { useState, useEffect } from 'react'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Diary from './pages/Diary'
import Tarot from './pages/Tarot'
import Settings from './pages/Settings'

const TABS = [
  { id: 'home', icon: '⌂', label: '首页' },
  { id: 'chat', icon: '✉', label: '对话' },
  { id: 'diary', icon: '✎', label: '日记' },
  { id: 'tarot', icon: '✦', label: '塔罗' },
  { id: 'settings', icon: '⚙', label: '设置' },
]

function getTheme() {
  try { return localStorage.getItem('minh-theme') || 'light' } catch { return 'light' }
}

export default function App() {
  const [tab, setTab] = useState('home')

  useEffect(() => {
    const apply = () => {
      const t = getTheme()
      document.documentElement.setAttribute('data-theme', t)
    }
    apply()
    window.addEventListener('minh-theme-changed', apply)
    return () => window.removeEventListener('minh-theme-changed', apply)
  }, [])

  const renderPage = () => {
    switch (tab) {
      case 'home': return <Home onNavigate={setTab} />
      case 'chat': return <Chat />
      case 'diary': return <Diary />
      case 'tarot': return <Tarot />
      case 'settings': return <Settings />
      default: return <Home onNavigate={setTab} />
    }
  }

  return (
    <div className="app">
      <div className="page">
        {renderPage()}
      </div>
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-item ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
