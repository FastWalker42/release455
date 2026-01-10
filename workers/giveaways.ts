import { InlineKeyboard } from 'grammy'
import { Reflink, User } from '../db'
import bot from '../tgbot'
import { mapGifts } from '../tgbot/handlers/gifts'

type FinishedGiveawayResult = {
  reflinkPayload: string
  giftId: string
  giftEmoji: string
  winners: number[] // user.id
}

const AVAILABLE_GIFTS = await mapGifts()

export const finishExpiredGiveaways = async (): Promise<FinishedGiveawayResult[]> => {
  const now = new Date()

  // 1. Находим активные розыгрыши, срок которых истёк
  const giveaways = await Reflink.find({
    'giveAway.enabled': true,
    'giveAway.endDate': { $ne: null, $lte: now },
  })
  if (!giveaways || giveaways.length === 0) {
    return []
  }

  const results: FinishedGiveawayResult[] = []

  for (const reflink of giveaways) {
    if (!reflink || !reflink.giveAway) continue

    const places = reflink?.giveAway?.places || 1

    // 2. Получаем всех участников розыгрыша
    const users = await User.find({ invited_by: reflink.payload, activeGiveaway: true }, { id: 1 })

    if (users.length === 0) {
      // просто выключаем розыгрыш, если нет участников
      reflink.giveAway.enabled = false
      await reflink.save()
      continue
    }

    // 3. Перемешиваем пользователей
    const shuffled = users.map((u) => u.id).sort(() => Math.random() - 0.5)

    // 4. Берём нужное количество победителей
    const winners = shuffled.slice(0, Math.min(places, shuffled.length))

    // 5. Завершаем розыгрыш
    reflink.giveAway.enabled = false
    await reflink.save()

    results.push({
      reflinkPayload: reflink.id,
      giftId: reflink.giveAway.giftId,
      giftEmoji: AVAILABLE_GIFTS.find((g) => g.id === reflink.giveAway?.giftId)?.emoji ?? '🎁',
      winners,
    })
  }

  return results
}

function calcGiveaways() {
  finishExpiredGiveaways().then((results) => {
    for (const result of results) {
      for (const winner of result.winners) {
        try {
          bot.api.sendMessage(
            winner,
            `<b>🎉 Поздравляем! Вы выиграли в розыгрыше подарок: ${result.giftEmoji} 🎉</b>`,
            {
              message_effect_id: '5046509860389126442',
              reply_markup: new InlineKeyboard().text(
                `${result.giftEmoji} Получить`,
                `claimPrize:${result.reflinkPayload}`
              ),
            }
          )
        } catch {}
      }
    }
  })
}
calcGiveaways()
setInterval(calcGiveaways, 7 * 60 * 1000) // каждые 7 минут
