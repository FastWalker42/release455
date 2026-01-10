import NavBar from './NavBar'
import useMainStore from './MainStore'
import { lazy, Suspense } from 'react'

const LastPlayersBlock = lazy(() => import('./LastPlayersBlock'))
const ReferalInfoBlock = lazy(() => import('./ReferalInfoBlock'))
const RatingUsers = lazy(() => import('./RatingUsers'))

export default function BottomBox() {
  const page = useMainStore((st) => st.page)

  let height, pb, bg
  let content

  switch (page) {
    case 'game':
      height = '37.8vh'
      pb = '0'

      bg = 'rgba(15,15,15)'

      content = <LastPlayersBlock />

      break
    case 'rating':
      height = '45vh'
      pb = '4.5vh'

      bg = 'rgba(55,55,55, 0.3)'

      content = <RatingUsers />

      break
    case 'profile':
      height = '38vh'
      pb = '0'

      bg = 'rgba(15,15,15)'

      content = <ReferalInfoBlock />
  }

  return (
    <div className='fixed bottom-[5vh] flex items-center'>
      <div
        style={{ height: height, background: bg, paddingBottom: pb }}
        className={`overflow-auto
        w-[90vw] rounded-[3.8vh] border border-none border-opacity-10 flex flex-col`}
      >
        <Suspense
          fallback={
            <>
              <div
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(90deg, #050505, #111, #050505)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2.5s linear infinite',
                  borderRadius: '3.8vh',
                }}
              ></div>

              <style>{`
                @keyframes shimmer {
                  0% {
                    background-position: 200% 0;
                  }
                  100% {
                    background-position: -200% 0;
                  }
                }
              `}</style>
            </>
          }
        >
          {content}
        </Suspense>
      </div>
      <div
        style={{ filter: 'drop-shadow(0 -4px 3px rgba(0,0,0,0.3))' }}
        className='z-50 absolute self-end bottom-[-3.5vh] w-full flex items-center justify-center'
      >
        <NavBar />
      </div>
    </div>
  )
}
