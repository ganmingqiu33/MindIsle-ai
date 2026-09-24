// 本地 Ollama 客户端（开发期通过 Vite 代理 /ollama → 127.0.0.1:11434）
// 上线时把这里换成后端 /api/chat（或云厂商 OpenAI 兼容接口）即可，UI 不用动。

export const DEFAULT_MODEL = 'qwen2.5:3b'

export const OLLAMA_BASE = '/ollama'

/**
 * 流式对话
 * @param {Object}   opts
 * @param {Array}    opts.messages  [{ role, content }]（含 system）
 * @param {string}   [opts.model]
 * @param {AbortSignal} [opts.signal]
 * @param {(text:string)=>void} opts.onToken 每收到一段文字回调
 * @returns {Promise<string>} 完整回复
 */
export async function chatStream({ messages, model = DEFAULT_MODEL, signal, onToken }) {
  let resp
  try {
    resp = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        // 模型空闲 30 分钟内常驻内存，避免每轮重新读盘等待
        keep_alive: '30m',
        options: {
          temperature: 0.8,
          top_p: 0.9,
        },
      }),
      signal,
    })
  } catch {
    throw new Error('无法连接本地 Ollama，请确认它已启动（任务栏有羊驼图标）')
  }

  if (!resp.ok || !resp.body) {
    throw new Error(`Ollama 返回异常（HTTP ${resp.status}）`)
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let full = ''

  // Ollama 流式返回 NDJSON：每行一个 JSON，token 在 message.content，done:true 结束
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() // 最后一行可能不完整，留到下一轮

    for (const line of lines) {
      const t = line.trim()
      if (!t) continue
      try {
        const json = JSON.parse(t)
        const piece = json?.message?.content || ''
        if (piece) {
          full += piece
          onToken?.(piece)
        }
      } catch {
        // 半行 / 非 JSON 心跳，忽略
      }
    }
  }

  return full
}
