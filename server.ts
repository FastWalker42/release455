import { v4 as uuidv4 } from 'uuid'
import { Game, User, Bank, BetHistory } from './db'
import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'

import { REF_LEVELS } from './config'
import app from './app'
import { Writable } from 'stream'

const PORT = 3000
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

const TARGET_RTP = 0.935 // 93.5%
const MIN_RTP = 0.85 // Минимальный RTP перед компенсацией
const MAX_RTP = 0.98 // Максимальный RTP
const AUTO_CRASH_CHANCE = 0.02 // 2% шанс автовзрыва на 1x
const MIN_CRASH_MULTIPLIER = 1.1
const MAX_CRASH_MULTIPLIER = 15.0

// Настройки роста ракеты
const BASE_GROWTH_SPEED = 0.08 // Базовая скорость роста (x в секунду)
const GROWTH_ACCELERATION = 1.15 // Экспоненциальное ускорение (чем выше, тем быстрее рост на больших множителях)
const MIN_GAME_DURATION = 3000 // Минимальная длительность игры (мс)
const MAX_GAME_DURATION = 20000 // Максимальная длительность игры (мс)

// Настройки расчета краша
const BASE_MULTIPLIER = 3.5 // Базовый множитель для расчета краша
const RTP_CORRECTION_STRENGTH = 1.8 // Сила корректировки по RTP
const PLAYER_COUNT_CORRECTION = 0.02 // Влияние количества игроков
const STAKE_SIZE_CORRECTION = 0.005 // Влияние размера ставок
const RANDOM_VARIATION_MIN = 0.6
const RANDOM_VARIATION_MAX = 1.4

/* ------------------- ИГРА ------------------- */
type GameState = {
  id: string
  active: boolean
  startTime: number
  duration: number
  currentCoeff: number
  crashCoeff: number
  timer?: NodeJS.Timeout
  coeffInterval?: NodeJS.Timeout
  growthAcceleration: number
}

let currentGame: GameState | null = null
let nextGameStartAt: number | null = null
const TIME_BETWEEN_GAMES = 5000
let lastCrashes: number[] = []

type Bet = {
  amount: number
  status: 'pending' | 'active' | 'won' | 'lost'
  createdAt?: Date

  finalCoeff?: number
  gameId?: string
}

interface Client {
  ws: WebSocket
  token: string
  internalId: string
  name: string
  bet?: Bet | null
}

const CLIENTS: Map<string, Client> = new Map() // Ключ: token
const LAST_BETS: Record<string, number> = {}
let LAST_PLAYERS: { name: string; bet: Bet; internalId: string }[] = []

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url ?? '', `https://${req.headers.host}`)
  const token = url.searchParams.get('token')
  if (!token) {
    ws.close()
    return
  }
  let user = await User.findOne({ appToken: token })
  if (!user) return

  const existing = CLIENTS.get(token)
  if (existing) {
    try {
      existing.ws.close()
    } catch {}
    CLIENTS.set(token, { ...existing, ws })
  } else {
    CLIENTS.set(token, { ws, token, internalId: user?.internalId, name: user?.name })
  }

  try {
    ws.send(JSON.stringify({ gameActive: !!currentGame?.active, balance: user?.balance, lastCrashes: lastCrashes }))
  } catch {}

  console.log(`new connection`)

  ws.on('close', () => {
    console.log(`❌ disconnect`)
  })

  ws.on('message', async (raw) => {
    try {
      const msg = JSON.parse(raw.toString())

      if (msg.type === 'bet') {
        try {
          await placeBet(token, Number(msg.amount))
        } catch {}
      }

      if (msg.type === 'unbet') {
        try {
          await unbet(token)
        } catch {}
      }
    } catch {}
  })
})

function BROADCAST() {
  //let timeout = !currentGame?.active && nextGameStartAt ? Math.max(0, nextGameStartAt - Date.now()) : 0

  const playersJson = JSON.stringify(LAST_PLAYERS)
  for (const client of CLIENTS.values()) {
    try {
      client.ws.send(`{"coeff":${currentGame?.currentCoeff},"lastPlayers":${playersJson}}`)
    } catch {}
  }
}

