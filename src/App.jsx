import React from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Chat from './pages/Chat'
import Diary from './pages/Diary'
import Tarot from './pages/Tarot'
import Import from './pages/Import'

const NAV_ITEMS = [
  { path: '/', icon: '⌂', label: 'Home' },
  { path: '/chat', icon: '✉', label: 'Chat' },
  { path: '/diary', icon: '✎', label: 'Diary' },
  { path: '/tarot', icon: '✦', label: 'Tarot' },
  { path: '/import', icon: '↓', label: 'Import' },
]

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="app">
      <nav className="sidebar">
        <div className="sidebar-avatar">
          M
          <span className="online-dot" />
        </div>
        <div className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`sidebar-item ${location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path)) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </nav>
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:id" element={<Chat />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/tarot" element={<Tarot />} />
          <Route path="/import" element={<Import />} />
        </Routes>
      </div>
    </div>
  )
}
