import CONFIG from '../../CONFIG.json'
import { CryptoBotCheck, CryptoBotCheckParams, CryptoBotInvoice, CryptoBotInvoiceParams } from './types'

const BASE_URL = 'https://pay.crypt.bot/api'

const fetchCryptoBot = async (endpoint: string, options?: RequestInit) => {
  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Crypto-Pay-API-Token': CONFIG.CRYPTOBOT.API_KEY,
    },
    ...options,
  })

  const json = await res.json()
  if (!json.ok) {
    console.error('CryptoBot API error payload:', json)
    throw new Error('CryptoBot API error')
  }

  return json.result
}

export const cryptoBotGetMe = async () => {
  return fetchCryptoBot('getMe')
}

export const cryptoBotGetBalance = async () => {
  return fetchCryptoBot('getBalance')
}

export const cryptoBotInvoice = async (params: CryptoBotInvoiceParams): Promise<CryptoBotInvoice> => {
  const res = fetchCryptoBot('createInvoice', {
    method: 'POST',
    body: JSON.stringify(params),
  })

  return res
}

export const cryptoBotCheckInvoice = async (invoice_id: number) => {
  const res: { items: CryptoBotInvoice[] } = await fetchCryptoBot('getInvoices')
  const foundInvoice = res.items.find((inv) => inv.invoice_id === invoice_id)
  return foundInvoice
}

export const deleteInvoice = (invoice_id: number | string) => {
  const res = fetchCryptoBot('deleteInvoice', {
    method: 'POST',
    body: JSON.stringify({ invoice_id: invoice_id }),
  })
  console.log('удален')
  return res
}

export const tonToUsd = async (tonAmount: number): Promise<number> => {
  const response = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=usd')
  const data: any = await response.json()

  const tonUsdRate = Number(data.rates.TON.prices.USD) // USD за 1 TON
  return tonAmount * tonUsdRate
}

export const invoiceInTON = async (invoice: CryptoBotInvoice): Promise<number> => {
  // Если платёж уже в TON — просто возвращаем
  if (invoice.paid_asset === 'TON') {
    return Number(invoice.paid_amount)
  }

  const paidAmount = Number(invoice.paid_amount) // количество крипты
  const usdRate = Number(invoice.paid_usd_rate) // курс крипты к USD
  const paidUsd = paidAmount * usdRate // сумма в USD

  const tonUsd = await tonToUsd(1)

  return paidUsd / tonUsd
}

export const cryptoBotCreateCheck = async (params: CryptoBotCheckParams): Promise<CryptoBotCheck> => {
  const res = fetchCryptoBot('createCheck', {
    method: 'POST',
    body: JSON.stringify(params),
  })

  return res
}

export const findAssetForTonWithdraw = async (requiredTon: number) => {
  // 1. Загружаем балансы
  const balances: Array<{ currency_code: string; available: string }> = await cryptoBotGetBalance()

  // 2. Курс TON/USD
  const ratesRes = await fetch('https://tonapi.io/v2/rates?tokens=ton&currencies=usd')
  const ratesJson = await ratesRes.json()
  const tonUsdRate = Number(ratesJson.rates.TON.prices.USD)
  if (!tonUsdRate) throw new Error('Не удалось получить курс TON')

  // ============================
  // 3. Проверяем TON напрямую
  // ============================
  const tonBalance = balances.find((b) => b.currency_code === 'TON')
  if (tonBalance) {
    const availableTon = Number(tonBalance.available)

    if (availableTon >= requiredTon) {
      return {
        currency: 'TON',
        available: requiredTon, // ← РОВНО необходимая сумма
        availableInTon: requiredTon, // ← РОВНО необходимая сумма в TON
      }
    }
  }

  // ============================
  // 4. Проверяем остальные crypto
  // ============================
  for (const bal of balances) {
    const currency = bal.currency_code
    const walletAvailable = Number(bal.available)

    // ненужные токены
    if (walletAvailable <= 0) continue
    if (currency === 'TON') continue
    if (currency === 'SEND' || currency === 'JET' || currency === 'DOGE') continue

    // crypto → USD
    const rateRes = await fetch(`https://tonapi.io/v2/rates?tokens=${currency.toLowerCase()}&currencies=usd`)
    const rateJson = await rateRes.json()
    const cryptoUsdRate = rateJson?.rates?.[currency]?.prices?.USD
    if (!cryptoUsdRate) continue

    // сколько USD нужно для requiredTon
    const requiredUsd = requiredTon * tonUsdRate

    // сколько этой крипты нужно
    const requiredCrypto = requiredUsd / cryptoUsdRate

    // хватает ли баланса
    if (walletAvailable >= requiredCrypto) {
      return {
        currency,
        available: requiredCrypto, // ← ровно необходимое количество крипты
        availableInTon: requiredTon, // ← ровно необходимое в TON
      }
    }
  }

  throw new Error(`Недостаточно средств для вывода ${requiredTon} TON`)
}
