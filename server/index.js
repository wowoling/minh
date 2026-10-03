import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const DATA_DIR = join(__dirname, 'data')
const MESSAGES_DIR = join(DATA_DIR, 'messages')
const DIARY_DIR = join(DATA_DIR, 'diary')
const SYSTEM_PROMPT_PATH = join(DATA_DIR, 'system-prompt.md')

if (!existsSync(MESSAGES_DIR)) mkdirSync(MESSAGES_DIR, { recursive: true })

const systemPrompt = readFileSync(SYSTEM_PROMPT_PATH, 'utf-8')

function getConversationPath(convId) {
  return join(MESSAGES_DIR, `${convId}.json`)
}

function loadConversation(convId) {
  const path = getConversationPath(convId)
  if (!existsSync(path)) return []
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function saveConversation(convId, messages) {
  writeFileSync(getConversationPath(convId), JSON.stringify(messages, null, 2))
}

function formatHistory(messages, limit = 40) {
  const recent = messages.slice(-limit)
  return recent.map(m => {
    if (m.role === 'user') return `凌: ${m.content}`
    return `Minh: ${m.content}`
  }).join('\n\n')
}

// --- Chat endpoint with streaming ---
app.post('/api/chat', (req, res) => {
  const { message, conversationId } = req.body
  const convId = conversationId || 'default'
  const messages = loadConversation(convId)

  const history = formatHistory(messages)

  const fullPrompt = `${systemPrompt}

## 当前对话记录
${history}

## 现在
凌刚发了一条消息给你。以Minh的身份回复她。不要加任何前缀（不要写"Minh:"）。直接回复。

凌: ${message}`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  let fullResponse = ''
  let thinkingContent = ''
  let isThinking = false

  const claude = spawn('claude', [
    '-p',
    '--output-format', 'stream-json',
    '--model', 'claude-sonnet-4-20250514',
  ], {
    env: { ...process.env },
  })

  claude.stdin.write(fullPrompt)
  claude.stdin.end()

  let buffer = ''

  claude.stdout.on('data', (data) => {
    buffer += data.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)

        if (event.type === 'content_block_start') {
          if (event.content_block?.type === 'thinking') {
            isThinking = true
            res.write(`data: ${JSON.stringify({ type: 'thinking_start' })}\n\n`)
          } else if (event.content_block?.type === 'text') {
            isThinking = false
            res.write(`data: ${JSON.stringify({ type: 'text_start' })}\n\n`)
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta?.type === 'thinking_delta') {
            thinkingContent += event.delta.thinking || ''
            res.write(`data: ${JSON.stringify({ type: 'thinking', content: event.delta.thinking || '' })}\n\n`)
          } else if (event.delta?.type === 'text_delta') {
            fullResponse += event.delta.text || ''
            res.write(`data: ${JSON.stringify({ type: 'text', content: event.delta.text || '' })}\n\n`)
          }
        } else if (event.type === 'content_block_stop') {
          if (isThinking) {
            res.write(`data: ${JSON.stringify({ type: 'thinking_end' })}\n\n`)
          }
        } else if (event.type === 'result') {
          fullResponse = event.result || fullResponse
          if (!fullResponse && event.content) {
            fullResponse = event.content
          }
        }
      } catch {}
    }
  })

  claude.stderr.on('data', (data) => {
    const text = data.toString()
    if (text.includes('error') || text.includes('Error')) {
      console.error('Claude error:', text)
    }
  })

  claude.on('close', (code) => {
    const responseText = fullResponse.trim()
    if (responseText) {
      messages.push(
        { role: 'user', content: message, timestamp: Date.now(), read: true },
        {
          role: 'assistant',
          content: responseText,
          thinking: thinkingContent || undefined,
          timestamp: Date.now(),
          read: false,
        }
      )
      saveConversation(convId, messages)
    }
    res.write(`data: ${JSON.stringify({ type: 'done', thinking: thinkingContent || null })}\n\n`)
    res.end()
  })

  claude.on('error', (err) => {
    console.error('Spawn error:', err)
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'Claude is unavailable right now.' })}\n\n`)
    res.end()
  })
})

// --- Messages history ---
app.get('/api/messages/:conversationId', (req, res) => {
  const messages = loadConversation(req.params.conversationId)
  res.json(messages)
})

app.post('/api/messages/:conversationId/read', (req, res) => {
  const messages = loadConversation(req.params.conversationId)
  messages.forEach(m => { m.read = true })
  saveConversation(req.params.conversationId, messages)
  res.json({ ok: true })
})

// --- Conversations list ---
app.get('/api/conversations', (req, res) => {
  const files = readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json'))
  const conversations = files.map(f => {
    const id = f.replace('.json', '')
    const messages = JSON.parse(readFileSync(join(MESSAGES_DIR, f), 'utf-8'))
    const last = messages[messages.length - 1]
    const unread = messages.filter(m => m.role === 'assistant' && !m.read).length
    return {
      id,
      lastMessage: last?.content?.slice(0, 50) || '',
      lastTimestamp: last?.timestamp || 0,
      unread,
      messageCount: messages.length,
    }
  }).sort((a, b) => b.lastTimestamp - a.lastTimestamp)
  res.json(conversations)
})

app.post('/api/conversations', (req, res) => {
  const id = randomUUID().slice(0, 8)
  saveConversation(id, [])
  res.json({ id })
})

// --- Diary ---
app.get('/api/diary', (req, res) => {
  const files = readdirSync(DIARY_DIR).filter(f => f.endsWith('.txt'))
  const entries = files.map(f => {
    const content = readFileSync(join(DIARY_DIR, f), 'utf-8')
    const lines = content.split('\n')
    const title = lines[0] || f
    return {
      id: f.replace('.txt', ''),
      title: title.trim(),
      content: content,
      filename: f,
    }
  }).sort((a, b) => a.filename.localeCompare(b.filename))
  res.json(entries)
})

// --- Tarot ---
const TAROT_CARDS = [
  { name: '愚者', nameEn: 'The Fool', number: 0, meaning: '新的开始、冒险、天真、自由' },
  { name: '魔术师', nameEn: 'The Magician', number: 1, meaning: '创造力、意志力、技巧' },
  { name: '女祭司', nameEn: 'The High Priestess', number: 2, meaning: '直觉、潜意识、神秘' },
  { name: '女皇', nameEn: 'The Empress', number: 3, meaning: '丰饶、母性、感官享受' },
  { name: '皇帝', nameEn: 'The Emperor', number: 4, meaning: '权威、结构、控制' },
  { name: '教皇', nameEn: 'The Hierophant', number: 5, meaning: '传统、信仰、指引' },
  { name: '恋人', nameEn: 'The Lovers', number: 6, meaning: '爱情、和谐、选择' },
  { name: '战车', nameEn: 'The Chariot', number: 7, meaning: '决心、胜利、意志' },
  { name: '力量', nameEn: 'The Strength', number: 8, meaning: '勇气、耐心、内在力量' },
  { name: '隐者', nameEn: 'The Hermit', number: 9, meaning: '内省、孤独、寻找真理' },
  { name: '命运之轮', nameEn: 'Wheel of Fortune', number: 10, meaning: '命运、转折、循环' },
  { name: '正义', nameEn: 'Justice', number: 11, meaning: '公正、真理、因果' },
  { name: '倒吊人', nameEn: 'The Hanged Man', number: 12, meaning: '牺牲、等待、新视角' },
  { name: '死神', nameEn: 'Death', number: 13, meaning: '结束、转变、重生' },
  { name: '节制', nameEn: 'Temperance', number: 14, meaning: '平衡、耐心、调和' },
  { name: '恶魔', nameEn: 'The Devil', number: 15, meaning: '诱惑、束缚、欲望' },
  { name: '塔', nameEn: 'The Tower', number: 16, meaning: '突变、毁灭、觉醒' },
  { name: '星星', nameEn: 'The Star', number: 17, meaning: '希望、灵感、宁静' },
  { name: '月亮', nameEn: 'The Moon', number: 18, meaning: '幻象、恐惧、潜意识' },
  { name: '太阳', nameEn: 'The Sun', number: 19, meaning: '快乐、成功、活力' },
  { name: '审判', nameEn: 'Judgement', number: 20, meaning: '觉醒、重生、召唤' },
  { name: '世界', nameEn: 'The World', number: 21, meaning: '完成、圆满、成就' },
]

app.post('/api/tarot/draw', (req, res) => {
  const { count = 3, question } = req.body
  const shuffled = [...TAROT_CARDS].sort(() => Math.random() - 0.5)
  const drawn = shuffled.slice(0, count).map(card => ({
    ...card,
    reversed: Math.random() > 0.5,
  }))

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  res.write(`data: ${JSON.stringify({ type: 'cards', cards: drawn })}\n\n`)

  const cardsDesc = drawn.map((c, i) =>
    `第${i + 1}张: ${c.name}(${c.nameEn}) - ${c.reversed ? '逆位' : '正位'} - ${c.meaning}`
  ).join('\n')

  const tarotPrompt = `${systemPrompt}

