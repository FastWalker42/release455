import { USER_DATA } from './TgWebApp'
import useMainStore from './MainStore'
import { useShallow } from 'zustand/shallow'

export default function ProfilePage() {
  const { openCashoutWindow, openTopupWindow, refsInfo } = useMainStore(
    useShallow((st) => ({
      openCashoutWindow: st.openCashoutWindow,
      openTopupWindow: st.openTopupWindow,
      refsInfo: st.refsInfo,
    }))
  )
  return (
    <div className='absolute w-full flex flex-col items-center'>
      <div className='flex flex-col items-center w-full h-[48vh] relative top-[7.8vh]'>
        <div className='relative w-full h-full flex items-center justify-center z-10'>
          <div className='relative flex flex-col justify-center items-center w-full h-full mt-[9vh]'>
            <div
              className='relative'
              style={{
                width: '12vh',
                height: '12vh',
              }}
            >
              <img className='w-full h-full rounded-[50%] bg-radial from-[#333] to-[#000]' src={USER_DATA.photo_url} />
            </div>
            <h1 className='mt-[0.5vh] text-white text-[3.2vh] font-bold z-20'>{USER_DATA.first_name}</h1>
            <div className='w-[90%] flex justify-between mt-[0.7vh] h-[10vh] text-white text-xl font-extrabold'>
              <div
                className='relative w-[45%] flex items-center justify-center rounded-4xl bg-[#1b1b1b] py-2 mx-1 
              active:scale-90 active:opacity-90 transition-all duration-80'
                onClick={openCashoutWindow}
              >
                <img src='/moneybag.png' className='absolute h-[90%] opacity-43 saturate-150' />
                <div className='z-20 text-shadow-[rgba(0,0,0,0.5)] text-shadow-lg'>ВЫВЕСТИ</div>
              </div>
              <div
                className='relative w-[45%] flex items-center justify-center rounded-4xl bg-[#1b1b1b] py-2 mx-1
              active:scale-90 active:opacity-90 transition-all duration-80'
                onClick={openTopupWindow}
              >
                <img src='/crystall.png' className='absolute h-[90%] opacity-55 saturate-180' />
                <div className='z-20 text-shadow-[rgba(0,0,0,0.5)] text-shadow-lg'>ПОПОЛНИТЬ</div>
              </div>
            </div>
            <div
              className='w-[90%] h-[10vh] mt-3.5 relative flex items-center justify-center rounded-4xl bg-[#1b1b1b] mx-1 
            text-white text-2xl font-extrabold'
            >
              <span className='absolute top-2.5 left-4'>
                LEVEL {refsInfo.refLevel} / <span className='text-[#00e013]'>{refsInfo.refPercent}%</span>
              </span>
              <div className='relative w-[100%] h-[1vh] mt-[2.3vh] rounded-full'>
                <div
                  className={`absolute inset-0 top-6/11 mx-4 h-[1.55vh] rounded-full 
                    ${refsInfo.refLevel >= 1 ? 'from-[#00e013]' : 'from-[#101010]'}
                    ${refsInfo.refLevel >= 2 ? 'via-[#00e013]' : 'via-[#101010]'}
                    ${refsInfo.refLevel >= 3 ? 'to-[#00e013]' : 'via-[#101010]'}
                    bg-gradient-to-r`}
                ></div>

                <div
                  className={`absolute left-3 w-[2.5vh] h-[2.5vh] ${
                    refsInfo.refLevel >= 1 ? 'bg-radial from-[#00e013]' : 'bg-radial from-[#181818]  to-[#2f2f2f]'
                  } border-2 border-[#1b1b1b] rounded-full`}
                ></div>
                <div
                  className={`absolute left-13/28 w-[2.5vh] h-[2.5vh]  ${
                    refsInfo.refLevel >= 2 ? 'bg-radial from-[#00e013]' : 'bg-radial from-[#181818]  to-[#2f2f2f]'
                  } border-2 border-[#1b1b1b] rounded-full`}
                ></div>
                <div
                  className={`absolute right-3 w-[2.5vh] h-[2.5vh]  ${
                    refsInfo.refLevel >= 3 ? 'bg-radial from-[#00e013]' : 'bg-radial from-[#181818]  to-[#2f2f2f]'
                  } border-2 border-[#1b1b1b] rounded-full`}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
