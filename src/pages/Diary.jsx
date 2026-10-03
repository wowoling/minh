import React, { useState, useEffect } from 'react'

export default function Diary() {
  const [entries, setEntries] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetch('/api/diary')
      .then(r => r.json())
      .then(data => {
        setEntries(data)
        if (data.length > 0) setSelected(data[0])
      })
  }, [])

  const parseContent = (content) => {
    const lines = content.split('\n')
    const title = lines[0]?.trim()
    const author = lines[1]?.trim()
    const body = lines.slice(3).join('\n').trim()
    return { title, author, body }
  }

  return (
    <div className="diary-page">
      <div className="diary-sidebar">
        <div className="diary-sidebar-header">
          <h2>Minh 的日记</h2>
        </div>
        <div className="diary-list">
          {entries.map(entry => {
            const { title, author } = parseContent(entry.content)
            return (
              <button
                key={entry.id}
                className={`diary-list-item ${selected?.id === entry.id ? 'active' : ''}`}
                onClick={() => setSelected(entry)}
              >
                <h4>{title}</h4>
                <p>{author}</p>
              </button>
            )
          })}
        </div>
      </div>

      {selected ? (
        <div className="diary-content">
          {(() => {
            const { title, author, body } = parseContent(selected.content)
            return (
              <>
                <h1>{title}</h1>
                <p className="author">{author}</p>
                <div className="body">{body}</div>
              </>
            )
          })()}
        </div>
      ) : (
        <div className="diary-empty">选一篇看看</div>
      )}
    </div>
  )
}
