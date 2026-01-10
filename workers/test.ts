import { createClient } from 'redis'

const redis = createClient({
  url: 'redis://127.0.0.1:6379',
})
await redis.connect()

await redis.publish('EVENT', 'CRASH')
