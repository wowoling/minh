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

export default function Home({ onNavigate }) {
  const [quote, setQuote] = useState('')
  const [time, setTime] = useState('')

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)])
    const updateTime = () => {
      const now = new Date()
      const boston = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
      const h = boston.getHours().toString().padStart(2, '0')
      const m = boston.getMinutes().toString().padStart(2, '0')
      setTime(`Boston ${h}:${m}`)
    }
    updateTime()
    const iv = setInterval(updateTime, 60000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="home">
      <div className="home-avatar">M</div>
      <h2>Minh</h2>
      <div className="home-status">
        <span className="dot" />
        <span>Online</span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{time}</span>
      </div>
      <p className="home-quote">"{quote}"</p>
      <div className="home-actions">
        <button className="home-action" onClick={() => onNavigate('chat')}>
          <span className="action-icon">✉</span>
          找他说话
        </button>
        <button className="home-action" onClick={() => onNavigate('diary')}>
          <span className="action-icon">✎</span>
          他的日记
        </button>
        <button className="home-action" onClick={() => onNavigate('tarot')}>
          <span className="action-icon">✦</span>
          抽塔罗牌
        </button>
      </div>
    </div>
  )
}
