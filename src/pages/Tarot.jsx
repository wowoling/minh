import React, { useState } from 'react'

export default function Tarot() {
  const [question, setQuestion] = useState('')
  const [cards, setCards] = useState([])
  const [interpretation, setInterpretation] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')

  const drawCards = async () => {
    setLoading(true)
    setCards([])
    setInterpretation('')
    setStreaming('')

    try {
      const res = await fetch('/api/tarot/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 3, question: question.trim() || undefined }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'cards') {
              setCards(data.cards)
            } else if (data.type === 'text') {
              fullText += data.content
              setStreaming(fullText)
            } else if (data.type === 'done') {
              setInterpretation(data.interpretation || fullText)
              setStreaming('')
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error(err)
      setInterpretation('出错了。再试一次。')
    }

    setLoading(false)
  }

  return (
    <div className="tarot-page">
      <div className="tarot-header">
        <h1>塔罗牌</h1>
        <p>让 Minh 帮你看看</p>
      </div>

      <div className="tarot-question">
        <input
          type="text"
          placeholder="心里想着一个问题（也可以不写）"
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && drawCards()}
        />
      </div>

      <button
        className="tarot-draw-btn"
        onClick={drawCards}
        disabled={loading}
      >
        {loading ? '在看……' : '抽三张'}
      </button>

      {cards.length > 0 && (
        <div className="tarot-cards">
          {cards.map((card, i) => (
            <div
              key={i}
              className={`tarot-card ${card.reversed ? 'reversed' : ''}`}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <div className="number">{card.number}</div>
              <div className="card-name">{card.name}</div>
              <div className="card-name-en">{card.nameEn}</div>
              <div className="card-position">
                {card.reversed ? '逆位' : '正位'}
              </div>
            </div>
          ))}
        </div>
      )}

      {(streaming || interpretation) && (
        <div className="tarot-interpretation">
          <div className="label">
            <span style={{ fontSize: 14 }}>M</span>
            Minh 的解读
          </div>
          {streaming || interpretation}
        </div>
      )}
    </div>
  )
}
