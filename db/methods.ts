import { Bank, BetHistory, User } from '.'
import { Bot, Context } from 'grammy'
import CONFIG from '../CONFIG.json'
import bot from '../tgbot'
import Reflink from './reflink'
import { parseRefPayload } from '../utils/ref'
import OperHistoryModel from './operhistory'
import { UserType } from './user'

export const checkUser = async (
  data: { id: number; username?: string; first_name?: string },
  payload?: string
): Promise<UserType & { is_newbie?: boolean }> => {
  let user = await User.findOne({ id: data.id })
  if (user) return user

  const ref = parseRefPayload(payload)

  // 🔹 USER REF
  if (ref?.type === 'user') {
    const inviter = await User.findOne({ id: ref.value })
    if (inviter) {
      inviter.refsCount = (inviter.refsCount || 0) + 1
      await inviter.save()
      await bot.api.sendMessage(
        inviter.id,
        `УРА!🎉 
У вас новый реферал ${data.username || ''}`,
        {
          message_effect_id: '5159385139981059251',
        }
      )
    }
  }
  let activeGiveaway = null

  // 🔹 ADMIN REFLINK
  if (ref?.type === 'reflink') {
    const reflink = await Reflink.findOneAndUpdate({ payload: ref.value }, { $inc: { usersJoined: 1 } }, { new: true })

    if (reflink?.giveAway?.enabled) {
      activeGiveaway = reflink.payload
    }
  }

  const newUser = await User.create({
    ...data,
    name: data.first_name ?? null,
    invited_by: ref?.value,
    refType: ref?.type,
    activeGiveaway,
  })

  return { ...newUser.toObject(), is_newbie: true }
}

export const setUserPhotoBuffer = async (userId: number, buffer: Buffer) => {
  return await User.findOneAndUpdate({ id: userId }, { profilePhoto: buffer }, { new: true })
}

export const setUserName = async (userId: number, name: string) => {
  return await User.findOneAndUpdate({ id: userId }, { name: name.trim() }, { new: true })
}

// Добавлено: метод пополнения баланса
export const addUserBalance = async (data: { id?: number; invoiceId?: number }, amount: number) => {
  const user = await User.findOne(data)
  if (!user) return null

  user.balance += amount
  user.totalTopup += amount // Увеличиваем общую сумму пополнений
  await user.save()
  return user
}

