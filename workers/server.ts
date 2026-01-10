import { createClient } from 'redis'
import { WebSocketServer, WebSocket } from 'ws'
import { Request, Response } from 'express'

import app from '../app'
import http from 'http'
import { User, BetHistory } from '../db'
import { updateBankStats } from '../db/methods'
import { LastPlayer, Player } from './types'
import { GAME } from '../CONFIG.json'

const PORT = 3000
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

app.get('/stopgame234738483748', async (req: Request, res: Response) => {
  BETTING_DISABLED = true
  res.send('ИГРА ОСТАНОВЛЕНА!')
})

app.get('/startgame234738483748', async (req: Request, res: Response) => {
  BETTING_DISABLED = false
  res.send('ИГРА НАЧАТА!')
})

const redis = createClient()
await redis.connect()

const subscriber = redis.duplicate()
subscriber.on('error', (err) => console.log('Redis Subscriber Error', err))
await subscriber.connect()

const publisher = redis.duplicate()
publisher.on('error', (err) => console.log('Redis Publisher Error', err))
await publisher.connect()

const WEBSOCKET_MAP: Map<string, WebSocket> = new Map()

let BETTING_DISABLED = false
let GAME_ACTIVE = true
let COEFF = 1.0

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

async function REDIS_getLastCrashes(): Promise<number[]> {
  const coeffs = await redis.lRange('LAST_CRASHES', 0, -1)
  return coeffs.map(Number)
}

// SERVER

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url ?? '', `https://${req.headers.host}`)
  const token = url.searchParams.get('token')
  if (!token) {
    ws.close()
    return
  }

  const user = await User.findOne({ appToken: token })
  if (!user) {
    ws.close()
    return
  }
  /*
  const oldConnection = WEBSOCKET_MAP.get(token)
  if (oldConnection) {
    oldConnection.close()
  }*/

  WEBSOCKET_MAP.set(token, ws)

  try {
    const raw = await redis.get('last_players')

    const lastPlayers = raw ? JSON.parse(raw) : []
    const lastCrashes = await REDIS_getLastCrashes()

    const existingPlayer = await REDIS_GetPlayer(token)
    const activePlayers = WEBSOCKET_MAP.size

    if (existingPlayer) {
      //await redis.set(`player:${token}`, existingPlayer)
    } else {
      await REDIS_SetPlayer({ token, internalId: user?.internalId, name: user?.name })
    }

    ws.send(
      JSON.stringify({
        internalId: user?.internalId,
        gameActive: GAME_ACTIVE,
        currentBet: existingPlayer?.bet ?? null,
        balance: user?.balance,
        freespins: user?.freespins,
        activePlayers,
        lastPlayers,
        lastCrashes,
      })
    )
  } catch {}

  ws.on('close', async () => {
    console.log(`❌ disconnect ${token}`)
    WEBSOCKET_MAP.delete(token)
  })

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      if (msg.type === 'bet') {
        try {
          const amount = msg.freebet === true ? undefined : Number(msg.amount || 0)
          await placeBet(msg.APP_TOKEN, amount, msg.freebet)
        } catch {}
      }

      if (msg.type === 'unbet') {
        try {
          await unbet(msg.APP_TOKEN)
        } catch {}
      }
    } catch {}
  })
})

const placeBet = async (token: string, amount?: number, freebet?: boolean) => {
  if (BETTING_DISABLED) return

  const player = await REDIS_GetPlayer(token)
  if (!player || (player.bet && ['pending', 'active'].includes(player.bet.status))) {
    return
  }

  let user: any = null

  // FREEBET
  if (freebet) {
    user = await User.findOneAndUpdate(
      { appToken: token, freespins: { $gte: 1 } },
      {
        $inc: {
          freespins: -1,
          gamesPlayed: 1,
        },
      },
      { new: true }
    )

    if (!user) return

    player.bet = {
      amount: 0.1,
      freebet: true,
      status: 'pending',
      createdAt: new Date(),
    }
  }

  // PAID BET
  else if (amount && amount > 0) {
    user = await User.findOneAndUpdate(
      { appToken: token, balance: { $gte: amount } },
      {
        $inc: {
          balance: -amount,
          gamesPlayed: 1,
        },
      },
      { new: true }
    )

    if (!user) return

    player.bet = {
      amount,
      status: 'pending',
      createdAt: new Date(),
    }
  } else {
    return
  }

  await REDIS_SetPlayer(player)

  try {
    WEBSOCKET_MAP.get(token)?.send(
      JSON.stringify({
        balance: user.balance,
        freespins: user.freespins,
        currentBet: player.bet,
      })
    )
  } catch (e) {
    console.error('WebSocket send failed', e)
  }

  await publisher.publish('LAST_PLAYERS', 'FORM')
}

