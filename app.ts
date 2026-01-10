import express, { Request, Response } from 'express'
import { fileURLToPath } from 'url'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { Game, User, Bank, BetHistory, OperHistory } from './db'

import bot from './tgbot'
import { DOMAIN, BOT_TOKEN_PROD, CRYPTOBOT } from './CONFIG.json'
import { addUserBalance, checkFreespin, claimFreespin } from './db/methods'
import { createHash, createHmac, randomUUID } from 'crypto'
import { REF_LEVELS } from './config'
import {
  cryptoBotCreateCheck,
  cryptoBotInvoice,
  deleteInvoice,
  findAssetForTonWithdraw,
  invoiceInTON,
  tonToUsd,
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
  if (isNaN(requiredTon) || requiredTon <= 0.5) {
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

    const phrases = [
      '<b>Победители</b> - это <b>проигравшие</b>, которые попробовали <b>ещё раз.</b>',
      `<b>Ты сегодня в ударе!</b> Такую полосу <b>везения нельзя прерывать.</b> Отдохни, <b>и возвращайся доминировать.</b>`,
      `<b>CrystallJet платит всем.</b>
Но ты доказал, 
<b>что ты один из лучших. Возвращайся и утверди это!</b>`,
      `Мы пополнили твой счет. 
Используй эти <b>ресурсы мудро — удача не любит долгих пауз.</b>`,
    ]

    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)]

    try {
      const usdAmount = await tonToUsd(requiredTon)

      await OperHistory.create({
        userId: user?.id,
        operType: 'cashout',
        tonAmount: requiredTon,
        currency: toWithdraw.currency,
        currencyAmount: toWithdraw.available,
        usdAmount: usdAmount,
      })

      await bot.api.sendMessage(
        user?.id,
        `<b>💸 ЗАЯВКА НА ВЫВОД ${requiredTon} ТОN была обработана! <u>${String(toWithdraw.available.toFixed(2))} ${
          toWithdraw.currency
        }</u> были начислены на ваш баланс.</b>
<blockquote><i>${randomPhrase}</i></blockquote>`,
        {
          reply_markup: new InlineKeyboard().webApp('🚀 Играть', `https://${DOMAIN}?token=${user?.appToken}`),
          message_effect_id: '5046509860389126442',
        }
      )
    } catch {}

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

app.get('/freespinAvailable', async (req: Request, res: Response) => {
  const { token } = req.query
  const available = await checkFreespin(String(token))
  res.json(available)
})

app.get('/claimFreespin', async (req: Request, res: Response) => {
  const { token } = req.query
  const claimed = await claimFreespin(String(token))
  res.json(claimed)
})

// CSS и JS из /assets
app.use('/assets', express.static(path.join(DIST_DIR, 'assets')))

// Все остальные статические файлы из корневой директории
app.use(express.static(DIST_DIR))

// Обработка корневого пути - отдаем index.html
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

app.use(express.json())

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
  const phrases = [
    'В новом году фейерверки летят выше чем обычно… испытай удачу по полной!',
    'Опробуйте свою удачу сполна и познайте путь истинных победителей по жизни!',
    `Деньги любят <b>тишину,</b> но еще больше они <b>любят смелых.</b>`,
    `<b>Риск — это цена,</b> которую мы платим за <b>возможность</b> пить <b>шампанское.</b>`,
  ]

  const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)]

  try {
    await OperHistory.create({
      userId: user?.id,
      operType: 'topup',
      tonAmount: invoiceAmount,
      currency: payload.paid_asset,
      currencyAmount: Number(payload.paid_amount),
      usdAmount: Number(payload.paid_amount) * Number(payload.paid_usd_rate),
    })

    await bot.api.sendMessage(
      user?.id,
      `<b>🎉 УСПЕШНО! <u>${invoiceAmount.toFixed(2)}</u> TON были начислены на ваш баланс.</b>
<blockquote><i>${randomPhrase}</i></blockquote>`,
      {
        reply_markup: new InlineKeyboard().webApp('🚀 Играть', `https://${DOMAIN}?token=${user?.appToken}`),
        message_effect_id: '5046509860389126442',
      }
    )
  } catch {}

  res.sendStatus(200)
})

export default app
