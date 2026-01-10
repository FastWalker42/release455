import { createClient } from 'redis'
import { Bet, LastPlayer, Player } from './types'

const redis = createClient()
await redis.connect()

const subscriber = redis.duplicate()
subscriber.on('error', (err) => console.log('Redis Subscriber Error', err))
await subscriber.connect()

const publisher = redis.duplicate()
publisher.on('error', (err) => console.log('Redis Publisher Error', err))
await publisher.connect()

await subscriber.subscribe('LAST_PLAYERS', async (message) => {
  if (message === 'FORM') {
    await FORM_LAST_PLAYERS()
  }
})
export async function FORM_LAST_PLAYERS() {
  // Топ-10 по сумме ставки (score)
  const top = await redis.zRangeWithScores('last_bets', 0, 9, {
    REV: true,
  })

  // Если нет активных ставок, очищаем и отправляем пустой массив
  if (top.length === 0) {
    await redis.set('last_players', JSON.stringify([]))
    await publisher.publish('LAST_PLAYERS', 'BROADCAST')
    return
  }

  // токены игроков
  const tokens = top.map((item) => `player:${item.value}`)

  // Добавляем проверку на пустой массив
  if (tokens.length === 0) {
    await redis.set('last_players', JSON.stringify([]))
    await publisher.publish('LAST_PLAYERS', 'BROADCAST')
    return
  }

  const playersRaw = await redis.mGet(tokens)

  const result: LastPlayer[] = []

  for (const raw of playersRaw) {
    if (!raw) continue

    const player: Player = JSON.parse(raw)

    if (!player.bet) continue

    result.push({
      name: player.name,
      bet: player.bet,
      internalId: player.internalId,
    })
  }

  await redis.set('last_players', JSON.stringify(result))
  await publisher.publish('LAST_PLAYERS', 'BROADCAST')
}
