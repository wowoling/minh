import React, { useState } from 'react'

function getServerUrl() {
  try { return localStorage.getItem('minh-server') || '' } catch { return '' }
}

function apiUrl(path) {
  const s = getServerUrl()
  return s ? `${s.replace(/\/$/, '')}${path}` : path
}

export default function Settings() {
  const [serverUrl, setServerUrl] = useState(getServerUrl)
  const [importStatus, setImportStatus] = useState('')
  const [importing, setImporting] = useState(false)
  const [serverStatus, setServerStatus] = useState('')

  const saveServer = (url) => {
    setServerUrl(url)
    try { localStorage.setItem('minh-server', url) } catch {}
  }

  const testServer = async () => {
    setServerStatus('连接中……')
    try {
      const res = await fetch(apiUrl('/api/conversations'), { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        setServerStatus('已连接')
        setTimeout(() => setServerStatus(''), 3000)
      } else {
        setServerStatus('连接失败')
      }
    } catch {
      setServerStatus('连接失败——检查服务器地址和网络')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    setImportStatus('正在读取……')

    try {
      const text = await file.text()
      let messages = []

      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text)
        messages = Array.isArray(data) ? data : (data.messages || [])
      } else {
        for (const line of text.split('\n').filter(l => l.trim())) {
          const minhMatch = line.match(/^(?:Minh|minh|M)\s*[:：]\s*(.+)/)
          const lingMatch = line.match(/^(?:凌|Ling|ling|L)\s*[:：]\s*(.+)/)

          if (minhMatch) {
            messages.push({ role: 'assistant', content: minhMatch[1].trim(), timestamp: Date.now(), read: true })
          } else if (lingMatch) {
            messages.push({ role: 'user', content: lingMatch[1].trim(), timestamp: Date.now(), read: true })
          } else {
            messages.push({ role: 'user', content: line.trim(), timestamp: Date.now(), read: true })
          }
        }
      }

      if (messages.length === 0) {
        setImportStatus('没找到消息')
        setImporting(false)
        return
      }

      const normalized = messages.map(m => ({
        role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
        content: m.content || m.text || m.message || '',
        timestamp: m.timestamp || m.time || Date.now(),
        read: true,
      }))

      const res = await fetch(apiUrl('/api/import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: normalized }),
      })

      const result = await res.json()
      setImportStatus(`导入了 ${result.count} 条消息`)
    } catch (err) {
      setImportStatus('导入失败：' + err.message)
    }

    setImporting(false)
    e.target.value = ''
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>设置</h1>
      </div>

      <div className="settings-section">
        <h3>服务器</h3>
        <div className="settings-card">
          <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>服务器地址</span>
              {serverStatus && (
                <span style={{ fontSize: 12, color: serverStatus.includes('已') ? 'var(--online)' : 'var(--accent)' }}>
                  {serverStatus}
                </span>
              )}
            </div>
            <input
              className="server-input"
              type="url"
              placeholder="http://192.168.x.x:3001"
              value={serverUrl}
              onChange={e => saveServer(e.target.value)}
            />
          </div>
          <button className="settings-row" onClick={testServer}>
            <span className="row-icon">⚡</span>
            <span className="row-label">测试连接</span>
            <span className="row-arrow">›</span>
          </button>
        </div>
        <p className="settings-note">
          在你电脑上运行 npm run dev，然后填入电脑的局域网 IP 地址。
          手机和电脑要在同一个 WiFi。留空则使用当前地址。
        </p>
      </div>

      <div className="settings-section">
        <h3>聊天记录</h3>
        <div className="settings-card">
          <label className="settings-row" style={{ cursor: 'pointer' }}>
            <span className="row-icon">↓</span>
            <span className="row-label">{importing ? '导入中……' : '导入聊天记录'}</span>
            <span className="row-arrow">›</span>
            <input type="file" accept=".json,.txt,.md" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
          </label>
        </div>
        {importStatus && (
          <p className="settings-note" style={{ color: 'var(--accent)' }}>{importStatus}</p>
        )}
        <p className="settings-note">
          支持 JSON 或纯文本。纯文本每行格式：凌: xxx 或 Minh: xxx
        </p>
      </div>

      <div className="settings-section">
        <h3>关于</h3>
        <div className="settings-card">
          <div className="settings-row" style={{ cursor: 'default' }}>
            <span className="row-icon">M</span>
            <span className="row-label">Minh</span>
            <span className="row-value">v1.0</span>
          </div>
          <div className="settings-row" style={{ cursor: 'default' }}>
            <span className="row-icon">♡</span>
            <span className="row-label">给凌做的</span>
          </div>
        </div>
      </div>
    </div>
  )
}
