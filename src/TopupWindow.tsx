import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useMainStore from './MainStore'
import { APP_TOKEN } from './config'
import { OPEN_TG_LINK } from './TgWebApp'
import { useShallow } from 'zustand/shallow'

export default function TopupWindow() {
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

  const [selectedMethod, setSelectedMethod] = useState('CRYPTO')
  const [selectedCoin, setSelectedCoin] = useState('TON')

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
      {popWindow === 'topup' && (
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

            <div className='relative bg-[#1c1c1c] flex mt-6 text-white text-[2vh] font-extrabold rounded-xl overflow-hidden w-[80%] max-w-[60vh] h-[5vh]'>
              {/* Анимированный слайдер */}
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className='absolute top-0 left-0 h-full w-1/2 bg-[#1a74fc] rounded-xl z-0'
                animate={{ left: selectedMethod === 'CRYPTO' ? 0 : '50%' }}
              />

              <div
                className='relative flex-1 flex items-center justify-center cursor-pointer z-10'
                onClick={() => setSelectedMethod('CRYPTO')}
              >
                CRYPTOBOT
              </div>
              <div
                className='relative flex-1 flex items-center justify-center cursor-pointer z-10'
                onClick={() => setSelectedMethod('STARS')}
              >
                ЗВЕЗДЫ
              </div>
            </div>

            <div
              className='mt-[5vh] text-white font-bold gap-[2.3vw] flex flex-row items-center'
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
              <span
                onClick={focusInput}
                className={`cursor-pointer select-none transition-all duration-200 ${
                  selectedMethod === 'STARS' && 'text-[3vh]'
                }
                text-nowrap overflow-hidden`}
              >
                {selectedMethod === 'CRYPTO' ? selectedCoin : 'КОЛ-ВО'}
              </span>
            </div>

            {isZero && <div className='text-red-500 mt-0 text-lg font-semibold'>Недостаточная сумма</div>}

            <div className='relative flex justify-center items-center w-full h-[8vh]'>
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className='absolute 
                top-[1vh] 
                flex flex-row                 
                items-center justify-center
                gap-[5vh]'
                animate={{ opacity: selectedMethod === 'CRYPTO' ? 1 : 0 }}
              >
                <div
                  className=' bg-[#169b5f8c] px-[2.5vh] py-[0.5vh] rounded-[2vh] transition-all duration-150'
                  style={{ opacity: selectedCoin === 'USDT' ? '1' : '0.5' }}
                  onClick={() => setSelectedCoin('USDT')}
                >
                  <img className='w-[6vh] h-[6vh] drop-shadow-md drop-shadow-[rgba(0,0,0,0.4)]' src='/usdt.png' />
                </div>
                <div
                  className='bg-[#009dff6d] px-[2.5vh] py-[0.5vh] rounded-[2vh] transition-all duration-150'
                  style={{ opacity: selectedCoin === 'TON' ? '1' : '0.5' }}
                  onClick={() => setSelectedCoin('TON')}
                >
                  <img className='w-[6vh] h-[6vh] drop-shadow-md drop-shadow-[rgba(0,0,0,0.4)]' src='/ton.webp' />
                </div>
              </motion.div>

              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className='absolute 
                top-[1vh] 
                flex flex-row                 
                items-center justify-center
                gap-[5vh]'
                animate={{ opacity: selectedMethod === 'STARS' ? 1 : 0 }}
              >
                <div className='bg-[#c59b0174] px-[2.5vh] py-[0.5vh] rounded-[2vh] transition-all duration-150'>
                  <img className='w-[6vh] h-[6vh] drop-shadow-md drop-shadow-[rgba(0,0,0,0.4)]' src='/star.webp' />
                </div>
              </motion.div>
            </div>

            {/* Кнопка ставки */}
            <AnimatePresence mode='wait'>
              {selectedMethod === 'CRYPTO' ? (
                <motion.div
                  key='cryptotopup'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className='absolute bottom-[8vh] 
              flex flex-col justify-center items-center
             '
                  onClick={async () => {
                    let invoice_link = await fetch(
                      `/cryptoBotTopup?token=${APP_TOKEN}&amount=${numericValue}&currency=${selectedCoin}`
                    ).then((r) => r.json())
                    closeAllWindows()
                    await OPEN_TG_LINK(invoice_link.link)
                  }}
                >
                  <span
                    className={`h-[8vh] max-w-[85%] rounded-2xl
            font-bold text-[calc(5vw)] transition-all duration-300 
            active:scale-85 active:opacity-70 flex flex-col justify-center items-center`}
                  >
                    <img src='/cashBtn.webp' className='' />
                    <div style={{ textShadow: '0 0 10px #a8a8a8' }} className='absolute text-white'>
                      ПОПОЛНИТЬ
                    </div>
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  key='starstopup'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }}
                  className='absolute bottom-[10vh] text-[5vw]
              flex flex-col justify-center items-center text-[#8f8f8f] font-extrabold
              text-shadow-3xl text-shadow-black'
                >
                  Скоро...
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
