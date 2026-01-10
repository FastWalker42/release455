import CONFIG from '../CONFIG.json'
import { Bot, Context, GrammyError, InlineKeyboard } from 'grammy'
import { parseMode } from '@grammyjs/parse-mode'

const IS_PROD_MODE = process.env.CONFIG_ENV === 'prod'
let TOKEN = CONFIG.BOT_TOKEN_TEST
if (IS_PROD_MODE) TOKEN = CONFIG.BOT_TOKEN_PROD

const bot = new Bot(TOKEN)
bot.api.config.use(parseMode('HTML'))
bot.catch(({ error }) => console.error('Global Bot Error:', error))

export default bot