// Добавлено: метод обновления кэша пользователя
export const updateUserCache = async (params: { id?: number; appToken?: string }, bot: Bot) => {
  const user = await User.findOne(params)
  if (!user) return

  const now = new Date()
  const hoursDiff = (now.getTime() - user.lastCache.getTime()) / (1000 * 60 * 60)

  // Если прошло больше 12 часов, обновляем кэш
  if (hoursDiff > 12) {
    try {
      // Обновляем имя
      const userInfo = await bot.api.getChat(user.id)
      if (userInfo.first_name || userInfo.last_name) {
        const fullName = [userInfo.first_name, userInfo.last_name].filter(Boolean).join(' ')
        user.name = fullName
      }

      // Обновляем фото
      const photos = await bot.api.getUserProfilePhotos(user.id)
      const fileId = photos.photos[0]?.[0]?.file_id
      if (fileId) {
        const file = await bot.api.getFile(fileId)
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.BOT_TOKEN_PROD}/${file.file_path}`
        const response = await fetch(fileUrl)
        const buffer = Buffer.from(await response.arrayBuffer())
        user.profilePhoto = buffer
      }

      user.lastCache = now
      await user.save()
      console.log(`✅ Кэш пользователя ${user.id} обновлен`)

      return user
    } catch (error) {
      console.error(`❌ Ошибка обновления кэша пользователя ${user.id}:`, error)
    }
  }
}

export const getDateFromPeriod = (period: 'day' | 'week' | 'month') => {
  const now = new Date()

  if (period === 'day') now.setHours(0, 0, 0, 0)
  if (period === 'week') now.setDate(now.getDate() - 7)
  if (period === 'month') now.setMonth(now.getMonth() - 1)

  return now
}

export const getBetsStats = async (from?: Date) => {
  const match = from ? { createdAt: { $gte: from } } : {}

  const stats = await BetHistory.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalBets: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' },
        avgCoeff: { $avg: '$finalCoeff' },
        wins: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } },
        losses: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
      },
    },
  ])

  if (!stats.length) {
    return {
      totalBets: 0,
      totalAmount: 0,
      avgAmount: 0,
      avgCoeff: 0,
      wins: 0,
      losses: 0,
    }
  }

  return stats[0]
}

export const getProfitStats = async (from?: Date) => {
  const match = from ? { createdAt: { $gte: from } } : {}

  const data = await BetHistory.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalStakes: { $sum: '$amount' },
        totalPayouts: {
          $sum: {
            $cond: [{ $eq: ['$status', 'won'] }, { $multiply: ['$amount', '$finalCoeff'] }, 0],
          },
        },
      },
    },
  ])

  if (!data.length) {
    return {
      totalStakes: 0,
      totalPayouts: 0,
      profit: 0,
    }
  }

  return {
    ...data[0],
    profit: data[0].totalStakes - data[0].totalPayouts,
  }
}

export const getRegistrations = async (from?: Date) => {
  const query = from ? { createdAt: { $gte: from } } : {}
  return await User.countDocuments(query)
}

export const getActivePlayers = async (from?: Date) => {
  const match = from ? { createdAt: { $gte: from } } : {}

  const data = await BetHistory.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$userToken',
        bets: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: null,
        players: { $sum: 1 },
        totalBets: { $sum: '$bets' },
      },
    },
  ])

  if (!data[0]) return null

  return {
    activePlayers: data[0].players,
    avgBetsPerPlayer: data[0].totalBets / data[0].players,
  }
}

export const getDepositWithdrawStats = async (from?: Date) => {
  const match = from ? { date: { $gte: from } } : {}

  const stats = await OperHistoryModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$operType',
        totalTON: { $sum: '$tonAmount' },
        totalUSD: { $sum: '$usdAmount' },
        count: { $sum: 1 },
      },
    },
  ])

  // Инициализируем объект с нулевыми значениями
  const result = {
    topupTON: 0,
    topupUSD: 0,
    cashoutTON: 0,
    cashoutUSD: 0,
    topupCount: 0,
    cashoutCount: 0,
  }

  // Заполняем результаты
  stats.forEach((item: any) => {
    if (item._id === 'topup') {
      result.topupTON = item.totalTON || 0
      result.topupUSD = item.totalUSD || 0
      result.topupCount = item.count || 0
    } else if (item._id === 'cashout') {
      result.cashoutTON = item.totalTON || 0
      result.cashoutUSD = item.totalUSD || 0
      result.cashoutCount = item.count || 0
    }
  })

  return result
}

export const getAdminStats = async () => {
  const allTimeDepositWithdraw = await getDepositWithdrawStats()
  const dayDepositWithdraw = await getDepositWithdrawStats(getDateFromPeriod('day'))
  const weekDepositWithdraw = await getDepositWithdrawStats(getDateFromPeriod('week'))
  const monthDepositWithdraw = await getDepositWithdrawStats(getDateFromPeriod('month'))

  return {
    allTime: {
      bets: await getBetsStats(),
      profit: await getProfitStats(),
      users: await getRegistrations(),
      activePlayers: await getActivePlayers(),
      depositWithdraw: allTimeDepositWithdraw,
    },
    day: {
      bets: await getBetsStats(getDateFromPeriod('day')),
      profit: await getProfitStats(getDateFromPeriod('day')),
      users: await getRegistrations(getDateFromPeriod('day')),
      activePlayers: await getActivePlayers(getDateFromPeriod('day')),
      depositWithdraw: dayDepositWithdraw,
    },
    week: {
      profit: await getProfitStats(getDateFromPeriod('week')),
      activePlayers: await getActivePlayers(getDateFromPeriod('week')),
      depositWithdraw: weekDepositWithdraw,
    },
    month: {
      profit: await getProfitStats(getDateFromPeriod('month')),
      activePlayers: await getActivePlayers(getDateFromPeriod('month')),
      depositWithdraw: monthDepositWithdraw,
    },
  }
}
const FREESPIN_REWARD = 1 // сколько фриспинов даём
const FREESPIN_COOLDOWN_HOURS = 24

export const checkFreespin = async (token: string) => {
  const user = await User.findOne({ appToken: token })
  if (!user) return { available: false, reason: 'USER_NOT_FOUND' }
  if (!user.activated) return { available: false, reason: 'NOT_ACTIVATED' }
  if (user.freespins > 0) return { available: false, reason: 'ALREADY_HAVE' }

  if (!user.freespinClaimed) {
    return { available: true }
  }

  const now = Date.now()
  const diffHours = (now - user.freespinClaimed.getTime()) / (1000 * 60 * 60)

  if (diffHours >= FREESPIN_COOLDOWN_HOURS) {
    return { available: true }
  }

  return {
    available: false,
    nextAt: new Date(user.freespinClaimed.getTime() + FREESPIN_COOLDOWN_HOURS * 60 * 60 * 1000),
  }
}

export const claimFreespin = async (token: string) => {
  const user = await User.findOne({ appToken: token })
  if (!user) return null

  const check = await checkFreespin(token)
  if (!check.available) return null

  user.freespins += FREESPIN_REWARD
  user.freespinClaimed = new Date()

  await user.save()

  return {
    freespins: user.freespins,
    claimedAt: user.freespinClaimed,
  }
}

export const updateBankStats = async (stakeAmount: number, payoutAmount: number) => {
  try {
    // Атомарное обновление банка
    const bank = await Bank.findOneAndUpdate(
      { id: 'singleton' },
      {
        $inc: {
          balance: stakeAmount - payoutAmount,
          totalStakes: stakeAmount,
          totalPayouts: payoutAmount,
        },
        $set: { updatedAt: new Date() },
      },
      { upsert: true, new: true }
    )

    // Обновляем кэш
    if (bank) {
      /*bankStats = {
        balance: bank.balance,
        totalStakes: bank.totalStakes,
        totalPayouts: bank.totalPayouts,
        currentRTP: bank.totalStakes > 0 ? bank.totalPayouts / bank.totalStakes : 0,
        lastUpdated: Date.now(),
      }*/
    }

    return bank
  } catch (error) {
    console.error('Ошибка обновления банка:', error)
    return null
  }
}
