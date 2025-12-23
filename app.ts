import express, { Request, Response } from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { Game, User, Bank, BetHistory } from './db'

import bot from './bot'
import { DOMAIN, BOT_TOKEN_PROD, CRYPTOBOT } from './CONFIG.json'
import { addUserBalance } from './db/methods'
import { createHash, createHmac, randomUUID } from 'crypto'
import { REF_LEVELS } from './config'
import {
  cryptoBotCreateCheck,
  cryptoBotInvoice,
  deleteInvoice,
  findAssetForTonWithdraw,
  invoiceInTON,
} from './api/cryptobot'
import { AvailableAssets, CryptoBotInvoice } from './api/cryptobot/types'
import { InlineKeyboard } from 'grammy'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  next()
})

/* ------------------- КОНСТАНТЫ RTP И РОСТА ------------------- */

/* ---------------- STATIC FILES & ROUTES ---------------- */
const DIST_DIR = path.join(__dirname, 'dist')

app.get('/photo/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params

  const user = await User.findOne({ internalId: userId })

  if (!user || !user.profilePhoto) {
    return res.redirect(`https://${DOMAIN}/anon.webp`)
  }

  res.set({
    'Content-Type': 'image/jpeg',
    'Content-Length': user.profilePhoto.length,
    'Cache-Control': 'public, max-age=3600',
  })

  res.send(user.profilePhoto)
})

app.get('/prepmsg/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params

  const preparedMsg = await bot.api.savePreparedInlineMessage(
    Number(userId),
    {
      type: 'photo',
      id: randomUUID(),
      photo_url: 'https://i.ibb.co/6cbnrybn/IMG-3426.jpg',
      thumbnail_url: 'https://i.ibb.co/6cbnrybn/IMG-3426.jpg',
      reply_markup: new InlineKeyboard().url('🚀 Вперёд!', `https://t.me/CrystallJet_bot?start=${userId}`),
    },
    { allow_user_chats: true, allow_group_chats: true }
  )

  res.send(preparedMsg)
})

app.get('/rating', async (req: Request, res: Response) => {
  const { token } = req.query

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token is required' })
  }

  try {
    const rUser = await User.findOne({ appToken: token }).lean()
    const users = await User.find().sort({ totalAmount: -1 }).limit(100).lean()

    let topUsers = users

    if (rUser && !users.some((u) => u.appToken === rUser.appToken)) {
      topUsers = [...users, rUser]
    }

    const response: any[] = []
    topUsers.map((user) =>
      response.push({
        name: user?.name,
        totalAmount: user?.totalAmount || 0,
        gamesPlayed: user?.gamesPlayed || 0,
        isYou: rUser && user.appToken === rUser.appToken,
        photoUrl: user?.internalId ? `https://${DOMAIN}/photo/${user.internalId}` : `https://${DOMAIN}/anon.webp`,
      })
    )

    res.json(response)
  } catch (error) {
    console.error('Error getting top users:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/cryptoBotTopup', async (req: Request, res: Response) => {
  const { token, amount, currency } = req.query

  if (!token || !amount || !currency) {
    return res.status(400).json({ error: 'Bad parameters' })
  }

  try {
    const invoice = await cryptoBotInvoice({
      currency_type: 'crypto',
      asset: currency as AvailableAssets,
      amount: Number(amount),
    })
    const user = await User.findOneAndUpdate({ appToken: token }, { $set: { invoiceId: invoice.invoice_id } })
    try {
      user?.invoiceId && (await deleteInvoice(user?.invoiceId))
    } catch {
      console.log('Старого инвойса не было')
    }

    res.json({ ok: true, link: invoice.pay_url })
  } catch (error) {
    console.error('Error getting top users:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/cryptoBotCashout', async (req: Request, res: Response) => {
  const { token, tonAmount } = req.query

  if (!token || !tonAmount) {
    return res.status(400).json({ error: 'Bad parameters' })
  }

  const requiredTon = Number(tonAmount)
  if (isNaN(requiredTon) || requiredTon <= 0) {
    return res.status(400).json({ error: 'Invalid tonAmount' })
  }

  try {
    const user = await User.findOne({ appToken: token })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    if (user.balance < requiredTon) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const toWithdraw = await findAssetForTonWithdraw(requiredTon)
    const check = await cryptoBotCreateCheck({
      asset: toWithdraw.currency as AvailableAssets,
      amount: String(toWithdraw.available),
    })
    await User.updateOne({ appToken: token }, { $inc: { balance: -toWithdraw.availableInTon } })

    res.json({ ok: true, link: check.bot_check_url })
  } catch (error) {
    console.error('Error in cryptoBotCashout:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/refsInfo', async (req: Request, res: Response) => {
  const { token } = req.query
  const user = await User.findOne({ appToken: token })
  res.json({
    refsCount: user?.refsCount,
    refTotalMoney: user?.refTotalMoney,
    refLevel: user?.refLevel,
    refPercent: REF_LEVELS[user?.refLevel as keyof typeof REF_LEVELS],
  })
})

// CSS и JS из /assets
app.use('/assets', express.static(path.join(DIST_DIR, 'assets')))

// Все остальные статические файлы из корневой директории
app.use(express.static(DIST_DIR))

// Обработка корневого пути - отдаем index.html
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

const WEBHOOK_PATH = `/webhook/${BOT_TOKEN_PROD}`

const IS_PROD_MODE = process.env.CONFIG_ENV === 'prod'
if (IS_PROD_MODE) {
  bot.api.setWebhook(`https://${DOMAIN}${WEBHOOK_PATH}`, {
    drop_pending_updates: true,
  })
} else {
  bot.api.deleteWebhook({
    drop_pending_updates: true,
  })
}

app.use(express.json())
app.post(WEBHOOK_PATH, async (req, res) => {
  try {
    await bot.handleUpdate(req.body)
  } catch (err) {
    console.warn('Ошибка при обработке апдейта:', (err as Error).message)
  }
  res.sendStatus(200)
})

const checkSignature = (token: string, body: any, headers: any) => {
  const secret = createHash('sha256').update(token).digest()
  const checkString = JSON.stringify(body)
  const hmac = createHmac('sha256', secret).update(checkString).digest('hex')
  return hmac === headers['crypto-pay-api-signature']
}

app.post('/cryptoBot', async (req, res) => {
  const isValid = checkSignature(CRYPTOBOT.API_KEY, req.body, req.headers)
  console.log('КРИПТОБОТ ЗАПРОС')
  if (!isValid) {
    console.log('НЕВАЛИДНО')
    return res.sendStatus(403)
  }

  console.log('ВАЛИДНО')
  console.log(JSON.stringify(req.body))

  const payload: CryptoBotInvoice = req.body.payload
  const invoiceId = payload.invoice_id
  console.log(`invoice ID: ${invoiceId}`)

  const invoiceAmount = await invoiceInTON(payload)
  const user = await addUserBalance({ invoiceId }, invoiceAmount)
  try {
    await bot.api.sendMessage(
      user?.id,
      `🎉 УСПЕШНО! ${invoiceAmount.toFixed(2)} TON были начислены на ваш баланс.
<blockquote><b>Обычно к новому году фейерверки летят выше чем обычно…</b></blockquote>`,
      {
        reply_markup: new InlineKeyboard().webApp('🚀 Играть', `https://${DOMAIN}?token=${user?.appToken}`),
        message_effect_id: '5046509860389126442',
      }
    )
  } catch {}
  res.sendStatus(200)
})

export default app
