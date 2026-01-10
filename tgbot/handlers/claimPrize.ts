import { Context, InlineKeyboard } from 'grammy'
import { Reflink, User } from '../../db'
import CONFIG from '../../CONFIG.json'

const CLAIM_TIMEOUT_HOURS = 36
const CLAIM_TIMEOUT_MS = CLAIM_TIMEOUT_HOURS * 60 * 60 * 1000

export default async function claimPrize(ctx: Context) {
  try {
    if (!ctx.callbackQuery?.data) return

    const [, reflinkPayload] = ctx.callbackQuery.data.split(':')
    if (!reflinkPayload) {
      await ctx.reply('Некорректная ссылка')
      return
    }

    const userId = ctx.from?.id
    if (!userId) return

    const reflink = await Reflink.findById(reflinkPayload)
    if (!reflink || !reflink.giveAway?.endDate) {
      await ctx.reply('Розыгрыш не найден')
      return
    }

    const endDate = new Date(reflink.giveAway.endDate).getTime()
    const now = Date.now()

    // ⏱ 36 часов прошло
    if (now - endDate > CLAIM_TIMEOUT_MS) {
      await ctx.reply('⏱ Время получения приза истекло (36 часов)')
      return
    }

    const giftId = reflink.giveAway.giftId
    if (!giftId || giftId === 'none') {
      await ctx.reply('Подарок недоступен')
      return
    }

    // 🔹 Пытаемся найти пользователя и сразу установить activeGiveaway = null
    const user = await User.findOneAndUpdate(
      { id: userId, invited_by: reflink.payload, activeGiveaway: reflink.payload },
      { activeGiveaway: null },
      { new: true } // возвращаем обновлённый документ
    )

    if (!user) {
      await ctx.reply('Вы не участвовали в этом розыгрыше или уже получили приз')
      return
    }

    // 🔹 Отправляем подарок
    await ctx.api.sendGift(userId, giftId, {
      text: `<b>ПОЗДРАВЛЯЕМ🎉
ТЫ ВЫИГРАЛ В КОНКУРСЕ!</b>`,
      text_parse_mode: 'HTML',
    })
  } catch (err) {
    console.error('claimPrize error:', err)
    try {
      await ctx.reply('Ошибка при получении подарка')
    } catch {}
  }
}
