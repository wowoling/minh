import React, { useState, useEffect } from 'react'

function getServerUrl() {
  try { return localStorage.getItem('minh-server') || '' } catch { return '' }
}

function apiUrl(path) {
  const s = getServerUrl()
  return s ? `${s.replace(/\/$/, '')}${path}` : path
}

export default function Diary() {
  const [entries, setEntries] = useState([])
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    fetch(apiUrl('/api/diary'))
      .then(r => r.json())
      .then(setEntries)
      .catch(() => {})
  }, [])

  const parseContent = (content) => {
    const lines = content.split('\n')
    const title = lines[0]?.trim()
    const author = lines[1]?.trim()
    const body = lines.slice(3).join('\n').trim()
    return { title, author, body }
  }

  const selected = entries[selectedIdx]

  return (
    <div className="diary-page">
      <div className="page-header">
        <h1>日记</h1>
        <p className="subtitle">Minh 写的</p>
      </div>

      {entries.length > 0 && (
        <div className="diary-tabs">
          {entries.map((entry, i) => {
            const { title } = parseContent(entry.content)
            return (
              <button
                key={entry.id}
                className={`diary-tab ${selectedIdx === i ? 'active' : ''}`}
                onClick={() => setSelectedIdx(i)}
              >
                {title}
              </button>
            )
          })}
        </div>
      )}

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
        <div className="empty-state">
          <span className="empty-icon">✎</span>
          <span>还没有日记</span>
        </div>
      )}
    </div>
  )
}
