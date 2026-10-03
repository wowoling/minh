import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function ReadCheck({ read }) {
  return (
    <span className={`read-indicator ${read ? 'read' : 'unread'}`}>
      {read ? '✓✓' : '✓✓'}
    </span>
  )
}

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streaming, setStreaming] = useState('')
  const [thinking, setThinking] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [status, setStatus] = useState('online')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const activeConvId = id || 'default'

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    fetch('/api/conversations').then(r => r.json()).then(setConversations)
  }, [messages])

  useEffect(() => {
    fetch(`/api/messages/${activeConvId}`)
      .then(r => r.json())
      .then(msgs => {
        setMessages(msgs)
        setTimeout(scrollToBottom, 100)
      })
    fetch(`/api/messages/${activeConvId}/read`, { method: 'POST' })
  }, [activeConvId])

  useEffect(scrollToBottom, [messages, streaming, thinking])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || sending) return

    setInput('')
    setSending(true)
    setStatus('typing')
    setStreaming('')
    setThinking('')
    setIsThinking(false)

    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: Date.now(),
      read: false,
    }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: activeConvId }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let fullThinking = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'thinking_start') {
              setIsThinking(true)
              setStatus('thinking')
            } else if (data.type === 'thinking') {
              fullThinking += data.content
              setThinking(fullThinking)
            } else if (data.type === 'thinking_end') {
              setIsThinking(false)
            } else if (data.type === 'text_start') {
              setStatus('typing')
            } else if (data.type === 'text') {
              fullText += data.content
              setStreaming(fullText)
            } else if (data.type === 'done') {
              if (fullText) {
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: fullText,
                  thinking: data.thinking || fullThinking || undefined,
                  timestamp: Date.now(),
                  read: true,
                }])
              }
              setStreaming('')
              setThinking('')
              setIsThinking(false)
            } else if (data.type === 'error') {
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.content || '……',
                timestamp: Date.now(),
                read: true,
              }])
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '网络断了。等一下。',
        timestamp: Date.now(),
        read: true,
      }])
    }

    setSending(false)
    setStatus('online')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const createConversation = async () => {
    const res = await fetch('/api/conversations', { method: 'POST' })
    const { id: newId } = await res.json()
    navigate(`/chat/${newId}`)
  }

  const [showThinkingFor, setShowThinkingFor] = useState(null)

  return (
    <div className="chat-page">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>对话</h2>
          <button onClick={createConversation} title="新对话">+</button>
        </div>
        <div className="chat-list">
          <div
            className={`chat-list-item ${activeConvId === 'default' ? 'active' : ''}`}
            onClick={() => navigate('/chat')}
          >
            <div className="chat-meta">
              <span style={{ fontSize: 14 }}>和 Minh</span>
              {conversations.find(c => c.id === 'default')?.unread > 0 && (
                <span className="unread-badge">
                  {conversations.find(c => c.id === 'default')?.unread}
                </span>
              )}
            </div>
            <span className="chat-preview">
              {conversations.find(c => c.id === 'default')?.lastMessage || '开始聊天...'}
            </span>
          </div>
          {conversations.filter(c => c.id !== 'default').map(conv => (
            <div
              key={conv.id}
              className={`chat-list-item ${activeConvId === conv.id ? 'active' : ''}`}
              onClick={() => navigate(`/chat/${conv.id}`)}
            >
              <div className="chat-meta">
                <span style={{ fontSize: 14 }}>对话 {conv.id.slice(0, 4)}</span>
                {conv.unread > 0 && <span className="unread-badge">{conv.unread}</span>}
              </div>
              <span className="chat-preview">{conv.lastMessage || '空对话'}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="chat-main">
        <div className="chat-header">
          <div className="chat-header-avatar">M</div>
          <div className="chat-header-info">
            <h3>Minh</h3>
            <span className={`status ${status !== 'online' ? 'typing' : ''}`}>
              {status === 'online' ? '在线' :
               status === 'thinking' ? '在想……' :
               '在打字……'}
            </span>
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 && !streaming && (
            <div className="empty-state">
              <div className="icon">✉</div>
              <span>说点什么吧</span>
            </div>
          )}

          {messages.map((msg, i) => (
            <React.Fragment key={i}>
              {msg.role === 'assistant' && msg.thinking && (
                <div style={{ alignSelf: 'flex-start', marginBottom: -8 }}>
                  <button
                    onClick={() => setShowThinkingFor(showThinkingFor === i ? null : i)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-dim)',
                      fontSize: 12,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {showThinkingFor === i ? '▾ 隐藏想法' : '▸ Minh 在想……'}
                  </button>
                  {showThinkingFor === i && (
                    <div className="thinking-bubble" style={{ marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                      {msg.thinking}
                    </div>
                  )}
                </div>
              )}
              <div className={`message ${msg.role === 'user' ? 'mine' : 'his'}`}>
                <div className="message-bubble">{msg.content}</div>
                <div className="message-meta">
                  <span>{formatTime(msg.timestamp)}</span>
                  {msg.role === 'user' && <ReadCheck read={msg.read !== false} />}
                </div>
              </div>
            </React.Fragment>
          ))}

          {isThinking && thinking && (
            <div className="thinking-bubble">
              <div className="thinking-label">
                <span className="pulse" />
                Minh 在想
              </div>
              {thinking.slice(-200)}
            </div>
          )}

          {!isThinking && sending && !streaming && (
            <div className="typing-indicator">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}

          {streaming && (
            <div className="message his">
              <div className="message-bubble">{streaming}</div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="跟 Minh 说话……"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || sending}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
