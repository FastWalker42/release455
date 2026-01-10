import Lottie from 'react-lottie-player'
import Medal1 from './lottie/Medal1.json'
import Medal2 from './lottie/Medal2.json'
import Medal3 from './lottie/Medal3.json'

import useMainStore from './MainStore'
import { useShallow } from 'zustand/shallow'
import { memo } from 'react'

const medals = [Medal1, Medal2, Medal3]

const UserRow = memo(({ user, index }: { user: any; index: number }) => {
  return (
    <div
      style={{
        background: user.isYou ? 'rgb(40, 44, 44)' : 'none',
        position: user.isYou ? 'sticky' : 'relative',
        zIndex: user.isYou ? 10 : 'auto',
        top: index < 4 ? '0' : 'auto',
        bottom: index >= 4 ? '0' : 'auto',
        boxShadow: user.isYou ? '0 0 14px rgba(0,0,0,0.8)' : 'none',
      }}
      className='rounded-[3.8vh] p-[1vh] w-full h-[10vh] relative flex items-center px-4 gap-2 border-opacity-10'
    >
      <div className='flex justify-center items-center overflow-hidden w-[5vh]'>
        {index < 3 ? (
          <Lottie animationData={medals[index]} className='w-[4vh] h-min flex-shrink-0' speed={1} play={true} />
        ) : (
          <div className='text-[2vh] text-nowrap text-white font-bold'>#{index + 1}</div>
        )}
      </div>
      <img src={user.photoUrl} alt='Avatar' className='w-11 h-11 rounded-full border border-black border-opacity-20' />
      <div
        className='w-[40%] text-[1.7vh] font-bold text-nowrap overflow-hidden
             bg-gradient-to-r from-white via-white to-transparent bg-clip-text text-transparent'
      >
        {user.name ?? 'Аноним'}
      </div>

      <div className='ml-auto text-white text-[1.6vh] font-bold flex flex-row gap-2 items-center justify-center'>
        {user.gamesPlayed} <img className='h-[2.1vh]' src='/boom.png' />
      </div>
      <div
        className='ml-auto text-[1.9vh] w-[27.5vw] font-bold 
              bg-gradient-to-r from-[rgba(255,255,255,0.5)] via-white to-white bg-clip-text text-transparent
                flex flex-row gap-2 items-center justify-end'
      >
        {user.totalAmount.toFixed(2)} <img className='h-[2.1vh]' src='/ton.webp' />
      </div>
    </div>
  )
})

export default function RatingUsers() {
  const { ratingUsers } = useMainStore(
    useShallow((st) => ({
      ratingUsers: st.ratingUsers,
    }))
  )

  return (
    <>
      <div
        className='absolute w-full h-full rounded-[3.8vh]
      bg-gradient-to-b via-80% via-[none] to-[#0f0f0f] z-10
      pointer-events-none'
      ></div>
      <div className='relative'>
        {ratingUsers.map((user: any, index: number) => {
          return <UserRow user={user} index={index} key={index} />
        })}
      </div>
    </>
  )
}
