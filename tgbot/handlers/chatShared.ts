import { Context } from 'grammy'
import { Reflink } from '../../db'
import { checkUser } from '../../db/methods'
import adminMenu from './adminMenu'
import { getUserState } from './state'

export default async (ctx: Context) => {
  const { id } = ctx.from!
  const userExisted = await checkUser({
    id: id,
  })

  const userState = await getUserState(ctx.from!.id)

  const reflinkPayload = userState?.split(':')[2]
  console.log('chat_shared handler', reflinkPayload)

  const chat_id = ctx.message?.chat_shared?.chat_id!

  try {
    const chatData = await ctx.api.getChat(chat_id)

    const opChannel = await Reflink.exists({
      payload: reflinkPayload, // или _id / name — что у тебя идентификатор ссылки
      'giveAway.channels': chat_id, // нужный канал
    })

    if (opChannel) {
      await ctx.reply('Канал уже есть!')
    } else {
      if (chatData.username || chatData.invite_link) {
        const res = await Reflink.updateOne(
          { payload: reflinkPayload },
          {
            $addToSet: {
              'giveAway.channels': chat_id,
            },
          }
        )

        console.log('update result:', res)
      }

      await ctx.reply(`
${chatData.type === 'channel' ? 'Добавление группы' : 'Добавление канала'} <b>«${chatData.title}»</b> на ОП ${
        chatData.username ? `\n@${chatData.username}` : ''
      }
<pre><code class="language-🆔 канала/чата">${chat_id}</code></pre>
${chatData.username ? `@${chatData.username}` : '🔑 Приватный канал'}
${
  !chatData.username && !chatData.invite_link
    ? `<blockquote><b>⚠️ БОТ НЕ МОЖЕТ ПРИГЛАШАТЬ ЛЮДЕЙ. 
ВЫДАЙТЕ ПРАВА В КАНАЛЕ И ПОПРОБУЙТЕ СНОВА</b></blockquote>`
    : '<blockquote>🤖 У бота есть необходимые права ✅</blockquote>'
}
${chatData.username || chatData.invite_link ? '✅ КАНАЛ ДОБАВЛЕН' : '❌ НЕ УДАЛОСЬ ДОБАВИТЬ КАНАЛ'}`)
    }
  } catch {
    await ctx.reply('❌ Не удалось получить доступ к каналу/чату. Бот не состоит там')
  }
  if (userExisted?.is_admin) {
    await adminMenu(ctx)
  }
}
