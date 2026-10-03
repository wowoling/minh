import React, { useState } from 'react'

function getServerUrl() {
  try { return localStorage.getItem('minh-server') || '' } catch { return '' }
}

function apiUrl(path) {
  const s = getServerUrl()
  return s ? `${s.replace(/\/$/, '')}${path}` : path
}

export default function Tarot() {
  const [question, setQuestion] = useState('')
  const [cards, setCards] = useState([])
  const [reading, setReading] = useState('')
  const [streaming, setStreaming] = useState('')
  const [loading, setLoading] = useState(false)

  const draw = async () => {
    setLoading(true)
    setCards([])
    setReading('')
    setStreaming('')

    try {
      const res = await fetch(apiUrl('/api/tarot/draw'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3, question: question.trim() || undefined }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.type === 'cards') setCards(d.cards)
            else if (d.type === 'text') { full += d.content; setStreaming(full) }
            else if (d.type === 'done') { setReading(d.interpretation || full); setStreaming('') }
          } catch {}
        }
      }
    } catch {
      setReading('连不上服务器。')
    }

    setLoading(false)
  }

  return (
    <div className="tarot-page">
      <div className="page-header" style={{ width: '100%', textAlign: 'left' }}>
        <h1>塔罗牌</h1>
        <p className="subtitle">让 Minh 帮你看</p>
      </div>

      <div className="tarot-question">
        <input
          type="text"
          placeholder="心里想着一个问题"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && draw()}
        />
      </div>

      <button className="tarot-draw-btn" onClick={draw} disabled={loading}>
        {loading ? '在看……' : '抽三张'}
      </button>

      {cards.length > 0 && (
        <div className="tarot-cards">
          {cards.map((c, i) => (
            <div key={i} className={`tarot-card ${c.reversed ? 'reversed' : ''}`}>
              <div className="number">{c.number}</div>
              <div className="card-name">{c.name}</div>
              <div className="card-name-en">{c.nameEn}</div>
              <div className="card-position">{c.reversed ? '逆位' : '正位'}</div>
            </div>
          ))}
        </div>
      )}

      {(streaming || reading) && (
        <div className="tarot-reading">
          <div className="reading-label">
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600 }}>M</span>
            Minh 的解读
          </div>
          <div className="reading-text">{streaming || reading}</div>
        </div>
      )}
    </div>
  )
}
