import { motion } from 'framer-motion'
import useMainStore from './MainStore'
import { useShallow } from 'zustand/shallow'

export default function BlurBg() {
  const { closeAllWindows } = useMainStore(
    useShallow((st) => ({
      closeAllWindows: st.closeAllWindows,
    }))
  )

  return (
    <motion.div
      className='fixed inset-0 
                bg-[#000000] z-60'
      style={{ backdropFilter: 'blur(122px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.7 }}
      exit={{ opacity: 0 }}
      onClick={closeAllWindows}
    />
  )
}
