import Lottie from 'react-lottie-player'
import useMainStore from './MainStore'
import Symbol2025 from './lottie/2025.json'

export default () => {
  const claimFreespins = useMainStore((st) => st.claimFreespins)
  const setPage = useMainStore((st) => st.setPage)

  return (
    <div
      className='absolute flex flex-col z-200 
    bg-black w-screen h-screen'
    >
      <img className='absolute top-0 w-screen h-screen opacity-90' src='/giftbg.jpeg' />

      <div className='relative flex flex-col items-center justify-center top-[12vh]'>
        <img className='drop-shadow-[rgba(0,0,0,0.8)] drop-shadow-xl' src='/freespintext.png' />

        <Lottie animationData={Symbol2025} className='w-[22vh]' play={true} loop={true} speed={0.7} />

        <div
          className='relative flex flex-col justify-center items-center
          top-[9vh]
          active:opacity-90 active:scale-55 
          transition-all duration-200'
          onClick={() => {
            claimFreespins()
            setPage('game')
          }}
        >
          <img
            className='relative flex flex-col justify-center items-center
           z-30 w-[53vh]'
            src='/snow.png'
          />

          <div
            className='top-[3vh] absolute flex flex-col justify-center items-center
              w-[36vh]
               bg-[#00d2f7cc] saturate-170
shadow-lg shadow-[rgba(0,0,0,0.5)] 
text-shadow-lg text-shadow-[rgba(0,0,0,0.25)]       
 text-white font-extrabold
 rounded-4xl
        text-[4vh] py-[2vh] px-[8vh]'
          >
            <span className='relative flex flex-row items-center justify-center gap-[1vh]'>ЗАБРАТЬ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