function FORM_LAST_PLAYERS() {
  const top10Keys: string[] = Object.entries(LAST_BETS)
    .sort(([, a], [, b]) => b - a) // сортировка по значению по убыванию
    .slice(0, 10) // берём первые 10
    .map(([key]) => key) // извлекаем только ключи

  const top10Users: { name: string; bet: Bet; internalId: string }[] = []

  top10Keys.map((key) => {
    const user = CLIENTS.get(key)
    if (user) {
      const { name, bet, internalId } = user
      if (!bet) return
      top10Users.push({ name, bet, internalId })
    }
  })

  LAST_PLAYERS = top10Users
}

function PING() {
  for (const client of CLIENTS.values()) {
    try {
      client.ws.ping()
    } catch {}
  }
}

setInterval(PING, 30000)
setInterval(FORM_LAST_PLAYERS, 100)

/* ---------------- BANK MANAGEMENT ---------------- */
const getBankState = async (): Promise<any> => {
  let bank = await Bank.findOne({ id: 'singleton' })
  if (!bank) {
    bank = await Bank.create({
      id: 'singleton',
      balance: 0,
      totalStakes: 0,
      totalPayouts: 0,
      currentRTP: 0,
    })
  }
  return bank
}

const updateBankStats = async (stakeAmount: number, payoutAmount: number) => {
  const bank = await getBankState()

  bank.totalStakes += stakeAmount
  bank.totalPayouts += payoutAmount
  bank.balance += stakeAmount - payoutAmount

  bank.currentRTP = bank.totalStakes > 0 ? bank.totalPayouts / bank.totalStakes : 0
  bank.updatedAt = new Date()

  await bank.save()
  return bank
}

const calculateDynamicCrashPoint = async (activeBets: any[]): Promise<number> => {
  const bank = await getBankState()
  const totalStake = activeBets.reduce((sum, bet) => sum + bet.amount, 0)
  let rtpAdjustment = 1
  if (bank.currentRTP < MIN_RTP) {
    const rtpDiff = MIN_RTP - bank.currentRTP
    rtpAdjustment = 1 + rtpDiff * RTP_CORRECTION_STRENGTH
  } else if (bank.currentRTP > MAX_RTP) {
    const rtpDiff = bank.currentRTP - MAX_RTP
    rtpAdjustment = 1 - rtpDiff * RTP_CORRECTION_STRENGTH * 0.5
  }
  let stakeAdjustment = 1
  if (activeBets.length > 0) {
    const avgStake = totalStake / activeBets.length
    const playerCountAdjustment = Math.max(0.7, 1 - activeBets.length * PLAYER_COUNT_CORRECTION)
    const stakeSizeAdjustment = avgStake > 100 ? 0.85 : avgStake > 50 ? 0.9 : avgStake > 20 ? 0.95 : 1.0
    stakeAdjustment = playerCountAdjustment * stakeSizeAdjustment
  }
  if (Math.random() < AUTO_CRASH_CHANCE) {
    console.log('🎲 Автовзрыв на 1x активирован')
    return 1.0
  }
  let crashPoint = BASE_MULTIPLIER * rtpAdjustment * stakeAdjustment
  const randomVariation = RANDOM_VARIATION_MIN + Math.random() * (RANDOM_VARIATION_MAX - RANDOM_VARIATION_MIN)
  crashPoint *= randomVariation
  crashPoint = Math.max(MIN_CRASH_MULTIPLIER, Math.min(MAX_CRASH_MULTIPLIER, crashPoint))
  console.log(
    `🏦 RTP: ${(bank.currentRTP * 100).toFixed(2)}% | Ставок: ${
      activeBets.length
    } | Сумма: ${totalStake} | RTP кор: ${rtpAdjustment.toFixed(2)} | Ставка кор: ${stakeAdjustment.toFixed(
      2
    )} | Краш: ${crashPoint.toFixed(2)}x`
  )
  return +crashPoint.toFixed(2)
}

/* ---------------- GAME LOOP ---------------- */
const calculateCoefficient = (progress: number, crashCoeff: number, acceleration: number): number => {
  // Экспоненциальный рост: чем больше прогресс, тем быстрее растет коэффициент
  if (acceleration > 1) {
    // Экспоненциальная функция с ускорением
    const exponent = Math.pow(progress, 1 / acceleration)
    return 1 + (crashCoeff - 1) * exponent
  }
  // Линейный рост (если acceleration = 1)
  return 1 + (crashCoeff - 1) * progress
}

