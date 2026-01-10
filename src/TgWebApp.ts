import { DOMAIN } from '../CONFIG.json'

interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
  photo_url?: string
}

const fallbackUser: Partial<TelegramUser> = {
  first_name: 'Вы',
  photo_url: `https://${DOMAIN}/anon.webp`,
}

export const USER_DATA: TelegramUser | Partial<TelegramUser> = (window as any).TG
  ? (window as any).TG.initDataUnsafe.user
  : fallbackUser

export const SHARE_MSG = async () => {
  try {
    let prep_msg = await fetch(`/prepmsg/${USER_DATA.id}`).then((r) => r.json())

    ;(window as any).TG ? (window as any).TG.shareMessage(prep_msg.id) : console.log('no app')
  } catch (error) {
    console.error('Error sharing message:', error)
  }
}

export const OPEN_TG_LINK = async (link: string) => {
  try {
    ;(window as any).TG ? (window as any).TG.openTelegramLink(link) : console.log('no app')
  } catch (error) {
    console.error('Error opening link:', error)
  }
}
