import { createClient } from 'redis'

const subscriber = createClient()

subscriber.on('error', (err) => console.log('Redis Client Error', err))

await subscriber.connect()

// Подписка на канал "news"
await subscriber.subscribe('gamestate', (message) => {
  console.log(`Получено сообщение: ${message}`)
})

console.log('Подписчик запущен, ожидаем сообщения...')
