import Lottie from 'react-lottie-player'
import useMainStore from './MainStore'
import { useShallow } from 'zustand/shallow'
import Space from './lottie/Space.json'

export default function SpaceBg() {
  const { coeff, gameActive } = useMainStore(useShallow((st) => ({ coeff: st.coeff, gameActive: st.gameActive })))

  const rotateDeg = !gameActive ? 30 : Math.max(65 - 10 * coeff ** 3, 5)

  return (
    <div className='fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0'>
      <div
        className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
          drop-shadow-2xl min-w-[100vh] min-h-[100vh] transition-all duration-300'
        style={{
          opacity: gameActive ? coeff - 1 : 0,
          transform: `rotate(${rotateDeg}deg)`,
        }}
      >
        <Lottie
          animationData={Space}
          play={true}
          loop={true}
          speed={1 + coeff / 2}
          style={{
            width: '100vh',
            height: 'auto',
          }}
        />
      </div>
    </div>
  )
}
