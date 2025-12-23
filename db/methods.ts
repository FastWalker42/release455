import { User } from '.'
import { Bot, Context } from 'grammy'
import CONFIG from '../CONFIG.json'
import bot from '../bot'

export const checkUser = async (data: { id: number }, ref?: number) => {
  let user = await User.findOne({ id: data.id })
  if (!user) {
    const newUser = await User.create({
      ...data,
      invited_by: ref && (await User.exists({ id: ref })) ? ref : undefined,
    })

    if (ref) {
      await bot.api.sendMessage(ref, '🚀 По вашей реф.ссылке кто-то перешёл!', {
        message_effect_id: '5104841245755180586',
      })

      const inviter = await User.findOne({ id: ref })
      if (inviter) {
        inviter.refsCount = (inviter.refsCount || 0) + 1

        if (inviter.refsCount >= 15) inviter.refLevel = 3
        else if (inviter.refsCount >= 5) inviter.refLevel = 2
        else inviter.refLevel = 1

        await inviter.save()
      }
    }

    return { ...newUser.toObject(), is_newbie: true }
  }
  return user
}

export const updateState = async (userId: number, state: string) => {
  return await User.findOneAndUpdate({ id: userId }, { state }, { new: true })
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
  user.totalAmount += amount // Увеличиваем общую сумму пополнений
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
