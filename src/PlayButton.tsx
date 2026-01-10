import { useShallow } from 'zustand/shallow'
import useMainStore from './MainStore'

export default function PlayButton() {
  const coeff = useMainStore((st) => st.coeff)
  const openBetWindow = useMainStore((st) => st.openBetWindow)
  const currentBet = useMainStore((st) => st.currentBet)

  const bet = useMainStore((st) => st.bet)
  const unbet = useMainStore((st) => st.unbet)
  const freebetSelected = useMainStore((st) => st.freebetSelected)

  switch (currentBet?.status) {
    case 'pending':
      return (
        <span
          className='relative flex flex-col justify-center items-center
              active:opacity-90 active:scale-95 transition
              drop-shadow-2xl drop-shadow-[0_0_7px_rgba(0,100,255,1)]'
          onClick={unbet}
        >
          <img src='/snow.png' className='absolute z-30' />
          <img src='/crystal-frame.png' />
          <span
            className='absolute mt-3 flex flex-row items-center justify-center gap-3
                text-white text-[calc(2.4vh+1vw)] 
                font-extrabold drop-shadow-sm drop-shadow-[rgba(0,0,0,0.5)]'
          >
            {Number(currentBet.amount).toFixed(2)} отмена
          </span>
        </span>
      )
    case 'active':
      return (
        <span
          className='relative flex flex-col justify-center items-center
              active:opacity-90 active:scale-95 transition
              drop-shadow-2xl drop-shadow-[0_0_7px_rgba(0,100,255,1)]'
          onClick={unbet}
        >
          <img src='/snow.png' className='absolute z-30' />
          <img src='/crystal-frame.png' />
          <span
            className='absolute mt-3 flex flex-row items-center justify-center gap-3
                text-white text-[calc(2.4vh+1vw)] 
                font-extrabold drop-shadow-sm drop-shadow-[rgba(0,0,0,0.5)]'
          >
            {(Number(currentBet.amount) * coeff).toFixed(2)} забрать
          </span>
        </span>
      )

    //case 'won':
    default:
      return (
        <span
          className='relative flex flex-col justify-center items-center
              active:opacity-90 active:scale-95 transition
              drop-shadow-2xl drop-shadow-[0_0_7px_rgba(0,100,255,1)]'
          onClick={
            freebetSelected
              ? () => {
                  bet(0)
                }
              : openBetWindow
          }
        >
          <img src='/snow.png' className='absolute z-30' />
          <img src='/crystal-frame.png' />
          <span
            className='absolute mt-3
                text-white text-[calc(2.4vh+1vw)] 
                font-extrabold drop-shadow-sm drop-shadow-[rgba(0,0,0,0.5)]'
          >
            {freebetSelected ? 'ФРИ-СПИН' : 'ИГРАТЬ'}
          </span>
        </span>
      )
  }
}
