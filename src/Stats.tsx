import useMainStore from './MainStore'

export default () => {
  const activePlayers = useMainStore((st) => st.activePlayers)

  const freespins = useMainStore((st) => st.freespins)
  const balance = useMainStore((st) => st.balance)
  const page = useMainStore((st) => st.page)
  const popWindow = useMainStore((st) => st.popWindow)
  const openTopupWindow = useMainStore((st) => st.openTopupWindow)
  const closeAllWindows = useMainStore((st) => st.closeAllWindows)

  const freebetSelected = useMainStore((st) => st.freebetSelected)
  const setFreespin = useMainStore((st) => st.setFreespin)

  return (
    <div
      className='fixed ml-[7.5vh] px-4 top-[11vh] flex justify-center gap-[4vw] items-center
       text-[2.5vh] font-semibold z-120 h-min w-full max-w-[35vh]'
    >
      {/* Активные игроки */}
      <div
        style={{ opacity: page === 'game' ? 1.0 : 0 }}
        className='transition-opacity duration-200
        flex items-center gap-1.5 py-[0.8vh] px-[1.8vh] rounded-xl bg-[rgb(23,23,23)]'
      >
        <img className='h-[2.3vh]' src='/globe.webp' />
        <span className='text-[#55FF2F] text-[1.9vh] font-bold'>{activePlayers}</span>
      </div>

      {/* Баланс */}
      <div className='flex items-center gap-[2vw]'>
        <div
          style={{ background: freebetSelected ? 'rgba(23,23,23)' : 'rgba(3,125,196,0.3)' }}
          className='min-w-[8vh] 
        flex items-center justify-center py-[0.8vh] px-[0.8vh] rounded-xl gap-1'
        >
          <img
            style={{ width: '31%', right: '31%' }}
            className='absolute h-[4vh] top-[-2.1vh] 
            transition-all duration-200'
            src='/snow2.png'
          />
          {freebetSelected ? (
            <>
              <img className='relative h-[2.3vh] scale-150' src='/crystallpixel.png' />
              <span className='text-white font-bold text-[1.9vh] whitespace-nowrap'>{freespins}</span>
            </>
          ) : (
            <>
              <img className='h-[2.3vh]' src='/toncoin.webp' />
              <span className='text-white font-bold text-[1.9vh] whitespace-nowrap'>{balance.toFixed(2)}</span>
            </>
          )}
        </div>

        <div className={`${popWindow === 'topup' && 'opacity-50'}`} onClick={openTopupWindow}>
          <img className='h-[2.8vh] mt-0.2 active:opacity-80 active:scale-80' src='/plus.webp' />
        </div>
        <div
          onClick={() => {
            closeAllWindows()
            setFreespin(!freebetSelected)
          }}
        >
          <img className='h-[2.8vh] mt-0.2 active:opacity-80 active:scale-80' src='/swap.webp' />
        </div>
      </div>
    </div>
  )
}
