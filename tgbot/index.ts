import CONFIG from '../CONFIG.json'
import { Bot, Context, GrammyError, Keyboard, InlineKeyboard } from 'grammy'
import { checkUser, getAdminStats, updateUserCache } from '../db/methods'
import { GlobalSettings, Reflink, User } from '../db'
import { nanoid } from 'nanoid'
import adminMenu from './handlers/adminMenu'
import bot from './init'
import { getUserState, setUserState } from './handlers/state'
import limitString from '../utils/limitString'
import reflinksMenu from './handlers/reflinksMenu'
import { prospam } from './handlers/prospam'
import successPayment from './handlers/successPayment'
import startCommand from './handlers/startCommand'
import checkBonus from './handlers/checkBonus'
import AVAILABLE_GIFTS from './handlers/gifts'
import editRefLinkMenu from './handlers/editRefLinkMenu'
import claimPrize from './handlers/claimPrize'
import checkGiftsBalance from './handlers/checkGiftsBalance'
import chatShared from './handlers/chatShared'
import giveawayPostGen from './handlers/reflinkGivepost'

bot.command('start', startCommand)

bot.command('admin', adminMenu)

const ME = await bot.api.getMe()
const BOT_ID = ME.id

//bot.on(':chat_shared', chatShared)

bot.on('message', async (ctx) => {
  const user = await checkUser({ id: ctx.from!.id })
  const userState = await getUserState(ctx.from!.id)

  if (user.is_admin && ctx.message?.text === '❌ Отмена') {
    await setUserState(ctx.from!.id, 'none')
    await ctx.reply('Действие отменено.', { reply_markup: { remove_keyboard: true } })
    return
  }

  // 🔹 СОЗДАНИЕ РЕФКИ
  if (user.is_admin && userState === 'reflink:add' && ctx.message?.text) {
    const name = limitString(ctx.message.text.trim())

    await Reflink.create({ name })
    await setUserState(ctx.from!.id, 'none')

    await ctx.reply('✅ Реф-ссылка создана')
    return reflinksMenu(ctx)
  }

  // 🔹 РАССЫЛКА
  if (user.is_admin && userState === 'prospam') {
    return prospam(ctx)
  }

  if (user.is_admin && userState === 'starbalance:topup' && ctx.message?.text) {
    const amount = parseFloat(ctx.message.text)
    if (isNaN(amount)) {
      await ctx.reply('❌ Введите корректную сумму.')
      return
    }

    await ctx.replyWithInvoice('STARS', 'ПОПОЛНЕНИЕ БАЛАНСА', nanoid(5), 'XTR', [{ label: 'stars', amount: amount }])
  }

  if (user.is_admin && userState?.startsWith('reflink:setdefaultphoto:') && ctx.message?.photo) {
    const reflinkPayload = userState.split(':')[2]

    const photo = ctx.message.photo.at(-1)
    if (!photo) return

    // получаем file info
    const file = await ctx.api.getFile(photo.file_id)

    // скачиваем файл как Buffer
    const url = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`
    const response = await fetch(url)
    const buffer = Buffer.from(await response.arrayBuffer())

    await GlobalSettings.findOneAndUpdate(
      { id: 'singleton' },
      {
        $set: { GiveAwayPhoto: buffer },
        $setOnInsert: { id: 'singleton' },
      },
      { upsert: true, new: true }
    )

    await ctx.reply('Фото сохранено ✅')
    if (reflinkPayload) {
      await editRefLinkMenu(ctx, reflinkPayload)
    }
  }

  if (user.is_admin && userState?.startsWith('reflink:places:') && ctx.message?.text) {
    const reflinkPayload = userState.split(':')[2]
    const reflink = await Reflink.findOne({ payload: reflinkPayload })
    if (!reflink) return

    const places = parseInt(ctx.message.text.trim())
    if (isNaN(places) || places < 1) {
      return ctx.reply('❌ Введите корректное число больше 0.')
    }

    reflink.giveAway = reflink.giveAway || { enabled: false, giftId: 'none', places: 3, endDate: null }
    reflink.giveAway.places = places
    await reflink.save()
    await setUserState(ctx.from!.id, 'none')

    await ctx.reply(`✅ Количество мест для розыгрыша установлено на ${places}`)
    await checkGiftsBalance(ctx)
    return editRefLinkMenu(ctx, reflink.payload)
  }
})

bot.on('my_chat_member', () => {})

bot.on('pre_checkout_query', async (ctx) => {
  ctx.answerPreCheckoutQuery(true)
})
bot.on('message:successful_payment', successPayment)
bot.on(':chat_shared', () => {})

bot.on('callback_query:data', async (ctx) => {
  const user = await checkUser({ id: ctx.from!.id })

  try {
    await ctx.deleteMessage()
  } catch {}

  const data = ctx.callbackQuery?.data
  console.log('Callback data:', data)

  if (data === 'startCheckSubs') {
    await startCommand(ctx)
    return
  }

  if (data === 'checkBonus') {
    await checkBonus(ctx)
    return
  }

  if (data === 'starbalance:topup') {
    await setUserState(ctx.from!.id, 'starbalance:topup')
    await ctx.reply('⭐️ Введите сумму для пополнения баланса бота:')
  }

  if (data === 'adminMenu') {
    await adminMenu(ctx)
  }

  if (data === 'prospam') {
    await prospam(ctx)
  }

  if (data === 'reflink:menu') {
    await reflinksMenu(ctx)
  }

  if (data === 'reflink:add') {
    await setUserState(ctx.from!.id, 'reflink:add')
    return ctx.reply('Введите название реф-ссылки (до 32 символов)')
  }

  if (user?.is_admin && data.startsWith('reflink:setdefaultphoto:')) {
    await setUserState(ctx.from!.id, data)
    return ctx.reply('Отправьте фото для постов розыгрышей')
  }

  if (user?.is_admin && data.startsWith('reflink:removechan:')) {
    const reflinkPayload = ctx.callbackQuery?.data!.split(':')[2]
    const channelId = ctx.callbackQuery?.data!.split(':')[3]

    try {
      if (ctx.callbackQuery?.data!) {
        await Reflink.updateOne(
          { payload: reflinkPayload },
          {
            $pull: {
              'giveAway.channels': channelId,
            },
          }
        )
      }
      await ctx.reply(`✅ Канал ${channelId} удалён из списка.`)
    } catch (err) {
      return ctx.reply(`❌ Ошибка удаления канала ${err}`)
    }
  }

  if (data.startsWith('reflink:givepost:')) {
    const reflinkPayload = ctx.callbackQuery!.data!.split(':')[2]

    await giveawayPostGen(ctx, reflinkPayload)
  }

  if (data.startsWith('reflink:channelsList:')) {
    const reflinkPayload = ctx.callbackQuery!.data!.split(':')[2]

    const reflink = await Reflink.findOne({ payload: reflinkPayload })
    if (!reflink) return

    const channels = reflink?.giveAway?.channels! || []

    const result: string[] = []

    for (const channel of channels) {
      try {
        const chat = await ctx.api.getChat(channel)
        result.push(chat.title ?? channel)
      } catch (e) {
        // бот не админ / канал приватный / нет доступа
        result.push(channel)
      }
    }

    await ctx.answerCallbackQuery()

    await ctx.reply(result.length ? result.map((c, i) => `${i + 1}. ${c}`).join('\n') : 'Каналов нет')
  }

  if (data.startsWith('reflink:giveaway:')) {
    const giveawayreflinkPayload = data.split(':')[2]

    const kb = new InlineKeyboard()
    AVAILABLE_GIFTS.forEach((g, index) => {
      if (index % 3 === 0 && index !== 0) kb.row()
      kb.text(`${g.emoji} ${g.price}`, `reflink:gift:${giveawayreflinkPayload}:${g.id}`)
    })
    kb.row().text('↩️ Назад', 'reflink:menu')
    return ctx.reply('Выберите подарок для розыгрыша:', { reply_markup: kb })
  }

  if (data.startsWith('reflink:gift:')) {
    const [_, __, reflinkPayload, giftId] = data.split(':')
    const reflink = await Reflink.findOne({ payload: reflinkPayload })
    if (!reflink) return

    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 3)
    endDate.setHours(11, 0, 0, 0) // 12:00 CET = 11:00 UTC

    reflink.giveAway = {
      enabled: true,
      giftId,
      endDate,
    }
    await checkGiftsBalance(ctx)
    await reflink.save()
    await editRefLinkMenu(ctx, reflink.payload)
  }

  if (data.startsWith('reflink:places:')) {
    const reflinkPayload = data.split(':')[2]
    await setUserState(ctx.from!.id, `reflink:places:${reflinkPayload}`)
    return ctx.reply('Введите новое количество мест для розыгрыша (число):')
  }

  if (data.startsWith('reflink:adchannels:')) {
    await setUserState(ctx.from!.id, ctx.callbackQuery!.data!)
    return ctx.reply('Введите ID канала, прикрепите канал или перешлите сообщение оттуда:', {
      reply_markup: new Keyboard()
        .requestChat('📌🔰 Добавить канал', 0, {
          chat_is_channel: true,
        })
        .text('❌ Отмена'),
    })
  }

  if (data.startsWith('claimPrize:')) {
    await claimPrize(ctx)
  }

  if (data.startsWith('reflink:view:')) {
    const payload = data.split(':')[2]
    await editRefLinkMenu(ctx, payload)
  }
})

export default bot
