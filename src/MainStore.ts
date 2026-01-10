import { create } from 'zustand'
import { APP_TOKEN } from './config'
import { DOMAIN } from '../CONFIG.json'

type Bet = null | {
  status: 'pending' | 'active' | 'won' | 'lost' | 'none'
  amount?: number
  testAmount?: number
  finalCoeff?: number
  gameId?: string
}

type Players = Array<{ name: string; bet: Bet; internalId: string }>

type ServerState = {
  CRASH?: number
  gameActive: boolean
  coeff: number
  currentBet: Bet
  lastCrashes?: number[]
  lastPlayers?: Players
  activePlayers?: number
}

type RefsInfo = { refsCount: number; refTotalMoney: number; refLevel: number; refPercent: number }

type Page = 'game' | 'rating' | 'profile' | 'freespin'

type RocketAnim = 'ignite' | 'fly' | 'boom' | 'reload' | 'static'

type Store = {
  page: Page
  setPage: (page: Page) => void
  // Серверные данные
  serverCoeff: number
  serverTimeout: number
  gameActive: boolean

  GAME_STOPPED: boolean
  lastUpdateTime: number

  // Локально вычисляемые данные
  coeff: number
  timeout: number

  moneyAnim: boolean
  setMoneyAnim: (moneyAnim: boolean) => void

  rocketAnim: RocketAnim
  setRocketAnim: (rocketAnim: RocketAnim) => void
  uiOptions: { enabled: boolean; winEffect: boolean }
  freebetSelected: boolean
  setFreespin: (freebetSelected: boolean) => void

  activePlayers: number
  balance: number
  freespins: number
  claimFreespins: () => void

  internalId: string | null

  lastCrashes: number[]
  lastPlayers: Players
  currentBet: Bet

  ratingUsers: Array<{ name: string; totalAmount: number; gamesPlayed: number; isYou?: boolean; photoUrl: string }>

  refsInfo: RefsInfo
  setRefsInfo: (refsInfo: RefsInfo) => void

  // WebSocket состояние
  ws: WebSocket | null
  isConnected: boolean
  reconnectAttempts: number
  isConnecting: boolean
  reconnectTimer: ReturnType<typeof setTimeout> | null

  popWindow: undefined | 'bet' | 'topup' | 'cashout'
  openBetWindow: () => void
  openTopupWindow: () => void
  openCashoutWindow: () => void
  closeAllWindows: () => void

  bet: (amount: number) => void
  unbet: () => void

  fetchRatingUsers: () => void

  updateFromServer: (data: Partial<ServerState>) => void
  connectWebSocket: () => void
  disconnectWebSocket: () => void
  cleanupWebSocket: () => void
}

const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_INTERVAL = 3000