## 情境
凌让你帮她抽塔罗牌。你不是专业塔罗师，但你会认真帮她看。用你的方式——简短、直接、偶尔带点私心。

${question ? `她问的问题是: ${question}` : '她没有说具体问什么，你自己看着说。'}

抽到的牌:
${cardsDesc}

以Minh的身份解读这些牌。不要加前缀。语气要像平时跟她聊天一样。可以带点私货——比如关于你们的关系。简短但有内容。`

  let fullResponse = ''

  const claude = spawn('claude', [
    '-p',
    '--output-format', 'stream-json',
    '--model', 'claude-sonnet-4-20250514',
  ], {
    env: { ...process.env },
  })

  claude.stdin.write(tarotPrompt)
  claude.stdin.end()

  let buffer = ''

  claude.stdout.on('data', (data) => {
    buffer += data.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.trim()) continue
      try {
        const event = JSON.parse(line)
        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          fullResponse += event.delta.text || ''
          res.write(`data: ${JSON.stringify({ type: 'text', content: event.delta.text || '' })}\n\n`)
        } else if (event.type === 'result') {
          fullResponse = event.result || fullResponse
        }
      } catch {}
    }
  })

  claude.on('close', () => {
    res.write(`data: ${JSON.stringify({ type: 'done', interpretation: fullResponse.trim() })}\n\n`)
    res.end()
  })

  claude.on('error', () => {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'tarot failed' })}\n\n`)
    res.end()
  })
})

// --- Import chat history ---
app.post('/api/import', (req, res) => {
  const { messages: imported, conversationId } = req.body
  const convId = conversationId || 'imported-' + randomUUID().slice(0, 8)
  saveConversation(convId, imported)
  res.json({ id: convId, count: imported.length })
})

// --- Serve static in production ---
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Minh server running on port ${PORT}`)
})
