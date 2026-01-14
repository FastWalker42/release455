import { Context, InlineKeyboard } from 'grammy'
import { Reflink, User } from '../../db'
import CONFIG from '../../CONFIG.json'
import AVAILABLE_GIFTS from './gifts'

export default async (ctx: Context, payload: string) => {
  const reflink = await Reflink.findOne({ payload })
  if (!reflink) return

  const link = `https://t.me/${ctx.me.username}?start=ref_${payload}`
  // Подсчёт переходов сегодня
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const todayUsersCount = await User.countDocuments({
    invited_by: reflink.payload,
    createdAt: { $gte: startOfToday },
  })

  const kb = new InlineKeyboard().text('🎁 Установить розыгрыш', `reflink:giveaway:${payload}`).row()

  kb.text('Задать число победителей', `reflink:places:${payload}`).row()
  kb.text('🖼 Задать розыгрышам дефолт фото', `reflink:setdefaultphoto:${payload}`).row()

  kb.text('Создать пост', `reflink:givepost:${payload}`).row()

  //kb.text('Привязать канал', `reflink:adchannels:${payload}`).row()
  //kb.text('Список каналов', `reflink:channelsList:${payload}`)
  //kb.text('Задать время окончания', `reflink:time:${payload}`).row()

  const formattedEndDate = reflink.giveAway?.endDate
    ? new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(reflink.giveAway?.endDate))
    : '—'

  const foundGift = AVAILABLE_GIFTS.find((g) => g.id === reflink.giveAway?.giftId)
  const participants = await User.countDocuments(
    { activated: true, invited_by: reflink.payload, activeGiveaway: true },
    { id: 1 }
  )

  return ctx.reply(
    `<b>${reflink.name}</b>

<blockquote>👥 Всего переходов: ${reflink.usersJoined}</blockquote>
<blockquote>🚀 Переходов сегодня: ${todayUsersCount}</blockquote>
<blockquote>🤑 Прибыль: ${reflink.totalLost}</blockquote>
<blockquote>🧢 Зарегалось: ${participants}</blockquote>


🎁РОЗЫГРЫШ🎁: <blockquote>${
      reflink.giveAway?.enabled
        ? `Гифт: ${foundGift?.emoji}
Конец: ${formattedEndDate}
Количество мест: ${reflink.giveAway?.places}
Сумма: ⭐️${(reflink.giveAway?.places ?? 1) * foundGift?.price!}`
        : '<i>Не включен</i>'
    }</blockquote>

🔗 ${link}`,
    {
      reply_markup: kb.text('🗑 Удалить', `reflink:delete:${payload}`).row().text('⬅️ Назад', 'reflink:menu'),
    }
  )
}