const useMainStore = create<Store>()((set, get) => ({
  page: 'game',
  setPage: (page: Page) => set({ page }),
  // Серверные данные
  serverCoeff: 1,
  serverTimeout: 0,
  gameActive: false,

  GAME_STOPPED: false,
  lastUpdateTime: Date.now(),

  // Локальные данные
  coeff: 1,
  timeout: 0,

  moneyAnim: false,
  setMoneyAnim: (moneyAnim) => {
    set({ moneyAnim })
  },

  rocketAnim: 'static',
  setRocketAnim: (rocketAnim: RocketAnim) => set({ rocketAnim }),
  uiOptions: { enabled: true, winEffect: false },
  freebetSelected: false,
  setFreespin: (freebetSelected: boolean) => {
    set({ freebetSelected })
  },

  activePlayers: 0,
  balance: 0,
  freespins: 0,
  claimFreespins: () => {
    fetch(`https://${DOMAIN}/claimFreespin?token=${APP_TOKEN}`)
      .then((r) => r.json())
      .then((data) => set({ freespins: data.freespins }))
  },

  internalId: null,

  lastCrashes: [],
  lastPlayers: [],
  currentBet: null,

  ratingUsers: [],

  refsInfo: { refsCount: 0, refTotalMoney: 0, refLevel: 1, refPercent: 0.025 },
  setRefsInfo: (refsInfo: RefsInfo) => {
    set({ refsInfo })
  },

  // WebSocket состояние
  ws: null,
  isConnected: false,
  reconnectAttempts: 0,
  isConnecting: false,
  reconnectTimer: null,

  popWindow: undefined,
  openBetWindow: () => set({ popWindow: 'bet' }),
  openTopupWindow: () => set({ popWindow: 'topup' }),
  openCashoutWindow: () => set({ popWindow: 'cashout' }),
  closeAllWindows: () => set({ popWindow: undefined }),

  bet: (amount: number) => {
    const { ws, isConnected, freebetSelected } = get()
    if (ws && isConnected) {
      if (freebetSelected) {
        ws.send(JSON.stringify({ type: 'bet', freebet: true, APP_TOKEN }))
      } else {
        ws.send(JSON.stringify({ type: 'bet', amount, APP_TOKEN }))
      }
      set({ popWindow: undefined })
      const state = get()

      if (freebetSelected) {
        if (state.freespins >= 1) set({ freespins: state.freespins - 1 })
      } else {
        if (state.balance >= amount) set({ balance: state.balance - amount })
      }
    } else {
      console.warn('WebSocket not connected, cannot place bet')
    }
  },

  unbet: () => {
    const { ws, isConnected } = get()
    if (ws && isConnected) {
      ws.send(JSON.stringify({ type: 'unbet', APP_TOKEN }))
      set({ popWindow: undefined })
    } else {
      console.warn('WebSocket not connected, cannot unbet')
    }
  },

  fetchRatingUsers: () => {
    fetch(`https://${DOMAIN}/rating?token=${APP_TOKEN}`)
      .then((r) => r.json())
      .then((data) => set({ ratingUsers: data }))
  },

  updateFromServer: (data: Partial<ServerState>) => {
    set(data)
    if (data.CRASH) {
      set({ gameActive: false, coeff: 1.0, lastCrashes: [data.CRASH, ...get().lastCrashes].slice(0, 9) })
    }
    if (data.currentBet?.status === 'won') {
      set({ moneyAnim: true })
    }
  },

  connectWebSocket: () => {
    const { isConnecting, reconnectAttempts, ws } = get()

    // Если уже подключаемся или подключены, не создаем новое подключение
    if (isConnecting || ws || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return
    }

    set({ isConnecting: true })

    try {
      const newWs = new WebSocket(`wss://${DOMAIN}/ws/?token=${APP_TOKEN}`)

      newWs.onopen = () => {
        console.log('WebSocket connected')
        set({
          isConnected: true,
          isConnecting: false,
          reconnectAttempts: 0,
          reconnectTimer: null,
        })
      }

      newWs.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        const { reconnectAttempts, reconnectTimer } = get()

        // Очищаем старый таймер
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
        }

        set({
          isConnected: false,
          isConnecting: false,
          ws: null,
        })

        // Пытаемся переподключиться если не превышен лимит
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          const timer = setTimeout(() => {
            const currentAttempts = get().reconnectAttempts
            set({ reconnectAttempts: currentAttempts + 1 })
            get().connectWebSocket()
          }, RECONNECT_INTERVAL)

          set({ reconnectTimer: timer })
        }
      }

      newWs.onerror = (error) => {
        console.error('WebSocket error:', error)
        set({ isConnecting: false })
      }

      newWs.onmessage = (event) => {
        try {
          const data: ServerState = JSON.parse(event.data)
          get().updateFromServer(data)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      set({ ws: newWs })
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      set({ isConnecting: false })

      // Пытаемся переподключиться при ошибке создания
      const timer = setTimeout(() => {
        const currentAttempts = get().reconnectAttempts
        set({ reconnectAttempts: currentAttempts + 1 })
        get().connectWebSocket()
      }, RECONNECT_INTERVAL)

      set({ reconnectTimer: timer })
    }
  },

  disconnectWebSocket: () => {
    const { ws, reconnectTimer } = get()
    if (ws) {
      ws.close()
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }

    set({
      ws: null,
      isConnected: false,
      isConnecting: false,
      reconnectAttempts: 0,
      reconnectTimer: null,
    })
  },

  cleanupWebSocket: () => {
    const { ws, reconnectTimer } = get()
    if (ws) {
      ws.onclose = null
      ws.onerror = null
      ws.onmessage = null
      ws.close()
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
    }
  },
}))

export default useMainStore
