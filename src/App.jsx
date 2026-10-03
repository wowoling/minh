import React, { useState } from 'react'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Diary from './pages/Diary'
import Tarot from './pages/Tarot'
import Settings from './pages/Settings'

const TABS = [
  { id: 'home', icon: '⌂', label: '首页' },
  { id: 'chat', icon: '✉', label: '聊天' },
  { id: 'diary', icon: '✎', label: '日记' },
  { id: 'tarot', icon: '✦', label: '塔罗' },
  { id: 'settings', icon: '⚙', label: '设置' },
]

export default function App() {
  const [tab, setTab] = useState('home')

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
