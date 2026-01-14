import CONFIG from '../../CONFIG.json'

import { Context, InlineKeyboard } from 'grammy'
import bot from '../init'
import { User } from '../../db'
import getOpList from './getOpList'
import { checkUser } from '../../db/methods'

export default async (ctx: Context) => {
  const { id } = ctx.from!
  const user = await User.findOneAndUpdate({ id: id }, { $set: { informed: true } })

  try {
    const keyboard = new InlineKeyboard()
    const opChannels = await getOpList(ctx)
    opChannels.forEach((chan) => {
      keyboard.url(chan.name, chan.url).row()
    })
    console.log('opChannels', opChannels)

    if (opChannels.length === 0 && ctx.callbackQuery) {
      const msg1 = await ctx.replyWithPhoto('https://i.ibb.co/Gv3bqKGx/IMG-4936.jpg', {
        caption: `<b>ПОЗДРАВЛЯЕМ!🎊 

🎁ВЫ ПОЛУЧИЛИ БЕСПЛАТНЫЙ ЗАПУСК!🎁
<blockquote>❌Бонус пропадет через 24 часа!❌</blockquote></b>`,
        message_effect_id: '5104841245755180586',

        reply_markup: new InlineKeyboard().webApp(
          '🎁Забрать Бонус🎁',
          `https://${CONFIG.DOMAIN}?token=${user?.appToken}`
        ),
      })
      try {
        await ctx.pinChatMessage(msg1.message_id)
      } catch {}
    } else {
      if (user?.informed) return

      const kb = new InlineKeyboard()
      opChannels.forEach((chan) => {
        kb.url(chan.name, chan.url).row()
      })
      const msg2 = await ctx.replyWithPhoto('https://i.postimg.cc/RFVVGXVs/image.png', {
        caption: `<b>🎉ПОЗДРАВЛЯЕМ!🎊 

🎁ВЫ ПОЛУЧИЛИ ФРИБЕТ!🎁
<blockquote>Статус: ОЖИДАЕТ АКТИВАЦИИ 🟡</blockquote></b>`,
        reply_markup: kb.row().text('✅ Проверить', `checkBonus`),
      })
      await ctx.pinChatMessage(msg2.message_id)
    }
  } catch (err) {
    console.error('Ошибка проверки подписки:', err)
  }
}
