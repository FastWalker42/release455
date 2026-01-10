export type Bet = {
  amount: number
  freebet?: boolean
  status: 'pending' | 'active' | 'won' | 'lost'
  createdAt?: Date
  finalCoeff?: number
  gameId?: string
}

export interface Player {
  token: string
  internalId: string
  name: string
  bet?: Bet | null
}

export type LastPlayer = {
  name: string
  bet: Bet
  internalId: string
}

export interface IBank {
  totalStakes: number
  totalPayouts: number
}
