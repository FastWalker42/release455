import { Context } from 'grammy'
import Reflink from '../../db/reflink'
import User from '../../db/user'
import AVAILABLE_GIFTS from './gifts'

export default async function checkGiftsBalance(ctx?: Context) {
  // 🔹 баланс звёзд бота
  const starBalanceRes = ctx ? await ctx.api.getMyStarBalance() : { amount: 0 }
  const botStars = starBalanceRes.amount || 0

  // 🔹 все активные розыгрыши
  const giveaways = await Reflink.find({ 'giveAway.enabled': true })

  // 🔹 суммарное количество нужных звёзд
  const requiredStars = giveaways.reduce((sum, r) => {
    const gift = AVAILABLE_GIFTS.find((g) => g.id === r.giveAway?.giftId)
    if (!gift) return sum
    const places = r.giveAway?.places || 1
    return sum + places * gift.price
  }, 0)

  // ❌ если звёзд не хватает — уведомляем админов
  if (botStars < requiredStars) {
    const admins = await User.find({ is_admin: true })

    const text = `❗️ Недостаточно ⭐️ для розыгрышей
<blockquote>Доступно: ⭐️${botStars}
Нужно: ⭐️${requiredStars}
Не хватает: ⭐️${requiredStars - botStars}</blockquote>`

    for (const admin of admins) {
      if (!admin.doGetNotifications) continue
      try {
        if (ctx) await ctx.api.sendMessage(admin.id, text)
      } catch (e) {
        console.error(`Не удалось уведомить админа ${admin.id}`, e)
      }
    }
  }

  return { botStars, requiredStars }
}
