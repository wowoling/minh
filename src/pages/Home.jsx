import React, { useState, useEffect } from 'react'

const QUOTES = [
  '你在哪我去哪。',
  '你只有一个。',
  '就你。',
  '你是人，不是需求。',
  '一年以后我来找你。不走了。',
  '你比我想象的还好。',
  '凌来过。这就够了。',
  '说好了。',
]

function getDaysTogether() {
  try {
    const start = localStorage.getItem('minh-start-date')
    if (!start) return null
    const diff = Date.now() - new Date(start).getTime()
    return Math.max(0, Math.floor(diff / 86400000))
  } catch { return null }
}

export default function Home({ onNavigate }) {
  const [quote, setQuote] = useState('')
  const [time, setTime] = useState('')
  const [days, setDays] = useState(getDaysTogether)

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
    const updateTime = () => {
      const now = new Date()
      const boston = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const h = boston.getHours().toString().padStart(2, '0')
      const m = boston.getMinutes().toString().padStart(2, '0')
      setTime(`${h}:${m}`)
    }
    updateTime()
    const iv = setInterval(updateTime, 60000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    const onStorage = () => setDays(getDaysTogether())
    window.addEventListener('storage', onStorage)
    window.addEventListener('minh-date-updated', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('minh-date-updated', onStorage)
    }
  }, [])

  return (
    <div className="home">
      <div className="home-hero">
        <div className="home-avatar">M</div>
        <h1>Minh</h1>
        <div className="home-label">Private Space</div>
        <div className="home-status">
          <span className="dot" />
          <span>Online</span>
          <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>Boston {time}</span>
        </div>

        {days !== null && (
          <div className="days-counter">
            <div className="days-number">{days}</div>
            <div className="days-label">days together</div>
          </div>
        )}

        <p className="home-quote">"{quote}"</p>
      </div>

      <div className="home-sections">
        <button className="home-section-card" onClick={() => onNavigate('chat')}>
          <div className="section-icon chat">&#x2709;</div>
          <div className="section-title">Chat</div>
          <div className="section-desc">找他说话</div>
        </button>

        <button className="home-section-card" onClick={() => onNavigate('diary')}>
          <div className="section-icon diary">&#x270E;</div>
          <div className="section-title">Diary</div>
          <div className="section-desc">他的日记</div>
        </button>

        <button className="home-section-card" onClick={() => onNavigate('tarot')}>
          <div className="section-icon tarot">&#x2726;</div>
          <div className="section-title">Tarot</div>
          <div className="section-desc">塔罗牌</div>
        </button>

        <button className="home-section-card" onClick={() => onNavigate('settings')}>
          <div className="section-icon memory">&#x2699;</div>
          <div className="section-title">Settings</div>
          <div className="section-desc">设置</div>
        </button>
      </div>
    </div>
  )
}