const startGame = async () => {
  const id = uuidv4()

  try {
    const pendingBets = Array.from(CLIENTS.values())
      .map((client) => client.bet)
      .filter(
        (bet): bet is Bet => !!bet && bet?.status === 'pending' && typeof bet?.amount === 'number' && bet.amount > 0
      )

    const crashCoeff = await calculateDynamicCrashPoint(pendingBets)

    const startTime = Date.now()

    await Game.create({
      id,
      active: true,
      crashCoeff,
      startTime: new Date(startTime),
    })

    let totalStake = 0

    for (const client of CLIENTS.values()) {
      if (client?.bet?.status === 'pending') {
        client.bet.gameId = id
        client.bet.status = 'active'
        CLIENTS.set(client.token, client)
      } else {
        client.bet = null
        CLIENTS.set(client.token, client)
        delete LAST_BETS[client.token]
      }
      client?.bet?.amount && (totalStake += client?.bet?.amount)
      try {
        client.ws.send(JSON.stringify({ gameActive: true, currentBet: client?.bet }))
      } catch {}
    }

    // Обновляем статистику банка с новыми ставками
    if (totalStake > 0) {
      await updateBankStats(totalStake, 0)
    }

    // Расчет длительности игры с экспоненциальным ускорением
    // Базовое время растет медленнее на высоких множителях
    const baseDuration = ((crashCoeff - 1) / BASE_GROWTH_SPEED) * 1000
    // Экспоненциальное уменьшение времени на высоких множителях
    const accelerationFactor = Math.pow(GROWTH_ACCELERATION, Math.min(crashCoeff / 10, 2))
    const duration = Math.max(MIN_GAME_DURATION, Math.min(MAX_GAME_DURATION, baseDuration / accelerationFactor))

    currentGame = {
      id,
      active: true,
      startTime,
      duration,
      currentCoeff: 1.0,
      crashCoeff,
      growthAcceleration: GROWTH_ACCELERATION,
    }

    currentGame.coeffInterval = setInterval(() => {
      if (!currentGame?.active) return

      const elapsed = Date.now() - currentGame.startTime
      const progress = Math.min(elapsed / currentGame.duration, 1)

      // Экспоненциальный рост коэффициента
      currentGame.currentCoeff = calculateCoefficient(progress, currentGame.crashCoeff, currentGame.growthAcceleration)
      currentGame.currentCoeff = +Math.min(currentGame.currentCoeff, currentGame.crashCoeff).toFixed(2)
      BROADCAST()
    }, 100)

    currentGame.timer = setTimeout(endGame, duration)
  } catch (err) {
    console.error('Ошибка запуска игры:', err)
    nextGameStartAt = Date.now() + TIME_BETWEEN_GAMES
    setTimeout(startGame, TIME_BETWEEN_GAMES)
  }
}

