import { motion, AnimatePresence } from 'framer-motion'
import Graph from './Graph'
import useMainStore from './MainStore'
import Rocket from './Rocket'
import { useShallow } from 'zustand/shallow'

export default function RocketBox() {
  const { gameActive, timeout, lastCrashes } = useMainStore(
    useShallow((st) => ({
      gameActive: st.gameActive,
      lastCrashes: st.lastCrashes,
      timeout: st.timeout,
    }))
  )
  const lastCrash = lastCrashes.length > 0 ? lastCrashes[0] : 0

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000) - 1
    return { seconds: Math.max(seconds, 0) }
  }

  const time = formatTime(timeout)

  return (
    <div className='flex flex-col items-center w-full h-[51vh] relative'>
      <div className='absolute inset-0 z-0'>{gameActive && <Graph />}</div>

      <div className='relative w-full h-full flex items-center justify-center z-10 mr-10'>
        <Rocket />
      </div>

      <div
        className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 
        drop-shadow-xl drop-shadow-black font-extrabold text-center mt-[3.5vh]'
      >
        <AnimatePresence mode='wait'>
          {!gameActive &&
            (time.seconds > 3 ? (
              <motion.div
                key='lastCrash'
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25 }}
                className='text-shadow-xl text-shadow-black'
              >
                <span className='text-[red] text-[8vh] font-bold drop-shadow-lg'>x{Math.floor(lastCrash)}</span>
                <span className='text-red-500 opacity-80 text-[4vh] font-bold drop-shadow-lg'>
                  {Math.floor((lastCrash - Math.floor(lastCrash)) * 100)
                    .toString()
                    .padStart(2, '0')}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key={time.seconds}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: [1, 1.35, 1] }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className='flex items-baseline justify-center'
              >
                <span className='text-white text-[8vh] font-bold drop-shadow-lg'>{time.seconds}</span>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
