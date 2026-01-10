import bot from '../init'

export async function mapGifts() {
  const giftInfo = await bot.api.getAvailableGifts()
  if (!giftInfo || !Array.isArray(giftInfo.gifts)) return []

  return giftInfo.gifts.map((gift) => ({
    id: gift.id,
    emoji: gift.sticker?.emoji ?? null,
    price: gift.star_count,
  }))
}

const AVAILABLE_GIFTS = await mapGifts()
export default AVAILABLE_GIFTS
