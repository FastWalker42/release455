import { Context } from 'grammy'
import { Reflink, User } from '../../db'
import CONFIG from '../../CONFIG.json'

export default async (ctx: Context) => {
  if (!ctx.from) return []
  const { id } = ctx.from

  /*const payload = (await User.findOne({ id: ctx.from?.id }))?.activeGiveaway

  const reflink = await Reflink.findOne({ payload })

  const channels = reflink?.giveAway?.channels ?? []*/
  const channels = []
  for (const id of CONFIG.CHANNEL_IDS) {
    channels.push(String(id))
  }

  const opList: { name: string; url: string }[] = []

  let userNotSubscribed = false
  let hasConfirmedSubscription = false

  let inviteUrl: string | null = null
  for (const id of channels) {
    try {
      try {
        const chat = await ctx.api.getChat(id)
        if (chat.invite_link) {
          inviteUrl = chat.invite_link
        } else {
          // Создаем новую ссылку если нет существующей
          const invite = await ctx.api.createChatInviteLink(id, {
            creates_join_request: false,
          })
          inviteUrl = invite.invite_link
        }
      } catch (error) {
        console.error(`Ошибка получения invite link для канала ${id}:`, error)
        continue
      }

      // Проверяем подписку
      const member = await ctx.api.getChatMember(id, ctx.from.id)
      const isSubscribed = ['creator', 'administrator', 'member'].includes(member.status)

      if (isSubscribed) {
        hasConfirmedSubscription = true
      } else if (inviteUrl) {
        userNotSubscribed = true
        opList.push({ name: 'Спонсор', url: inviteUrl })
      }
    } catch (error) {
      console.error(`Ошибка при проверке подписки на канал ${id}:`, error)
    }
  }

  if (opList.length === 0) {
    const user = await User.findOneAndUpdate(
      { id },
      { activated: true },
      { returnDocument: 'before' } // получаем ДО обновления
    )

    if (user && !user.activated && user.activeGiveaway) {
      await User.updateOne({ id }, { $inc: { balance: 0.1 } })
    }
  }

  return opList
}