const endGame = async () => {
  if (!currentGame?.active) return

  const finalCoeff = currentGame.crashCoeff

  if (currentGame.coeffInterval) clearInterval(currentGame.coeffInterval)
  if (currentGame.timer) clearTimeout(currentGame.timer)

  try {
    await Game.updateOne(
      { id: currentGame.id },
      {
        active: false,
        crashCoeff: finalCoeff,
        endTime: new Date(),
      }
    )

    let totalStake = 0
    let totalPayout = 0

    for (const client of CLIENTS.values()) {
      if (client?.bet?.status === 'active') {
        totalStake += client?.bet?.amount

        if (finalCoeff === 1.0) {
          client.bet.status = 'lost'
          client.bet.finalCoeff = finalCoeff
          CLIENTS.set(client.token, client)

          await BetHistory.insertOne({ ...client.bet, userToken: client.token, status: 'lost', finalCoeff })
        } else {
          client.bet.status = 'lost'
          client.bet.finalCoeff = finalCoeff
          CLIENTS.set(client.token, client)

          await BetHistory.insertOne({ ...client.bet, userToken: client.token, status: 'lost', finalCoeff })

          // Начисляем реферальные бонусы проигравшим
          const loser = await User.findOne({ appToken: client.token })
          if (loser?.invited_by) {
            const invitor = await User.findOne({ id: loser.invited_by })
            if (invitor) {
              const refBonus = client.bet.amount * REF_LEVELS[invitor.refLevel as keyof typeof REF_LEVELS]
              await User.updateOne(
                { id: invitor.id },
                {
                  $inc: {
                    balance: refBonus,
                    refTotalMoney: refBonus,
                  },
                }
              )
            }
          }
        }
      }

      try {
        client.ws.send(JSON.stringify({ CRASH: finalCoeff, currentBet: client.bet, lastPlayers: LAST_PLAYERS }))
      } catch {}
    }

    // Обновляем статистику банка
    if (totalStake > 0 || totalPayout > 0) {
      await updateBankStats(0, totalPayout)
    }

    currentGame.active = false
    lastCrashes.unshift(finalCoeff)
    if (lastCrashes.length > 10) lastCrashes = lastCrashes.slice(0, 10)

    nextGameStartAt = Date.now() + TIME_BETWEEN_GAMES
    setTimeout(startGame, TIME_BETWEEN_GAMES)
  } catch (err) {
    console.error('Ошибка завершения игры:', err)
    nextGameStartAt = Date.now() + TIME_BETWEEN_GAMES
    setTimeout(startGame, TIME_BETWEEN_GAMES)
  }
}

/* ---------------- ACTIONS (WS) ---------------- */
const placeBet = async (token: string, amount: number) => {
  if (amount <= 0) return

  const client = CLIENTS.get(token)
  if (client?.bet && ['pending', 'active'].includes(client?.bet?.status)) {
    return
  }
  if (!client) return

  const user = await User.findOneAndUpdate(
    {
      appToken: token,
      balance: { $gte: amount }, // баланса хватает
      // можно добавить поле like "hasPendingBet: false", если введёшь его
    },
    {
      $inc: {
        balance: -amount,
        gamesPlayed: 1,
      },
    },
    { new: true } // возвращаем обновлённый документ
  )

  if (!user) {
    return // не хватило баланса или пользователь не найден
  }

  client.bet = { amount, status: 'pending' }
  CLIENTS.set(client.token, client)
  LAST_BETS[client.token] = amount

  try {
    client.ws.send(JSON.stringify({ balance: user.balance, currentBet: client.bet }))
  } catch {}
}

const unbet = async (token: string) => {
  const client = CLIENTS.get(token)
  if (!client || !client.bet) {
    return
  }
  if (client.bet.status === 'pending') {
    const user = await User.findOneAndUpdate(
      { appToken: token },
      { $inc: { balance: client.bet.amount } },
      { new: true }
    )
    if (!user) {
      return
    }
    client.bet = null
    CLIENTS.set(token, client)
    delete LAST_BETS[client.token]

    try {
      client.ws.send(JSON.stringify({ balance: user.balance, currentBet: client.bet }))
    } catch {}
  } else if (client.bet?.status === 'active' && currentGame?.active) {
    const finalCoeff = +currentGame.currentCoeff.toFixed(2)
    const winAmount = +(client.bet.amount * finalCoeff).toFixed(2)
    // Атомарно начисляем выигрыш
    const user = await User.findOneAndUpdate({ appToken: token }, { $inc: { balance: winAmount } }, { new: true })
    if (!user) return
    client.bet.status = 'won'
    client.bet.finalCoeff = finalCoeff
    CLIENTS.set(token, client)

    await BetHistory.insertOne({
      ...client.bet,
      userToken: token,
      finalCoeff,
      status: 'won',
    })
    await updateBankStats(0, winAmount)
    try {
      client.ws.send(JSON.stringify({ balance: user.balance, currentBet: client.bet }))
    } catch {}
  }
}

server.listen(PORT, () => {
  console.log(`🚀 WebSocket + API running on :${PORT}`)
  console.log(`🎯 Target RTP: ${(TARGET_RTP * 100).toFixed(2)}%`)
  console.log(`📈 Max crash multiplier: ${MAX_CRASH_MULTIPLIER}x`)
  console.log(`⚡ Growth acceleration: ${GROWTH_ACCELERATION}`)
  console.log(`🐢 Base growth speed: ${BASE_GROWTH_SPEED}x/sec`)
  startGame()
})
