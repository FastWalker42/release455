import CONFIG from '../../CONFIG.json'
import { Context, InlineKeyboard } from 'grammy'
import { checkUser, getAdminStats } from '../../db/methods'
import { setUserState } from './state'

export default async (ctx: Context) => {
  const { id } = ctx.from!

  const stats = await getAdminStats()
  const user = await checkUser({ id })
  await setUserState(id, 'none')

  if (user?.is_admin) {
    await ctx.reply(
      `
📊 <b>СТАТИСТИКА</b>

<blockquote>👥 Всего регов: ${stats.allTime.users}</blockquote>

<blockquote>🎯 Ставок всего: ${stats.allTime.bets.totalBets}
💰 Оборот: ${stats.allTime.bets.totalAmount}
📈 Ресурс банка: ${stats.allTime.profit.profit * CONFIG.GAME.TARGET_RTP}
🤑 HOUSE EDGE: ${stats.allTime.profit.profit * (1 - CONFIG.GAME.TARGET_RTP)}</blockquote>

<blockquote>💎 Депозиты/Выводы (всего):
TON: ↗️ ${stats.allTime.depositWithdraw.topupTON.toFixed(2)} / ↘️ ${stats.allTime.depositWithdraw.cashoutTON.toFixed(2)}
USD: ↗️ ${stats.allTime.depositWithdraw.topupUSD.toFixed(2)} / ↘️ ${stats.allTime.depositWithdraw.cashoutUSD.toFixed(2)}
Операций: ${stats.allTime.depositWithdraw.topupCount + stats.allTime.depositWithdraw.cashoutCount}</blockquote>

<blockquote>💎 Депозиты/Выводы (за день):
TON: ↗️ ${stats.day.depositWithdraw.topupTON.toFixed(2)} / ↘️ ${stats.day.depositWithdraw.cashoutTON.toFixed(2)}
USD: ↗️ ${stats.day.depositWithdraw.topupUSD.toFixed(2)} / ↘️ ${stats.day.depositWithdraw.cashoutUSD.toFixed(2)}
Операций: ${stats.day.depositWithdraw.topupCount + stats.day.depositWithdraw.cashoutCount}</blockquote>

<blockquote>🔥 Активные сегодня: ${stats.day.activePlayers?.activePlayers ?? 0}
📊 Среднее значение ставок на игрока: ${stats.day.activePlayers?.avgBetsPerPlayer.toFixed(2) ?? 0}</blockquote>
`,
      {
        reply_markup: new InlineKeyboard()
          .text('Рассылка', 'prospam')
          .row()
          .text('Админские рефки', 'reflink:menu')
          .row()
          .text('Пополнить старс баланс боту', 'starbalance:topup')
          .row()
          .url('🤖🟡 НАЧАТЬ ТЕХ.ПЕРЕРЫВ', `https://${CONFIG.DOMAIN}/stopgame234738483748`)
          .row()
          .url('🤖🟢 ПРЕКРАТИТЬ ТЕХ.ПЕРЕРЫВ', `https://${CONFIG.DOMAIN}/startgame234738483748`),
      }
    )
  }
}
