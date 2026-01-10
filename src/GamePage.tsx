import SpaceBg from './SpaceBg'
import PlayButton from './PlayButton'
import LastCrashes from './LastCrashes'
import RocketBox from './RocketBox'

export default function GamePage() {
  return (
    <div className='absolute w-full flex flex-col items-center'>
      <SpaceBg />
      <RocketBox />

      <div
        className='flex flex-col items-center w-[90vw] max-w-[60vh] h-fit absolute 
      top-[calc(49vh-15vw)] z-10'
      >
        <div className='scale-105 saturate-109'>
          <PlayButton />
        </div>
        <LastCrashes />
      </div>
    </div>
  )
}
