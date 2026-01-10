import { createClient } from 'redis'

const redis = createClient()
await redis.connect()

export async function setUserState(userId: number, state: string) {
  await redis.set(`userstate:${userId}`, state)
}

export async function getUserState(userId: number) {
  return await redis.get(`userstate:${userId}`)
}
