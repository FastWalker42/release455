import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import useMainStore from './MainStore'
import { useMemo } from 'react'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

export const options = {
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: 0 },
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
  elements: {
    point: { radius: 0 },
    line: { tension: 0.3 },
  },
  scales: {
    x: {
      display: false,
      grid: { display: false },
      border: { display: false },
      offset: false,
      min: 0,
      max: 10, // ← прижатие по X (раньше было 10.5)
    },
    y: {
      display: false,
      grid: { display: false },
      border: { display: false },
      min: 0,
      max: 20,
    },
  },
}

const generateData = (coeff: number) => {
  const labels: number[] = []
  const dataPoints: number[] = []

  for (let x = 0; x <= 10; x++) {
    labels.push(x)

    const effectiveCoeff = coeff <= 1.2 ? coeff : 1.2 + (coeff - 1.2) * 0.05

    let value = Math.pow(effectiveCoeff, x / 0.9)

    const zigzag = 1 + Math.sin(x / Math.random()) * 0.1
    dataPoints.push(value * zigzag)
  }

  return { labels, dataPoints }
}

export default function Graph() {
  const gameActive = useMainStore((st) => st.gameActive)
  const coeff = useMainStore((st) => st.coeff)

  const { labels, dataPoints } = useMemo(() => generateData(!gameActive ? 1 : coeff), [gameActive, coeff])

  const data = {
    labels,
    datasets: [
      {
        data: dataPoints,
        borderColor: 'rgb(0,255,0)',
        borderWidth: 14,
        pointStyle: false,
        backgroundColor: 'rgba(0,0,0,0)',
        clip: false,
        pointRadius: 0,
      },
    ],
  }

  return (
    <div
      className='relative w-[105vw] h-full overflow-hidden left-[-2.5vw]'
      style={{ padding: '0 -30px', filter: 'drop-shadow(0 0 6px #1AFF18)' }}
    >
      <Line options={options} data={data} />
    </div>
  )
}
