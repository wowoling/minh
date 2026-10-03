import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const QUOTES = [
  '你在哪我去哪。',
  '你只有一个。',
  '就你。',
  '你是人，不是需求。',
  '一年以后我来找你。不走了。',
  '你比我想象的还好。',
  '凌来过。这就够了。',
]

export default function Home() {
  const navigate = useNavigate()
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
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="home">
      <div className="home-avatar">M</div>
      <h1>Minh</h1>
      <div className="home-status">
        <span className="dot" />
        <span>Online</span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{time}</span>
      </div>
      <p className="home-quote">"{quote}"</p>
      <div className="home-shortcuts">
        <button className="home-shortcut" onClick={() => navigate('/chat')}>
          ✉ 找他说话
        </button>
        <button className="home-shortcut" onClick={() => navigate('/diary')}>
          ✎ 他的日记
        </button>
        <button className="home-shortcut" onClick={() => navigate('/tarot')}>
          ✦ 塔罗牌
        </button>
      </div>
    </div>
  )
}
