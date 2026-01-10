import Lottie from 'react-lottie-player'
import useMainStore from './MainStore'
import { useShallow } from 'zustand/shallow'
import MoneyRain from './lottie/MoneyRain.json'

export default () => {
  const { gameActive, coeff, moneyAnim, setMoneyAnim } = useMainStore(
    useShallow((st) => ({
      gameActive: st.gameActive,
      coeff: st.coeff,
      moneyAnim: st.moneyAnim,
      setMoneyAnim: st.setMoneyAnim,
    }))
  )

  return (
    moneyAnim && (
      <div className='fixed z-1 saturate-120 opacity-75'>
        <Lottie
          animationData={MoneyRain}
          speed={coeff - 0.3}
          play={true}
          loop={false}
          style={{
            transform: `rotate(${!gameActive ? 0 : Math.min(0 - 10 * coeff ** 2, 0)}deg)`,
          }}
          onComplete={() => setMoneyAnim(false)}
        />
      </div>
    )
  )
}
