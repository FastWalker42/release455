export type AvailableAssets = 'USDT' | 'TON' | 'BTC' | 'ETH' | 'LTC' | 'BNB' | 'TRX' | 'USDC'

type Fiat =
  | 'USD'
  | 'EUR'
  | 'RUB'
  | 'BYN'
  | 'UAH'
  | 'GBP'
  | 'CNY'
  | 'KZT'
  | 'UZS'
  | 'GEL'
  | 'TRY'
  | 'AMD'
  | 'THB'
  | 'INR'
  | 'BRL'
  | 'IDR'
  | 'AZN'
  | 'AED'
  | 'PLN'
  | 'ILS'

type CurrencyType = 'crypto' | 'fiat'

type PaidButtonName = 'viewItem' | 'openChannel' | 'openBot' | 'callback'

export interface CryptoBotInvoiceParams {
  currency_type?: CurrencyType
  asset?: AvailableAssets
  fiat?: Fiat
  accepted_assets?: string // comma-separated assets
  amount: number
  description?: string
  hidden_message?: string
  paid_btn_name?: PaidButtonName
  paid_btn_url?: string
  payload?: string
  allow_comments?: boolean
  allow_anonymous?: boolean
  expires_in?: number
}

export interface CryptoBotInvoice {
  invoice_id: number
  hash: string
  currency_type: CurrencyType
  asset?: AvailableAssets
  fiat?: Fiat
  amount: number
  paid_asset?: AvailableAssets
  paid_amount?: string
  paid_fiat_rate?: string
  accepted_assets?: string
  fee_asset?: AvailableAssets
  fee_amount?: number
  fee?: string // deprecated
  pay_url?: string // deprecated
  bot_invoice_url: string
  mini_app_invoice_url: string
  web_app_invoice_url: string
  description?: string
  status: 'active' | 'paid' | 'expired'
  created_at: string
  paid_usd_rate?: string
  usd_rate?: string // deprecated
  allow_comments: boolean
  allow_anonymous: boolean
  expiration_date?: string
  paid_at?: string
  paid_anonymously?: boolean
  comment?: string
  hidden_message?: string
  payload?: string
  paid_btn_name?: PaidButtonName
  paid_btn_url?: string
}

export interface CryptoBotCheckParams {
  asset: AvailableAssets
  amount: string
  pin_to_user_id?: number
  pin_to_username?: string
}

export interface CryptoBotCheck {
  check_id: number // Unique ID for this check
  hash: string // Hash of the check
  asset: AvailableAssets
  amount: string // Amount in float (string)
  bot_check_url: string // URL to activate the check
  status: 'active' | 'activated' // Status
  created_at: string // ISO date string
  activated_at: string // ISO date string
}
