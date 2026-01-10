import { Context, GrammyError, InlineKeyboard } from 'grammy'
import { checkUser } from '../../db/methods'
import { setUserState } from './state'
import { User } from '../../db'
import bot from '../init'
import adminMenu from './adminMenu'

const CHUNK_SIZE = 15
const REPORT_EVERY = 10
const MAX_RETRIES = 3
const BASE_DELAY = 1000

export const prospam = async (ctx: Context) => {
  const { id } = ctx.from!
  const user = await checkUser({ id })

  // 1. Если админ нажал кнопку — включаем режим ожидания сообщения
  if (user.is_admin && ctx.callbackQuery?.data) {
    await setUserState(id, 'prospam')

    try {
      const msg = ctx.callbackQuery.message
      if (msg && ('photo' in msg || 'video' in msg || 'document' in msg || 'animation' in msg)) {
        await ctx.editMessageCaption({
          caption: 'Перешлите сюда любой пост, и он будет разослан всем пользователям.',
          reply_markup: new InlineKeyboard().text('↩️ Назад', 'adminMenu'),
        })
      } else {
        await ctx.editMessageText('Перешлите сюда любой пост, и он будет разослан всем пользователям.', {
          reply_markup: new InlineKeyboard().text('↩️ Назад', 'adminMenu'),
        })
      }
    } catch (e) {
      console.error('Ошибка при редактировании:', e)
      await ctx.reply('Перешлите сюда любой пост, и он будет разослан всем пользователям.', {
        reply_markup: new InlineKeyboard().text('↩️ Назад', 'adminMenu'),
      })
    }

    return
  }

  // 2. Если админ отправил сообщение (рассылка)
  if (user.is_admin && ctx.msg) {
    const BOT_ADMIN_ID = ctx.from!.id
    let isSpamBlocked = false

    const users = await User.find({}, { id: 1 }).lean()
    if (users.length === 0) {
      await ctx.reply('В базе данных нет пользователей для рассылки.')
      return
    }

    let progressMessage = await ctx.reply(
      `⏳ Начинаю рассылку сообщения для ${users.length} пользователей...\n` + `Успешно: 0\nОшибок: 0\nПрогресс: 0%`
    )

    let successCount = 0
    let errorCount = 0
    let processedChunks = 0

    const safeSendToAdmin = async (text: string) => {
      try {
        await bot.api.sendMessage(BOT_ADMIN_ID, text)
      } catch (e) {
        console.error('Не удалось отправить сообщение админу:', e)
      }
    }

    const updateProgress = async () => {
      const progress = Math.round(((successCount + errorCount) / users.length) * 100)
      try {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          progressMessage.message_id,
          `${isSpamBlocked ? '⚠️ БОТ В СПАМ-БЛОКЕ ⚠️\n' : ''}⏳ Рассылка сообщения для ${
            users.length
          } пользователей...\n` + `Успешно: ${successCount}\nОшибок: ${errorCount}\nПрогресс: ${progress}%`
        )
      } catch (e) {
        console.error('Ошибка при обновлении прогресса:', e)
      }
    }

    const sendChunk = async (
      chunk: typeof users,
      attempt = 1
    ): Promise<{ chunkSuccess: number; chunkErrors: number }> => {
      try {
        const results = await Promise.allSettled(
          chunk.map((user: any) =>
            bot.api.copyMessage(user.id, ctx.chat!.id, ctx.msg!.message_id, {
              reply_markup: ctx.msg!.reply_markup,
            })
          )
        )

        const chunkSuccess = results.filter((r) => r.status === 'fulfilled').length
        const chunkErrors = results.filter((r) => r.status === 'rejected').length

        if (chunkSuccess > 0) {
          isSpamBlocked = false
        }

        return { chunkSuccess, chunkErrors }
      } catch (error) {
        console.error(`Ошибка в sendChunk (попытка ${attempt}):`, error)

        if (error instanceof GrammyError && error?.error_code === 429) {
          isSpamBlocked = true
          const retryAfter = error.parameters?.retry_after || 30
          await safeSendToAdmin(`⚠️ Бот получил спам-блок! Ожидание ${retryAfter} секунд...`)
          await new Promise((r) => setTimeout(r, (retryAfter + 5) * 1000))

          if (attempt < MAX_RETRIES) {
            return sendChunk(chunk, attempt + 1)
          }
        }

        return { chunkSuccess: 0, chunkErrors: chunk.length }
      }
    }

    // Разделение пользователей на чанки
    const chunks = []
    for (let i = 0; i < users.length; i += CHUNK_SIZE) {
      chunks.push(users.slice(i, i + CHUNK_SIZE))
    }

    // Основной цикл рассылки
    for (const chunk of chunks) {
      let chunkSuccess = 0
      let chunkErrors = 0

      try {
        const result = await sendChunk(chunk)
        chunkSuccess = result.chunkSuccess
        chunkErrors = result.chunkErrors
      } catch (error) {
        console.error('Критическая ошибка в обработке чанка:', error)
        chunkErrors = chunk.length
      }

      successCount += chunkSuccess
      errorCount += chunkErrors
      processedChunks++

      if (processedChunks % REPORT_EVERY === 0 || isSpamBlocked) {
        await updateProgress()
      }

      const currentDelay = isSpamBlocked ? BASE_DELAY * 5 : BASE_DELAY
      await new Promise((resolve) => setTimeout(resolve, currentDelay))
    }

    // Финальный отчёт
    try {
      await ctx.api.editMessageText(
        ctx.chat!.id,
        progressMessage.message_id,
        `✅ Рассылка завершена!\n` +
          `Всего пользователей: ${users.length}\n` +
          `Успешно: ${successCount}\n` +
          `Неуспешно: ${errorCount}\n` +
          `Процент успеха: ${Math.round((successCount / users.length) * 100)}%`
      )
    } catch (e) {
      console.error('Ошибка при финальном обновлении:', e)
      await safeSendToAdmin(`Рассылка завершена!\nУспешно: ${successCount}\nНеуспешно: ${errorCount}`)
    }

    // Выход из режима
    await setUserState(id, 'none')
    await adminMenu(ctx)
  }
}
