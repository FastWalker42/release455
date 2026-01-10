import { createClient } from 'redis'
import { WebSocketServer, WebSocket } from 'ws'

const subscriber = createClient()

subscriber.on('error', (err) => console.log('Redis Client Error', err))

await subscriber.connect()

const WEBSOCKET_MAP: Map<string, WebSocket> = new Map()

async function sendUpdate(token: string, update: any) {
  try {
    const ws = WEBSOCKET_MAP.get(token)
    ws?.send(JSON.stringify(update))
  } catch (err) {
    console.error('Failed to send update:', err)
    WEBSOCKET_MAP.delete(token) // если сокет умер
  }
}

await subscriber.subscribe('gamestate', (message) => {
  console.log(`Получено сообщение: ${message}`)
})

console.log('Подписчик запущен, ожидаем сообщения...')
