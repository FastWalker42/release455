import { Context, InlineKeyboard, InputFile } from 'grammy'
import { Reflink, User, GlobalSettings } from '../../db'
import CONFIG from '../../CONFIG.json'
import AVAILABLE_GIFTS from './gifts'

export default async (ctx: Context, payload: string) => {
  const reflink = await Reflink.findOne({ payload })
  if (!reflink) return

  const settings = await GlobalSettings.findOne({ id: 'singleton' })

  const link = `https://t.me/${ctx.me.username}?start=ref_${payload}`

  const formattedEndDate = reflink.giveAway?.endDate
    ? new Intl.DateTimeFormat('ru-RU', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(reflink.giveAway.endDate))
    : '—'

  const foundGift = AVAILABLE_GIFTS.find((g) => g.id === reflink.giveAway?.giftId)

  const text = `<b>🎁РОЗЫГРЫШ🎁
<blockquote>${foundGift?.emoji}х${reflink.giveAway?.places} на сумму ⭐️${
    (reflink.giveAway?.places ?? 1) * foundGift?.price!
  }</blockquote>

1. Зайти и сделать фриспин в <a href="https://t.me/CrystallJet_bot">CrystallJet</a>
2. Подписка на Чат и Канал

<a href="https://t.me/boost/CRYSTALLJET"><i>🎉Бусты увеличивают шансы</i></a>

<u><i>Реакции + репост другу,</i></u>
<blockquote>🍒ИТОГИ:

${formattedEndDate} UTC</blockquote></b>
`

  const keyboard = new InlineKeyboard().url('🔥УЧАСТВОВАТЬ🔥', link)

  // 👉 если фото есть — отправляем с ним
  if (settings?.GiveAwayPhoto) {
    return ctx.replyWithPhoto(new InputFile(settings.GiveAwayPhoto, 'photo.jpg'), {
      caption: text,
      parse_mode: 'HTML',
      reply_markup: keyboard,
    })
  }

  // 👉 если фото нет — обычный текст
  return ctx.reply(text, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  })
}
