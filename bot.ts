import CONFIG from './CONFIG.json'
import { Bot, Context, InlineKeyboard } from 'grammy'
import { parseMode } from '@grammyjs/parse-mode'
import { checkUser, updateUserCache } from './db/methods'

const IS_PROD_MODE = process.env.CONFIG_ENV === 'prod'
let TOKEN = CONFIG.BOT_TOKEN_TEST
if (IS_PROD_MODE) TOKEN = CONFIG.BOT_TOKEN_PROD

const bot = new Bot(TOKEN)
bot.api.config.use(parseMode('HTML'))

bot.catch(({ error }) => console.error('Global Bot Error:', error))

bot.command('start', async (ctx: Context) => {
  const { id } = ctx.from!

  const payload = ctx.message?.text?.split(' ')[1]
  console.log('payload: ', payload)

  const user = await checkUser({ id }, Number(payload))

  await updateUserCache({ id }, bot)

  await ctx.replyWithPhoto('https://i.ibb.co/QZQ2038/image.png', {
    caption: `<b>🎉 Добро пожаловать в CrystallJet!</b>
<blockquote>Запускай ракетку и <b>ЛУТАЙ ИКСЫ!</b></blockquote>`,
    reply_markup: new InlineKeyboard()
      .webApp('🚀 Играть', `https://${CONFIG.DOMAIN}?token=${user.appToken}`)
      .url('👀 Канал', 'https://t.me/CRYSTALLJET'),
    message_effect_id: '5046509860389126442',
  })
})

bot.start()
export default bot
