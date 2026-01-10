import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useMainStore from './MainStore'
import { APP_TOKEN } from './config'
import { OPEN_TG_LINK } from './TgWebApp'
import { useShallow } from 'zustand/shallow'

export default function CashoutWindow() {
  const [inputField, setInput] = useState('4')
  const [selectedPercent, setSelectedPercent] = useState<number | null>(null)
  const { balance, popWindow, closeAllWindows } = useMainStore(
    useShallow((st) => ({
      balance: st.balance,
      popWindow: st.popWindow,
      closeAllWindows: st.closeAllWindows,
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
  const tooSmall = numericValue < 0.5

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
      {popWindow === 'cashout' && (
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
              className='mt-[12.5vh] text-white font-bold gap-[2.3vw] flex flex-row items-center'
              style={{
                fontSize: 'max(7vw, 5vh, 5vh)',
                paddingRight: `${33 - inputField.toString().length * 5 + (inputField.includes('.') ? 4 : 0)}vw`,
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

            {/* Сообщение о недостатке средств */}
            {(isOverBalance || tooSmall) && (
              <div className='text-red-500 mt-4 text-lg font-semibold'>
                {isOverBalance ? 'Недостаточно средств' : 'Мин. вывод от 0.5 TON'}
              </div>
            )}

            {/* Кнопка ставки */}
            <div
              className='absolute bottom-[8vh] 
              flex flex-col justify-center items-center
              '
              onClick={async () => {
                try {
                  const response = await fetch(`/cryptoBotCashout?token=${APP_TOKEN}&tonAmount=${numericValue}`)

                  if (!response.ok) {
                    throw new Error(`Server error: ${response.status}`)
                  }

                  const check_link = await response.json()
                  closeAllWindows()
                  await OPEN_TG_LINK(check_link.link)
                } catch (err) {
                  alert('Не удаётся создать чек. Пожалуйста, попробуйте позже.')
                }
              }}
            >
              <span
                className={`h-[8vh] max-w-[85%] rounded-2xl
            font-bold text-[calc(5vw)] transition-all duration-300 
            active:scale-85 active:opacity-70 flex flex-col 
            justify-center items-center`}
              >
                <img src='/cashBtn.webp' className='' />
                <div style={{ textShadow: '0 0 10px #a8a8a8' }} className='absolute text-white'>
                  ВЫВЕСТИ
                </div>
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
