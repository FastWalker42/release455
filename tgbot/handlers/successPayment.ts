import { Context } from 'grammy'

export default async (ctx: Context) => {
  console.log(JSON.stringify(ctx.message?.successful_payment!))

  const { total_amount, invoice_payload } = ctx.message?.successful_payment!

  await ctx.reply(`Успешное пополнение!
<pre><code class="language-Дата">🕒${new Date()}</code></pre>
<b>🚀 Пополнено на ${total_amount}⭐️</b>`)
}
