import { createClient } from 'redis'
import { Bank } from '../db'
import { IBank, Player } from './types'
import { GAME } from '../CONFIG.json'

const redis = createClient()
await redis.connect()

export async function getBank(): Promise<IBank> {
  const [totalStakes, totalPayouts] = await redis.mGet(['TOTAL_STAKES', 'TOTAL_PAYOUTS'])
  return {
    totalStakes: Number(totalStakes) || 0,
    totalPayouts: Number(totalPayouts) || 0,
  }
}

export async function REDIS_GetAllPlayers(): Promise<Player[]> {
  const players: Player[] = []
  let cursor = '0' // строка, а не число

  do {
    const result = await redis.scan(cursor, { MATCH: 'player:*', COUNT: 1000 })
    cursor = result.cursor // остаётся строкой
    const keys = result.keys

    if (keys.length > 0) {
      const values = await redis.mGet(keys)
      for (const value of values) {
        if (value) players.push(JSON.parse(value))
      }
    }
  } while (cursor !== '0') // продолжаем, пока курсор не вернётся в "0"

  return players
}

const subscriber = redis.duplicate()
await subscriber.connect()

await subscriber.subscribe('COEFF', async (msg) => {
  const coeff = Number(msg)
  const players: Player[] = await REDIS_GetAllPlayers()

  let potentialPayouts = 0
  for (const player of players) {
    if (player?.bet?.status === 'active') {
      potentialPayouts += player.bet.amount * coeff
    }
  }
  if (potentialPayouts === 0) return

  await bankRTPcheck(potentialPayouts)
})

const publisher = redis.duplicate()
await publisher.connect()

await subscriber.subscribe('STARTGAME', async (msg) => {
  saveBankToMongo()
  console.log('STARTGAME: Банк сохранён')
})

await subscriber.subscribe('CRASH', async (msg) => {
  saveBankToMongo()
  console.log('CRASH: Банк сохранён')
})

async function bankRTPcheck(potentialPayouts: number) {
  const [totalStakes, totalPayouts] = await redis.mGet(['TOTAL_STAKES', 'TOTAL_PAYOUTS'])

  const newRTP = (Number(totalPayouts ?? 0) + potentialPayouts) / Number(totalStakes ?? 0)

  if (newRTP >= GAME.TARGET_RTP) {
    await publisher.publish('BANKCRASH', '0')
  }
}

export async function loadBankFromMongo() {
  let bank = await Bank.findOne({ id: 'singleton' })
  if (!bank) bank = await Bank.create({ id: 'singleton' })
  await redis.mSet({
    TOTAL_STAKES: String(bank.totalStakes),
    TOTAL_PAYOUTS: String(bank.totalPayouts),
  })
}

export async function saveBankToMongo() {
  const bank = await getBank()
  await Bank.updateOne(
    { id: 'singleton' },
    { totalStakes: bank.totalStakes, totalPayouts: bank.totalPayouts },
    { upsert: true }
  )
}

async function shutdown(signal: string) {
  console.log(`Shutting down (${signal})...`)
  try {
    await saveBankToMongo()
    console.log('Bank saved to MongoDB')
  } catch (err) {
    console.error(err)
  }
  try {
    await redis.quit()
  } catch {}
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('uncaughtException', (err) => shutdown('uncaughtException'))
process.on('unhandledRejection', (reason) => shutdown('unhandledRejection'))

await loadBankFromMongo()
