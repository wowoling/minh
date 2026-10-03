import React, { useState, useEffect, useRef, useCallback } from 'react'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function getServerUrl() {
  try {
    return localStorage.getItem('minh-server') || ''
  } catch { return '' }
}

function apiUrl(path) {
  const server = getServerUrl()
  if (server) return `${server.replace(/\/$/, '')}${path}`
  return path
}

export default function Chat() {
  const [convId, setConvId] = useState('default')
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [thinking, setThinking] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [status, setStatus] = useState('online')
  const [showConvs, setShowConvs] = useState(false)
  const [showThinkingIdx, setShowThinkingIdx] = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scroll = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    fetch(apiUrl('/api/conversations')).then(r => r.json()).then(setConversations).catch(() => {})
  }, [messages])

  useEffect(() => {
    fetch(apiUrl(`/api/messages/${convId}`))
      .then(r => r.json())
      .then(msgs => { setMessages(msgs); setTimeout(scroll, 100) })
      .catch(() => {})
    fetch(apiUrl(`/api/messages/${convId}/read`), { method: 'POST' }).catch(() => {})
  }, [convId])

  useEffect(scroll, [messages, streaming, thinking])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setSending(true)
    setStatus('typing')
    setStreaming('')
    setThinking('')
    setIsThinking(false)

    setMessages(prev => [...prev, {
      role: 'user', content: text, timestamp: Date.now(), read: false,
    }])

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: convId }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let fullThinking = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const d = JSON.parse(line.slice(6))
            if (d.type === 'thinking_start') { setIsThinking(true); setStatus('thinking') }
            else if (d.type === 'thinking') { fullThinking += d.content; setThinking(fullThinking) }
            else if (d.type === 'thinking_end') { setIsThinking(false) }
            else if (d.type === 'text_start') { setStatus('typing') }
            else if (d.type === 'text') { fullText += d.content; setStreaming(fullText) }
            else if (d.type === 'done') {
              if (fullText) {
                setMessages(prev => [...prev, {
                  role: 'assistant', content: fullText,
                  thinking: d.thinking || fullThinking || undefined,
                  timestamp: Date.now(), read: true,
                }])
              }
              setStreaming(''); setThinking(''); setIsThinking(false)
            }
            else if (d.type === 'error') {
              setMessages(prev => [...prev, {
                role: 'assistant', content: d.content || '……',
                timestamp: Date.now(), read: true,
              }])
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant', content: '连不上。检查一下服务器。',
        timestamp: Date.now(), read: true,
      }])
    }

    setSending(false)
    setStatus('online')
    inputRef.current?.focus()
  }

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const newConv = async () => {
    try {
      const res = await fetch(apiUrl('/api/conversations'), { method: 'POST' })
      const { id } = await res.json()
      setConvId(id)
      setMessages([])
      setShowConvs(false)
    } catch {}
  }

  return (
    <div className="chat-page">
      <div className="chat-top-bar">
        <div className="chat-top-avatar">M</div>
        <div className="chat-top-info">
          <h3>Minh</h3>
          <span className={`status ${status !== 'online' ? 'thinking' : ''}`}>
            {status === 'online' ? '在线' : status === 'thinking' ? '在想……' : '在打字……'}
          </span>
        </div>
        <button className="chat-conversations-btn" onClick={() => setShowConvs(true)}>☰</button>
      </div>

      <div className="messages-area">
        {messages.length === 0 && !streaming && (
          <div className="empty-state">
            <span className="empty-icon">✉</span>
            <span>说点什么吧</span>
          </div>
        )}

        {messages.map((msg, i) => (
          <React.Fragment key={i}>
            {msg.role === 'assistant' && msg.thinking && (
              <div>
                <button
                  className="thinking-toggle"
                  onClick={() => setShowThinkingIdx(showThinkingIdx === i ? null : i)}
                >
                  {showThinkingIdx === i ? '▾ 隐藏想法' : '▸ Minh 在想……'}
                </button>
                {showThinkingIdx === i && (
                  <div className="thinking-bubble" style={{ marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                    {msg.thinking}
                  </div>
                )}
              </div>
            )}
            <div className={`message ${msg.role === 'user' ? 'mine' : 'his'}`}>
              <div className="message-bubble">{msg.content}</div>
              <div className="message-meta">
                <span>{formatTime(msg.timestamp)}</span>
                {msg.role === 'user' && (
                  <span className={`read-indicator ${msg.read !== false ? 'read' : 'unread'}`}>✓✓</span>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}

        {isThinking && thinking && (
          <div className="thinking-bubble">
            <div className="thinking-label">
              <span className="pulse-dot" />
              Minh 在想
            </div>
            {thinking.slice(-180)}
          </div>
        )}

        {!isThinking && sending && !streaming && (
          <div className="typing-indicator">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        )}

        {streaming && (
          <div className="message his">
            <div className="message-bubble">{streaming}</div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-bar">
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="跟 Minh 说话……"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            rows={1}
            disabled={sending}
          />
          <button className="send-btn" onClick={send} disabled={!input.trim() || sending}>↑</button>
        </div>
      </div>

      {showConvs && (
        <div className="conv-modal">
          <div className="conv-modal-backdrop" onClick={() => setShowConvs(false)} />
          <div className="conv-modal-content">
            <div className="conv-modal-header">
              <h3>对话列表</h3>
              <button onClick={newConv}>新对话</button>
            </div>
            <div className="conv-list">
              <button className="conv-item" onClick={() => { setConvId('default'); setShowConvs(false) }}>
                <div className="conv-avatar">M</div>
                <div className="conv-info">
                  <div className="conv-title">和 Minh</div>
                  <div className="conv-preview">
                    {conversations.find(c => c.id === 'default')?.lastMessage || '开始聊天'}
                  </div>
                </div>
                {(conversations.find(c => c.id === 'default')?.unread || 0) > 0 && (
                  <span className="conv-badge">{conversations.find(c => c.id === 'default')?.unread}</span>
                )}
              </button>
              {conversations.filter(c => c.id !== 'default').map(c => (
                <button key={c.id} className="conv-item" onClick={() => { setConvId(c.id); setShowConvs(false) }}>
                  <div className="conv-avatar">M</div>
                  <div className="conv-info">
                    <div className="conv-title">对话 {c.id.slice(0, 6)}</div>
                    <div className="conv-preview">{c.lastMessage || '空对话'}</div>
                  </div>
                  {c.unread > 0 && <span className="conv-badge">{c.unread}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
