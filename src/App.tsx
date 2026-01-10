import OrientationLock from './OrientationLock'
import BottomBox from './BottomBox'
import BetWindow from './BetWindow'
import useMainStore from './MainStore'

import { DOMAIN } from '../CONFIG.json'

import Stats from './Stats'
import TopupWindow from './TopupWindow'
import CashoutWindow from './CashoutWindow'
import { lazy, useEffect, useState } from 'react'
import { APP_TOKEN } from './config'

import BlurBg from './BlurBg'
import { AnimatePresence, motion } from 'framer-motion'
import FreespinPage from './FreespinPage'
import MoneyRain from './MoneyRain'

const GamePage = lazy(() => import('./GamePage'))
const RatingPage = lazy(() => import('./RatingPage'))
const ProfilePage = lazy(() => import('./ProfilePage'))

const imagesToPreload = [
  '/starsbg.webp',
  '/logo.png',
  '/sparks.png',
  '/medal.png',
  '/profile.png',
  '/refbucket.png',
  '/invitebtn.webp',
  '/copy.png',
  '/invitebtn.webp',
  '/moneybag.png',
  '/crystall.png',
  '/anon.webp',
  '/ton.webp',
  '/usdt.png',
  '/starsbg.webp',
  '/cashBtn.webp',
  '/giftbg.jpeg',
  '/toncoin.webp',
  '/snow2.png',
  '/crystallpixel.png',
]

function preloadImages(urls: string[]) {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image()
          img.src = url
          img.onload = () => resolve()
          img.onerror = () => reject()
        })
    )
  )
}

function App() {
  const page = useMainStore((st) => st.page)
  const setPage = useMainStore((st) => st.setPage)

  const setRefsInfo = useMainStore((st) => st.setRefsInfo)
  const connectWebSocket = useMainStore((st) => st.connectWebSocket)
  const cleanupWebSocket = useMainStore((st) => st.cleanupWebSocket)

  const fetchRatingUsers = useMainStore((st) => st.fetchRatingUsers)
  const popWindow = useMainStore((st) => st.popWindow)

  const setFreespin = useMainStore((st) => st.setFreespin)
  const balance = useMainStore((st) => st.balance)

  const isConnected = useMainStore((st) => st.isConnected)

  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded && isConnected && (window as any).hideLoadingScreen) {
      ;(window as any).hideLoadingScreen()
    }
  }, [loaded, isConnected])

  useEffect(() => {
    const MIN_LOADING_TIME = 1000
    const startedTime = Date.now()

    fetch(`https://${DOMAIN}/refsInfo?token=${APP_TOKEN}`)
      .then((r) => r.json())
      .then((d) => setRefsInfo(d))

    fetch(`https://${DOMAIN}/freespinAvailable?token=${APP_TOKEN}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.available) {
          setPage('freespin')
        }
      })

    setFreespin(balance > 0.1)

    preloadImages(imagesToPreload).then(() => {
      const elapsed = Date.now() - startedTime
      const remaining = MIN_LOADING_TIME - elapsed

      if (remaining > 0) {
        setTimeout(() => setLoaded(true), remaining)
      } else {
        setLoaded(true)
      }
    })

    fetchRatingUsers()

    // Подключаем WebSocket
    connectWebSocket()

    return () => {
      // Очищаем WebSocket при размонтировании
      cleanupWebSocket()
    }
  }, [connectWebSocket, cleanupWebSocket, setRefsInfo, setPage, fetchRatingUsers])

  return (
    <div
      className='flex flex-col items-center select-none overflow-hidden relative'
      style={{
        backgroundImage: "url('/starsbg.webp')",
        backgroundSize: 'auto 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100vw',
        height: '100vh',
        minHeight: '100vh',
        maxWidth: '60vh',
      }}
    >
      {popWindow && <BlurBg />}

      <OrientationLock />
      <Stats />
      <MoneyRain />
      <AnimatePresence mode='wait'>
        <motion.div
          key={page + '-overlay'} // важно! чтобы при смене страницы анимация перезапускалась
          initial={{ opacity: 0 }} // стартуем с прозрачного
          animate={{ opacity: 0 }} // быстро заливаем чёрным
          exit={{ opacity: 0.4 }} // медленно уходим в прозрачность
          variants={{
            initial: { opacity: 0 },
            animate: {
              opacity: 0,
              transition: {
                duration: 0.25,
                ease: 'easeOut',
              },
            },
            exit: {
              opacity: 0.4,
              transition: {
                duration: 0.25,
                ease: 'easeInOut',
              },
            },
          }}
          className='absolute inset-0 bg-black pointer-events-none z-10'
        />
        <motion.div
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className='absolute inset-0 w-full h-full flex flex-col items-center'
        >
          {page === 'game' && <GamePage />}
          {page === 'rating' && <RatingPage />}
          {page === 'profile' && <ProfilePage />}
          {page === 'freespin' && <FreespinPage />}
        </motion.div>
      </AnimatePresence>
      <BottomBox />
      {page === 'game' && <BetWindow />}
      <TopupWindow />
      {page === 'profile' && <CashoutWindow />}
    </div>
  )
}

export default App
