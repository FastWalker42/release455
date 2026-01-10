import { Context, InlineKeyboard } from 'grammy'
import { Reflink } from '../../db'
import { checkUser } from '../../db/methods'

export default async (ctx: Context) => {
  const user = await checkUser({ id: ctx.from!.id })
  if (!user.is_admin) return

  const reflinks = await Reflink.find().lean()

  const kb = new InlineKeyboard().text('➕ Добавить', 'reflink:add').row()
  reflinks.forEach((r) => kb.text(r.name, `reflink:view:${r.payload}`).row())
  kb.row().text('↩️ Назад', 'adminMenu')

  await ctx.reply('🔗 Админские реф-ссылки:', { reply_markup: kb })
}
