import { useEffect, useState } from 'react'

export default function OrientationLock() {
  const [isLandscape, setIsLandscape] = useState(false)

  useEffect(() => {
    function checkOrientation() {
      const landscape = window.innerWidth > window.innerHeight
      setIsLandscape(landscape)
    }

    checkOrientation()
    window.addEventListener('resize', checkOrientation)
    window.addEventListener('orientationchange', checkOrientation)

    return () => {
      window.removeEventListener('resize', checkOrientation)
      window.removeEventListener('orientationchange', checkOrientation)
    }
  }, [])

  if (!isLandscape) return null

  return (
    <div className='fixed inset-0 z-100 flex items-center justify-center bg-black text-white text-center p-4'>
      <p className='text-lg md:text-2xl'>Пожалуйста, переверните устройство в вертикальную ориентацию!</p>
    </div>
  )
}
