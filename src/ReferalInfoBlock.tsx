import { SHARE_MSG, USER_DATA } from './TgWebApp'
import useMainStore from './MainStore'
import { useShallow } from 'zustand/shallow'

export default function ReferalInfoBlock() {
  const { refsInfo } = useMainStore(
    useShallow((st) => ({
      refsInfo: st.refsInfo,
    }))
  )

  return (
    <div className='bg-gradient-to-b from-[rgba(0,0,0)] via-[rgb(0,0,0)] to-[#222222]'>
      <div className='bg-[rgb(12,12,12)] h-[65%]'>
        <div
          className='w-full h-full flex flex-col items-center justify-top text-white text-lg
        '
        >
          <div
            className='flex mt-[calc(1.3vh+0.3vw)] absolute 
          top-[calc(1.2vh-2vw)] items-start justify-center text-nowrap
          '
          >
            <div className='flex flex-row justify-between'>
              <div
                style={{ transform: 'scale(1,1.6)' }}
                className='text-[calc(2.3vh+3.5vw)] font-extrabold
            pl-[0] mt-[0.7vh]'
              >
                РЕФ СИСТЕМА
              </div>
              <img src='/refbucket.png' className='ml-2 h-[calc(4.6vh+3.4vw)]' />
            </div>
          </div>
          <div
            className='absolute top-[9vh] h-[8vh]
      text-[#999999] text-[1.7vh] font-extrabold 
      flex pl-[0]
      items-center justify-center max-w-[35vh] w-[90%]'
          >
            <div>2.5%, И +10% К КАЖДОМУ УРОВНЮ С ПРОИГРАННЫХ СТАВОК РЕФЕРАЛОВ</div>
          </div>

          <div
            className='flex gap-[7%] items-center justify-center w-[98%]
            max-w-[45vh]
          bottom-[11vh] absolute p-3'
          >
            <div
              className='relative flex items-center justify-center 
              text-[2.5vh] 
              font-extrabold 
       w-[34.5vh] h-[7.5vh]
       active:scale-90 active:opacity-90 transition-all duration-80'
              onClick={async () => {
                await SHARE_MSG()
              }}
            >
              <img
                className='absolute w-full h-full opacity-80'
                style={{ filter: 'drop-shadow(0 0 10px rgba(77,77,255,0.7))' }}
                src='/invitebtn.webp'
              />

              <span className='ml-5 z-10'>ПРИГЛАСИТЬ</span>
              <img className='w-[4vh] z-11' src='/ton.webp' />
            </div>
            <div
              className='w-[12vh] h-[8vh] bg-gradient-to-t from-[#252525] to-[#3a3a3a]
        drop-shadow-[rgba(0,0,0,0.3)] drop-shadow-lg
        flex items-center justify-center 
        rounded-[30vh]
         active:scale-90 active:opacity-90 transition-all duration-80'
              onClick={() => {
                navigator.clipboard.writeText(`t.me/CrystallJet_bot?start=${USER_DATA.id}`)
                alert('Ссылка скопирована!')
              }}
            >
              <img className='w-[4vh] z-11' src='/copy.png' />
            </div>
          </div>

          <div
            className='absolute bottom-[5.8vh] flex-col text-[1.4vh] font-extrabold 
            max-w-[35vh] w-[90%] px-3 flex justify-between
            gap-3'
            style={{ transform: 'scale(1.05,1)' }}
          >
            <div
              className='flex flex-row gap-3 items-center
             bg-clip-text text-transparent bg-gradient-to-r from-[#00d3eb] to-[#4800ff]'
            >
              ДОХОД С РЕФЕРАЛОВ:
              <div
                className='flex flex-row gap-1 justify-between
              absolute right-3'
              >
                <div
                  className='text-white text-center pr-3 px-4 bg-[#0c0c0c] w-[24vw] max-w-[12vh]
                outline-3 outline-[#171717]
                rounded-xl'
                >
                  {refsInfo.refTotalMoney}
                </div>
                <img className='w-[2vh] h-[2vh]' src='/ton.webp' />
              </div>
            </div>
            <div
              className='flex flex-row gap-3 items-center
             bg-clip-text text-transparent bg-gradient-to-r from-[#00d3eb] to-[#4800ff]'
            >
              ВСЕГО ПРИГЛАШЕНО:
              <div
                className='flex flex-row gap-1 justify-between
              absolute right-3'
              >
                <div
                  className='text-white text-center pr-3 px-4 bg-[#0c0c0c] w-[24vw] max-w-[12vh]
                outline-3 outline-[#171717]
                rounded-xl'
                >
                  {refsInfo.refsCount}
                </div>
                <img className='w-[2vh] h-[2vh]' src='/ref.png' />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
