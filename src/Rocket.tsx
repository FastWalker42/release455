import Lottie from 'react-lottie-player'
import useMainStore from './MainStore'
import { useEffect, useState } from 'react'
import Firework from './lottie/Firework.json'
import Boom from './lottie/Boom.json'

import { useShallow } from 'zustand/shallow'

export default function Rocket() {
  const { gameActive, coeff, timeout, rocketAnim, setRocketAnim } = useMainStore(
    useShallow((st) => ({
      gameActive: st.gameActive,
      coeff: st.coeff,
      timeout: st.timeout,
      rocketAnim: st.rocketAnim,
      setRocketAnim: st.setRocketAnim,
    }))
  )

  const SEGMENTS = {
    ignite: [0, 38],
    fly: [39, 52],
    boom: [53, 85],
    reload: [86, 145],
    static: [0, 0],
  }

  useEffect(() => {
    if (gameActive && !['ignite', 'fly'].includes(rocketAnim)) {
      setRocketAnim('ignite')
    } else if (!gameActive && !['boom', 'reload', 'static'].includes(rocketAnim)) {
      setRocketAnim('boom')
    }
  }, [gameActive])

  const handleComplete = () => {
    switch (rocketAnim) {
      case 'ignite':
        setRocketAnim('fly')
        break
      case 'boom':
        setRocketAnim('reload')
        break
      case 'reload':
        setRocketAnim('static')
        break
    }
  }

  return (
    <div className='relative flex justify-center items-center w-full h-full mt-[7vh]'>
      <div
        className='relative'
        style={{
          transform: 'translateX(8px)',
          width: '21vh',
          height: '21vh',
        }}
      >
        <Lottie
          animationData={Firework}
          className='absolute top-0 left-0 w-full h-full drop-shadow-2xl drop-shadow-black saturate-130'
          style={{
            transform: `rotate(${!gameActive ? 30 : Math.max(30 - 10 * coeff ** 2, -35)}deg)`,
            opacity: !gameActive && timeout < 3600 ? 0.4 : 1, // <-- здесь
            transition: 'opacity 0.5s ease', // плавный переход
          }}
          play={true}
          loop={rocketAnim === 'fly'}
          speed={rocketAnim === 'boom' ? 0.55 : Math.min(1.5, coeff / 1.6)}
          segments={SEGMENTS[rocketAnim]}
          onComplete={handleComplete}
        />

        {rocketAnim === 'boom' && (
          <Lottie
            animationData={Boom}
            className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 drop-shadow-2xl drop-shadow-black'
            style={{
              width: '52vh',
              height: '52vh',
            }}
            play
            loop={false}
            speed={1}
            segments={[20, 75]}
          />
        )}
      </div>
    </div>
  )
}
