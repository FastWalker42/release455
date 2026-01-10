import { motion, AnimatePresence } from 'framer-motion'
import useMainStore from './MainStore'
import Lottie from 'react-lottie-player'

import Medal1 from './lottie/Medal1.json'
import Medal2 from './lottie/Medal2.json'
import Medal3 from './lottie/Medal3.json'
import Timer from './lottie/Timer.json'

import { useShallow } from 'zustand/shallow'

import { USER_DATA } from './TgWebApp'

export default function LastPlayersBlock() {
  const coeff = useMainStore((st) => st.coeff)
  const lastPlayers = useMainStore(useShallow((st) => st.lastPlayers))
  const internalId = useMainStore((st) => st.internalId)
  const currentBet = useMainStore((st) => st.currentBet)

  // Находим, есть ли наш игрок уже в списке lastPlayers
  const myPlayerInList = lastPlayers.find((p) => p.internalId === internalId)

  // Формируем отображаемый список
  const displayPlayers = myPlayerInList
    ? lastPlayers
    : currentBet && currentBet.status !== 'none' && internalId
    ? [
        {
          name: USER_DATA.first_name,
          internalId: internalId,
          bet: currentBet,
        },
        ...lastPlayers,
      ]
    : lastPlayers

  // Создаем карту для быстрого поиска индекса игрока в оригинальном списке lastPlayers
  const lastPlayersIndexMap = new Map()
  lastPlayers.forEach((player, index) => {
    lastPlayersIndexMap.set(player.internalId, index)
  })

  return (
    <AnimatePresence>
      {displayPlayers.length === 0 && (
        <div className='w-full h-[10vh] absolute flex justify-center items-center px-4 gap-4 border border-black border-opacity-10'>
          <div className='flex flex-col justify-center'>
            <span className='text-[#555] text-[2vh] font-semibold flex items-center gap-2'>
              <span className='block'>Ожидание ставок...</span>
            </span>
          </div>
        </div>
      )}

      {displayPlayers.map((player, index) => {
        const bet = player.bet
        const betColor = bet?.status === 'lost' ? 'red' : bet?.status === 'won' ? 'lime' : 'white'

        // Коэффициент для отображения
        const displayCoeff =
          bet?.status === 'won' || bet?.status === 'lost'
            ? bet.finalCoeff?.toFixed(2) ?? '-'
            : bet?.status === 'active'
            ? coeff.toFixed(2)
            : bet?.status === 'pending'
            ? '—'
            : '-'

        // Расчёт суммы выигрыша/ставки
        let displayAmount = bet?.amount ?? 0

        if (bet) {
          if (bet.status === 'won' || bet.status === 'lost') {
            displayAmount = displayAmount * (bet.finalCoeff ?? 1)
          } else if (bet.status === 'active') {
            displayAmount = displayAmount * coeff
          }
        }

        // Медали и таймер
        let animationData = null

        // Проверяем статус pending для таймера
        if (bet?.status === 'pending') {
          animationData = Timer
        } else {
          // Получаем индекс игрока в оригинальном списке lastPlayers
          const originalIndex = lastPlayersIndexMap.get(player.internalId)

          // Медали выдаём только если игрок есть в lastPlayers и находится в топ-3
          if (originalIndex !== undefined && originalIndex < 3) {
            if (originalIndex === 0) animationData = Medal1
            else if (originalIndex === 1) animationData = Medal2
            else if (originalIndex === 2) animationData = Medal3
          }
        }

        const isMe = player.internalId === internalId

        return (
          <motion.div
            key={(player.internalId || player.name || 'user' + index) + player.bet?.gameId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className='w-full h-[10vh] relative flex items-center px-4 gap-4 bg-[rgb(15,15,15)] border border-black border-opacity-10'
          >
            <img
              src={isMe ? USER_DATA.photo_url : `/photo/${player.internalId}`}
              alt='Avatar'
              className='w-15 h-15 rounded-full border border-black border-opacity-20'
            />
            <div className='flex flex-col justify-center'>
              <span className='text-white font-semibold flex items-center gap-2'>
                <span className='truncate max-w-[20vw] block'>{player.name}</span>
                {animationData && (
                  <Lottie animationData={animationData} className='w-[4vh] h-min flex-shrink-0' speed={1} play={true} />
                )}
              </span>
              <span className='text-gray-400 text-xs'>{displayCoeff !== '-' ? `x${displayCoeff}` : '-'}</span>
            </div>
            <div
              style={{ color: betColor }}
              className='ml-auto text-2xl font-bold flex flex-row gap-2 items-center justify-center'
            >
              {displayAmount.toFixed(2)} <img className='h-[2.3vh]' src='/ton.webp' alt='TON' />
            </div>
          </motion.div>
        )
      })}
    </AnimatePresence>
  )
}
