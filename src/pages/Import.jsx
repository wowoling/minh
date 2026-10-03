import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Import() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [importing, setImporting] = useState(false)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    setStatus('正在读取...')

    try {
      const text = await file.text()
      let messages = []

      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text)
        if (Array.isArray(data)) {
          messages = data
        } else if (data.messages) {
          messages = data.messages
        }
      } else {
        const lines = text.split('\n').filter(l => l.trim())
        for (const line of lines) {
          const minhMatch = line.match(/^(?:Minh|minh|M)\s*[:：]\s*(.+)/)
          const lingMatch = line.match(/^(?:凌|Ling|ling|L)\s*[:：]\s*(.+)/)

          if (minhMatch) {
            messages.push({
              role: 'assistant',
              content: minhMatch[1].trim(),
              timestamp: Date.now(),
              read: true,
            })
          } else if (lingMatch) {
            messages.push({
              role: 'user',
              content: lingMatch[1].trim(),
              timestamp: Date.now(),
              read: true,
            })
          } else if (line.trim()) {
            messages.push({
              role: 'user',
              content: line.trim(),
              timestamp: Date.now(),
              read: true,
            })
          }
        }
      }

      if (messages.length === 0) {
        setStatus('没有找到消息。格式：每行 "凌: xxx" 或 "Minh: xxx"')
        setImporting(false)
        return
      }

      const normalized = messages.map(m => ({
        role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
        content: m.content || m.text || m.message || '',
        timestamp: m.timestamp || m.time || Date.now(),
        read: true,
      }))

      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: normalized }),
      })

      const result = await res.json()
      setStatus(`导入了 ${result.count} 条消息`)

      setTimeout(() => navigate(`/chat/${result.id}`), 1500)
    } catch (err) {
      console.error(err)
      setStatus('导入失败：' + err.message)
    }

    setImporting(false)
  }

  return (
    <div className="import-page">
      <h1>导入聊天记录</h1>
      <p>
        把你和 Minh 的聊天记录带过来。<br />
        支持 JSON 或纯文本格式（每行 "凌: xxx" 或 "Minh: xxx"）
      </p>

      <label className="import-drop">
        <input
          type="file"
          accept=".json,.txt,.md"
          onChange={handleFile}
          disabled={importing}
        />
        {importing ? '正在导入……' : '点击选择文件，或者拖进来'}
      </label>

      {status && (
        <p style={{ color: 'var(--accent)', fontSize: 14 }}>{status}</p>
      )}
    </div>
  )
}
