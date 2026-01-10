import { AnimatePresence, motion } from 'framer-motion'
import { useRef } from 'react'
import useMainStore from './MainStore'
import { useShallow } from 'zustand/shallow'

function CurrentCoeff() {
  const { gameActive, coeff } = useMainStore(useShallow((st) => ({ gameActive: st.gameActive, coeff: st.coeff })))

  const scrollRef = useRef<HTMLDivElement>(null)

  const handleClick = () => {
    scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
  }

  return (
    <motion.span
      key='current'
      onClick={handleClick}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className='bg-[rgba(14,122,223,0.77)] px-2 rounded-[1.1vh] text-center font-semibold shrink-0 cursor-pointer select-none'
    >
      {!gameActive ? 'Ожидание' : `x${coeff.toFixed(2)}`}
    </motion.span>
  )
}

// Основной компонент только с историей
function CrashHistory() {
  const lastCrashes = useMainStore(useShallow((st) => st.lastCrashes))

  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={scrollRef} className='flex flex-row gap-2 overflow-x-auto whitespace-nowrap shrink'>
      <AnimatePresence initial={false}>
        {lastCrashes.map((c, index) => (
          <motion.span
            key={`${c}-${index}`} // лучше использовать уникальный ключ
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{
              layout: { duration: 0.3, ease: 'easeOut' },
              opacity: { duration: 0.3 },
            }}
            className='bg-[rgba(36,36,36,0.87)] px-2 rounded-[1.1vh] text-center font-semibold shrink-0'
          >
            {`x${c}`}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  )
}

// Родительский компонент
export default function LastCrashes() {
  return (
    <div className='z-20 mb-5 pt-1 w-[95%] text-white text-[1.8vh] flex flex-row gap-2'>
      <CurrentCoeff />
      <CrashHistory />
    </div>
  )
}
