import { createClient } from 'redis'
import { GAME } from '../CONFIG.json'
import { v4 as uuidv4 } from 'uuid'
import { Player } from './types'
import { BetHistory, Reflink, User } from '../db'
import { REF_LEVELS } from '../config'

const redis = createClient()
await redis.connect()

const subscriber = redis.duplicate()
await subscriber.connect()
const publisher = redis.duplicate()
await publisher.connect()

let COEFF: number = 1.0
const GROWTH_RATE = 0.009
const TICK_INTERVAL = 110

// Подписка на события банка
await subscriber.subscribe('BANKCRASH', (message) => {
  console.log('BANK exploded! Crash game immediately')
  if (currentGameInterval) clearInterval(currentGameInterval)
  endGame(COEFF)
})

export async function REDIS_GetPlayer(token: string): Promise<Player | null> {
  const data = await redis.get(`player:${token}`)
  return data ? JSON.parse(data) : null
}

export async function REDIS_SetPlayer(player: Player) {
  await redis.set(`player:${player.token}`, JSON.stringify(player))
  if (!player.bet) {
    await redis.zRem('last_bets', player.token)
  } else {
    await redis.zAdd('last_bets', {
      score: player.bet.amount,
      value: player.token,
    })
  }
}

async function REDIS_addLastCrash(coeff: number) {
  const key = 'LAST_CRASHES'
  await redis.lPush(key, coeff.toFixed(2)) // добавляем новый коэффициент в начало списка
  await redis.lTrim(key, 0, 14) // сохраняем только последние 15 элементов
}

let currentGameInterval: NodeJS.Timeout | null = null

function shouldCrash(coeff: number) {
  const min = GAME.MIN_COEFF
  const max = GAME.MAX_COEFF

  const t = (coeff - min) / (max - min)

  let minChance = 0.01
  let maxChance = 0.025

  // базовая кривая
  let chance = minChance + (maxChance - minChance) * Math.pow(1 - 4 * t * (1 - t), 3)

  // повышаем шанс для высоких коэффициентов
  if (coeff > 8) chance *= 2 // немного выше для 8+
  if (coeff > 9) chance *= 4 // сильно выше для 9+

  // ограничим максимум, чтобы не вышло >1
  chance = Math.min(chance, 0.9)

  return Math.random() < chance
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

async function startGame() {
  const gameId = uuidv4()

  const players: Player[] = await REDIS_GetAllPlayers()

  let TOTAL_STAKES = 0
  for (const player of players) {
    if (player?.bet?.status === 'pending') {
      player.bet.gameId = gameId
      player.bet.status = 'active'

      if (!player.bet.freebet) {
        TOTAL_STAKES += player.bet.amount
      }
      await REDIS_SetPlayer(player)
    } else {
      player.bet = null
      await REDIS_SetPlayer(player)
    }
  }
  await redis.incrByFloat('TOTAL_STAKES', TOTAL_STAKES)

  await redis.set('GAME_ID', gameId)

  console.log(`Game ${gameId} started`)

  await publisher.publish('STARTGAME', gameId)
  await publisher.publish('CURRENT_BETS', 'BROADCAST')
  await publisher.publish('LAST_PLAYERS', 'FORM')

  COEFF = GAME.MIN_COEFF

  // Шанс взрыва на старте
  const INITIAL_CRASH_CHANCE = 0.07
  if (Math.random() < INITIAL_CRASH_CHANCE) {
    console.log('Crash at start!')
    await endGame(COEFF)
    return
  }
  await publisher.publish('COEFF', COEFF.toFixed(2))

  setTimeout(() => {
    currentGameInterval = setInterval(async () => {
      COEFF *= 1 + GROWTH_RATE
      if (COEFF > GAME.MAX_COEFF) COEFF = GAME.MAX_COEFF

      await publisher.publish('COEFF', COEFF.toFixed(2))

      // Рандомный краш
      if (shouldCrash(COEFF)) {
        console.log('Random crash triggered!')
        clearInterval(currentGameInterval!)
        await endGame(COEFF)
        return
      }

      // Плановый краш
      if (COEFF >= GAME.MAX_COEFF) {
        clearInterval(currentGameInterval!)
        await endGame(COEFF)
      }
    }, TICK_INTERVAL)
  }, TICK_INTERVAL)
}

async function endGame(finalCoeff: number) {
  await REDIS_addLastCrash(finalCoeff)

  console.log('Game crashed')

  const players: Player[] = await REDIS_GetAllPlayers()

  // --- BULK BUFFERS ---
  const userBulk: any[] = []
  const reflinkBulk: any[] = []
  const betHistoryDocs: any[] = []

  // --- LOAD USERS ONCE ---
  const activePlayers = players.filter((p) => p?.bet?.status === 'active')
  const tokens = activePlayers.map((p) => p.token)

  const users = await User.find({ appToken: { $in: tokens } }).lean()
  const usersMap = new Map(users.map((u) => [u.appToken, u]))

  // --- MAIN LOOP ---
  for (const player of activePlayers) {
    const bet = player.bet!
    const betAmount = bet.amount
    const user = usersMap.get(player.token)

    // USER TOTAL LOST
    if (user) {
      userBulk.push({
        updateOne: {
          filter: { appToken: player.token },
          update: { $inc: { totalAmount: betAmount } },
        },
      })
    }

    // BET HISTORY
    betHistoryDocs.push({
      ...bet,
      userToken: player.token,
      status: 'lost',
      finalCoeff,
    })

    // REFERRAL SYSTEM
    if (user?.invited_by) {
      if (user.refType === 'user') {
        const refBonus = betAmount * REF_LEVELS[user.refLevel as keyof typeof REF_LEVELS]

        userBulk.push({
          updateOne: {
            filter: { id: Number(user.invited_by) },
            update: {
              $inc: {
                balance: refBonus,
                refTotalMoney: refBonus,
              },
            },
          },
        })
      } else {
        reflinkBulk.push({
          updateOne: {
            filter: { payload: user.invited_by },
            update: { $inc: { totalLost: betAmount } },
          },
        })
      }
    }

    // REDIS UPDATE
    bet.status = 'lost'
    bet.finalCoeff = finalCoeff
    await REDIS_SetPlayer(player)
  }

  // --- EXECUTE BULK OPS ---
  if (userBulk.length) {
    await User.bulkWrite(userBulk, { ordered: false })
  }

  if (reflinkBulk.length) {
    await Reflink.bulkWrite(reflinkBulk, { ordered: false })
  }

  if (betHistoryDocs.length) {
    await BetHistory.insertMany(betHistoryDocs)
  }

  // --- EVENTS ---
  await publisher.publish('CRASH', finalCoeff.toFixed(2))
  await publisher.publish('LAST_PLAYERS', 'FORM')
  await publisher.publish('CURRENT_BETS', 'BROADCAST')

  // --- NEXT ROUND TIMER ---
  let timeout = 1000 * GAME.TIMEOUT
  const tick = 1000

  const interval = setInterval(async () => {
    timeout -= tick

    await publisher.publish('TIMEOUT', String(timeout))

    if (timeout <= 0) {
      clearInterval(interval)
      await startGame()
    } else {
      await redis.set('nextRoundTimer', timeout)
    }
  }, tick)
}

// Запускаем первый раунд
startGame()
