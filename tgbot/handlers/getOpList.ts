import { Context } from 'grammy'
import { Reflink, User } from '../../db'

const CHANNELS = [
  { id: -1002214775405, name: '💎Канал' },
  { id: -1002213278790, name: '💎Чат' },
]

export default async (ctx: Context) => {
  if (!ctx.from) return []

  const userId = ctx.from.id
  const opList: { name: string; url: string }[] = []

  for (const channel of CHANNELS) {
    try {
      // Проверка подписки
      const member = await ctx.api.getChatMember(channel.id, userId)
      const isSubscribed = ['creator', 'administrator', 'member'].includes(member.status)

      if (isSubscribed) continue

      // Получаем или создаём invite link
      const chat = await ctx.api.getChat(channel.id)

      let inviteUrl = chat.invite_link
      if (!inviteUrl) {
        const invite = await ctx.api.createChatInviteLink(channel.id, {
          creates_join_request: false,
        })
        inviteUrl = invite.invite_link
      }

      if (inviteUrl) {
        opList.push({
          name: channel.name,
          url: inviteUrl,
        })
      }
    } catch (error) {
      console.error(`Ошибка для ${channel.id}:`, error)
    }
  }

  // Если подписан на всё — активируем
  if (opList.length === 0) {
    const user = await User.findOneAndUpdate({ id: userId }, { activated: true }, { returnDocument: 'before' })

    if (user && !user.activated && user.activeGiveaway) {
      await User.updateOne({ id: userId }, { $inc: { balance: 0.1 } })
    }
  }

  return opList
}
