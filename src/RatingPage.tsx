import Chicken from './lottie/Chicken.json'
import Lottie from 'react-lottie-player'

export default function RatingPage() {
  return (
    <div className='flex flex-col items-center w-full h-[41vh] relative top-[8.5vh]'>
      <div className='relative w-full h-full flex items-center justify-center z-10'>
        <div className='relative flex flex-col justify-center items-center w-full h-full mt-[7vh]'>
          <div
            className='relative'
            style={{
              width: '21vh',
              height: '21vh',
            }}
          >
            <Lottie
              animationData={Chicken}
              className='absolute top-0 left-0 w-full h-full saturate-130'
              play={true}
              loop={true}
            />
          </div>
          <div className='text-white text-[4.6vh] font-extrabold z-20 '>ЛИДЕРБОРД</div>
          <div className='max-w-[90vw] text-gray-400 text-[1.8vh] font-bold z-20 text-center'>
            ВЗБИРАЙСЯ НА ВЕРШИНУ ТАБЛИЦЫ И ПОЛУЧАЙ ПРИЗЫ ЧЕМПИОНА!
          </div>
        </div>
      </div>
    </div>
  )
}
