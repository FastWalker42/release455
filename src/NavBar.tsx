import { motion } from 'framer-motion'
import useMainStore from './MainStore'

const tabs = [
  { id: 'game', icon: 'sparks.png' },
  { id: 'rating', icon: 'medal.png' },
  { id: 'profile', icon: 'profile.png' },
]

export default function NavBar() {
  const page = useMainStore((st) => st.page)
  const setPage = useMainStore((st) => st.setPage)

  return (
    <div className='relative flex items-center justify-around bg-[#1c1c1c] rounded-[18vw] w-[62vw] max-w-sm mx-auto'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setPage(tab.id as any)}
          className='relative flex items-center justify-center w-[33%] h-18.5 transition-opacity duration-300'
          style={{ opacity: page === tab.id ? 1 : 0.2 }}
        >
          {page === tab.id && (
            <motion.div
              layoutId='highlight'
              className='absolute inset-0 rounded-[18vw] bg-[#2b2b2b]'
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            />
          )}
          <img src={tab.icon} className='w-16 h-16 relative' />
        </button>
      ))}
    </div>
  )
}
