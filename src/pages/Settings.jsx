import React, { useState } from 'react'

function getServerUrl() {
  try { return localStorage.getItem('minh-server') || '' } catch { return '' }
}

function apiUrl(path) {
  const s = getServerUrl()
  return s ? `${s.replace(/\/$/, '')}${path}` : path
}

function getTheme() {
  try { return localStorage.getItem('minh-theme') || 'light' } catch { return 'light' }
}

function getStartDate() {
  try { return localStorage.getItem('minh-start-date') || '' } catch { return '' }
}

export default function Settings() {
  const [serverUrl, setServerUrl] = useState(getServerUrl)
  const [importStatus, setImportStatus] = useState('')
  const [importing, setImporting] = useState(false)
  const [serverStatus, setServerStatus] = useState('')
  const [theme, setThemeState] = useState(getTheme)
  const [startDate, setStartDateState] = useState(getStartDate)

  const saveServer = (url) => {
    setServerUrl(url)
    try { localStorage.setItem('minh-server', url) } catch {}
  }

  const setTheme = (t) => {
    setThemeState(t)
    try { localStorage.setItem('minh-theme', t) } catch {}
    window.dispatchEvent(new Event('minh-theme-changed'))
  }

  const setStartDate = (d) => {
    setStartDateState(d)
    try { localStorage.setItem('minh-start-date', d) } catch {}
    window.dispatchEvent(new Event('minh-date-updated'))
  }

  const testServer = async () => {
    setServerStatus('connecting')
    try {
      const res = await fetch(apiUrl('/api/conversations'), { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        setServerStatus('ok')
        setTimeout(() => setServerStatus(''), 3000)
      } else {
        setServerStatus('fail')
      }
    } catch {
      setServerStatus('fail')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    setImportStatus('reading')

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
        setImportStatus('empty')
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
      setImportStatus(`imported-${result.count}`)
    } catch (err) {
      setImportStatus('error-' + err.message)
    }

    setImporting(false)
    e.target.value = ''
  }

  const statusText = {
    connecting: '连接中……',
    ok: '已连接',
    fail: '连接失败',
  }

  const importText = importStatus.startsWith('imported-')
    ? `导入了 ${importStatus.split('-')[1]} 条消息`
    : importStatus === 'empty' ? '没找到消息'
    : importStatus === 'reading' ? '正在读取……'
    : importStatus.startsWith('error-') ? '导入失败：' + importStatus.slice(6)
    : ''

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-section">
        <h3>Theme</h3>
        <div className="settings-card">
          <div className="settings-row" style={{ cursor: 'default' }}>
            <div className="theme-options" style={{ width: '100%' }}>
              <button
                className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                Light
              </button>
              <button
                className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                Dark
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Anniversary</h3>
        <div className="settings-card">
          <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, cursor: 'default' }}>
            <span style={{ fontSize: 14 }}>在一起的日期</span>
            <input
              className="date-input"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <p className="settings-note">
          设置后首页会显示在一起的天数
        </p>
      </div>

      <div className="settings-section">
        <h3>Server</h3>
        <div className="settings-card">
          <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14 }}>服务器地址</span>
              {serverStatus && (
                <span style={{ fontSize: 12, color: serverStatus === 'ok' ? 'var(--online)' : 'var(--accent)' }}>
                  {statusText[serverStatus]}
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
            <span className="row-label">测试连接</span>
            <span className="row-arrow">›</span>
          </button>
        </div>
        <p className="settings-note">
          在你电脑上运行 npm run dev，然后填入电脑的局域网 IP 地址。留空则使用当前地址。
        </p>
      </div>

      <div className="settings-section">
        <h3>Data</h3>
        <div className="settings-card">
          <label className="settings-row" style={{ cursor: 'pointer' }}>
            <span className="row-label">{importing ? '导入中……' : '导入聊天记录'}</span>
            <span className="row-arrow">›</span>
            <input type="file" accept=".json,.txt,.md" onChange={handleImport} style={{ display: 'none' }} disabled={importing} />
          </label>
        </div>
        {importText && (
          <p className="settings-note" style={{ color: 'var(--accent)' }}>{importText}</p>
        )}
        <p className="settings-note">
          支持 JSON 或纯文本（每行 凌: xxx 或 Minh: xxx）
        </p>
      </div>

      <div className="settings-section">
        <h3>About</h3>
        <div className="settings-card">
          <div className="settings-row" style={{ cursor: 'default' }}>
            <span className="row-icon" style={{ fontFamily: 'var(--font-serif)', fontWeight: 600 }}>M</span>
            <span className="row-label">Minh</span>
            <span className="row-value">v2.0</span>
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