const unbet = async (token: string) => {
  const player = await REDIS_GetPlayer(token)
  if (!player?.bet) return

  let user: any = null

  // CANCEL PENDING BET
  if (player.bet.status === 'pending') {
    if (player.bet.freebet) {
      user = await User.findOneAndUpdate({ appToken: token }, { $inc: { freespins: 1 } }, { new: true })
    } else {
      user = await User.findOneAndUpdate({ appToken: token }, { $inc: { balance: player.bet.amount } }, { new: true })
    }

    if (!user) return

    player.bet = null
    await REDIS_SetPlayer(player)

    try {
      WEBSOCKET_MAP.get(token)?.send(
        JSON.stringify({
          balance: user.balance,
          freespins: user.freespins,
          currentBet: null,
        })
      )
    } catch (e) {
      console.error('WS send failed', e)
    }
  }

  // FINISH ACTIVE BET
  else if (player.bet.status === 'active' && GAME_ACTIVE) {
    const finalCoeff = COEFF
    const winAmount = +(player.bet.amount * finalCoeff).toFixed(2)

    user = await User.findOneAndUpdate(
      { appToken: token },
      {
        $inc: {
          balance: winAmount,
          totalAmount: winAmount,
        },
      },
      { new: true }
    )

    if (!user) return

    player.bet = {
      ...player.bet,
      status: 'won',
      finalCoeff,
    }

    await REDIS_SetPlayer(player)
    await redis.incrByFloat('TOTAL_PAYOUTS', winAmount)

    const gameId = await redis.get('GAME_ID')

    await BetHistory.insertOne({
      ...player.bet,
      userToken: token,
      gameId,
    })

    await updateBankStats(0, winAmount)

    try {
      WEBSOCKET_MAP.get(token)?.send(
        JSON.stringify({
          balance: user.balance,
          currentBet: player.bet,
        })
      )
    } catch (e) {
      console.error('WS send failed', e)
    }
  }

  await publisher.publish('LAST_PLAYERS', 'FORM')
}

async function BROADCAST(update: any) {
  for (const client of WEBSOCKET_MAP.values()) {
    try {
      client.send(update)
    } catch (err) {
      console.error('Failed to send update:', err)
    }
  }
}

await subscriber.subscribe('CRASH', async (message) => {
  GAME_ACTIVE = false

  const activePlayers = WEBSOCKET_MAP.size
  await BROADCAST(`{"CRASH":${message}, "timeout":${GAME.TIMEOUT * 1000}, "activePlayers":${activePlayers}}`)
})

await subscriber.subscribe('STARTGAME', async (message) => {
  GAME_ACTIVE = true

  const activePlayers = WEBSOCKET_MAP.size
  await BROADCAST(`{"gameActive":true, "activePlayers":${activePlayers}}`)
})

await subscriber.subscribe('LAST_PLAYERS', async (message) => {
  if (message === 'BROADCAST') {
    const lastPlayers = (await redis.get('last_players')) ?? []
    await BROADCAST(`{"lastPlayers":${lastPlayers}}`)
  }
})

await subscriber.subscribe('CURRENT_BETS', async (message) => {
  if (message === 'BROADCAST') {
    for (const [token, ws] of WEBSOCKET_MAP.entries()) {
      const player = await REDIS_GetPlayer(token)
      if (player && player.bet?.status !== 'won') {
        try {
          ws.send(
            JSON.stringify({
              currentBet: player.bet ?? null,
            })
          )
        } catch (err) {
          console.error('Failed to send currentBet update:', err)
          //WEBSOCKET_MAP.delete(token) // если сокет умер, удаляем
        }
      }
    }
  }
})

await subscriber.subscribe('COEFF', async (message) => {
  COEFF = Number(message)
  await BROADCAST(`{"coeff":${message}}`)
})

await subscriber.subscribe('TIMEOUT', async (message) => {
  await BROADCAST(`{"timeout":${message}}`)
})

console.log('Подписчик запущен, ожидаем сообщения...')

server.listen(PORT, async () => {
  console.log(`🚀 SERVER running on :${PORT}`)
})
