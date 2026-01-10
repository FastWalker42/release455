import CONFIG from '../../CONFIG.json'
import { Context, InlineKeyboard } from 'grammy'
import { checkUser, updateUserCache } from '../../db/methods'
import bot from '..'
import checkBonus from './checkBonus'
import AVAILABLE_GIFTS from './gifts'
import { Reflink } from '../../db'
import getOpList from './getOpList'

export default async (ctx: Context) => {
  const { id, username, first_name } = ctx.from!
  const payload = ctx.message?.text?.split(' ')[1]
  console.log('payload: ', payload)

  const user = await checkUser({ id, username, first_name }, payload)

  await updateUserCache({ id }, bot)

  if (user.activeGiveaway) {
    const reflink = await Reflink.findOne({ payload: user.activeGiveaway })
    if (reflink?.giveAway?.enabled) {
      const foundGift = AVAILABLE_GIFTS.find((g) => g.id === reflink?.giveAway?.giftId)
      const opChannels = await getOpList(ctx) // теперь всегда включает CRYSTALLJET

      const keyboard = new InlineKeyboard()

      // Добавляем все обязательные подписки
      opChannels.forEach((chan) => {
        keyboard.url(chan.name, chan.url).row()
      })

      opChannels.length !== 0 && keyboard.text('Продолжить ✅', 'startCheckSubs')

      // Опционально: можно добавить дополнительную кнопку на основной канал
      // keyboard.url('👀 Главный канал', 'https://t.me/CRYSTALLJET').row()

      opChannels.length > 0
        ? await ctx.reply(
            `<b>🎉 РОЗЫГРЫШ x${reflink?.giveAway?.places} ${foundGift?.emoji}</b> на сумму <b>⭐️${
              reflink?.giveAway?.places! * foundGift?.price!
            }</b>
<b>Чтобы принять участие в розыгрыше, подпишитесь на каналы ниже</b>`,
            {
              reply_markup: keyboard,
              message_effect_id: '5046509860389126442',
              parse_mode: 'HTML',
            }
          )
        : await ctx.replyWithAnimation(`https://${CONFIG.DOMAIN}/giveaway2.mp4`, {
            caption: `<b>УРА🎉
ВЫ ПРИНЯЛИ УЧАСТИЕ В КОНКУРСЕ! 

🔥Вам отправлено <u>0.10 TON бонусного баланса!</u></b>`,

            reply_markup: new InlineKeyboard().webApp(
              '🎁Забрать баланс🎁',
              `https://${CONFIG.DOMAIN}?token=${user.appToken}`
            ),
            message_effect_id: '5046509860389126442',
            parse_mode: 'HTML',
          })

      return
    }
  }

  await ctx.replyWithPhoto('https://i.ibb.co/QZQ2038/image.png', {
    caption: `<b>🎉 Добро пожаловать в CrystallJet!</b>
<blockquote>Запускай новогодний фейерверк и <b>ПОЛУЧАЙ ИКСЫ К БАЛАНСУ!</b></blockquote>`,
    reply_markup: new InlineKeyboard()
      .webApp('🚀 Играть', `https://${CONFIG.DOMAIN}?token=${user.appToken}`)
      .url('👀 Канал', 'https://t.me/CRYSTALLJET'),
    message_effect_id: '5046509860389126442',
  })

  await checkBonus(ctx)
}
