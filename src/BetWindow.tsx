import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useMainStore from './MainStore'
import { useShallow } from 'zustand/shallow'

export default function BetWindow() {
  const [inputField, setInput] = useState('4')
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null)
  const { balance, popWindow, bet, GAME_STOPPED } = useMainStore(
    useShallow((st) => ({
      balance: st.balance,
      popWindow: st.popWindow,
      bet: st.bet,
      GAME_STOPPED: st.GAME_STOPPED,
    }))
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(',', '.') // заменяем запятую на точку
    if (/^\d*\.?\d*$/.test(value)) {
      if (value.startsWith('0') && value.length > 1 && value[1] !== '.') {
        value = value.replace(/^0+/, '')
      }
      if (value.length > 7) value = value.slice(0, 7)
      if (value === '' || value === '.') value = '0'

      setInput(value)
      setSelectedPercent(null) // 🔹 сбрасываем процент при ручном вводе
    }
  }

  const numericValue = parseFloat(inputField) || 0
  const focusInput = () => inputRef.current?.focus()
  const isOverBalance = numericValue - balance > 0.001
  const isZero = numericValue < 0.01

  const handlePercentClick = (percent: number) => {
    setSelectedPercent(percent)
  }

  // 🔹 следим за балансом и выбранным процентом
  useEffect(() => {
    if (selectedPercent !== null) {
      const newValue = Math.floor(((balance * selectedPercent) / 100) * 100) / 100
      setInput(newValue.toString())
    }
  }, [balance, selectedPercent])

  return (
    <AnimatePresence>
      {popWindow === 'bet' && (
        <>
          {/* Окно ставок */}
          <motion.div
            className='fixed flex flex-col items-center rounded-t-2xl z-85 bottom-0 w-full h-[60vh] bg-[rgb(12,12,12)]'
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <img src='/logo.png' className='h-[8vw] max-h-[4vh] mt-[3vh]' />

            {/* Поле ввода */}
            <div
              className='mt-[8vh] text-white font-bold gap-[2.3vw] flex flex-row items-center'
              style={{
                fontSize: 'max(7vw, 5vh, 5vh)',
                paddingRight: `${30 - inputField.toString().length * 5 + (inputField.includes('.') ? 4 : 0)}vw`,
              }}
            >
              <input
                ref={inputRef}
                type='text'
                inputMode='decimal'
                value={inputField}
                onChange={handleChange}
                className='w-[35vw] text-end focus:outline-none focus:ring-0 bg-transparent'
              />
              <span onClick={focusInput} className='cursor-pointer select-none'>
                TON
              </span>
            </div>

            {/* Кнопки процентов */}
            <div className='flex mt-6 text-white text-lg font-semibold rounded-xl overflow-hidden w-[80%] max-w-[60vh]'>
              {[25, 50, 75, 100].map((p, i) => {
                // 🔹 подсвечиваем все кнопки <= выбранного процента
                const isSelected = selectedPercent !== null && p <= selectedPercent

                return (
                  <button
                    key={p}
                    onClick={() => handlePercentClick(p)}
                    className={`flex-1 px-4 py-2 text-center transition-all duration-150
          ${i !== 0 ? 'border-l border-black' : ''}
          ${
            isSelected
              ? 'bg-[rgb(3,125,196)] text-white' // подсвеченные
              : 'bg-gray-700 text-gray-300' // невыбранные
          }`}
                  >
                    {p}%
                  </button>
                )
              })}
            </div>

            {/* Сообщение о недостатке средств */}
            {(isOverBalance || isZero || GAME_STOPPED) && (
              <div className='text-red-500 mt-4 text-lg font-semibold'>
                {GAME_STOPPED
                  ? 'Технические работы...'
                  : isOverBalance
                  ? 'Недостаточно средств'
                  : 'Недостаточная сумма'}
              </div>
            )}

            {/* Кнопка ставки */}
            <button
              disabled={isOverBalance || isZero || GAME_STOPPED}
              className={`absolute bottom-[8vh] h-[8vh] w-[90%] max-w-[70vh] rounded-2xl font-bold text-3xl transition-all
                ${
                  isOverBalance || isZero || GAME_STOPPED
                    ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                    : 'bg-[rgb(3,125,196)] active:bg-[rgb(27,179,250)] text-white'
                }`}
              onClick={() => bet(Number(numericValue.toFixed(2)))}
            >
              <span
                style={{
                  filter: isOverBalance || isZero ? 'none' : 'drop-shadow(0 0 2vh rgba(255,255,255,0.4))',
                }}
              >
                СДЕЛАТЬ СТАВКУ
              </span>
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
