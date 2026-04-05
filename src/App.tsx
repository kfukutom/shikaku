import { useState } from 'react'

// temporary for initial commit, got rid of all vite template stuff.

export default function App() {
  const [score, setScore] = useState(0)

  function handleScore() {
    setScore(prev => prev >= 100 ? 0 : prev + 1)
  }

  return (
    <div className="flex flex-col items-center align-center p-10 gap-10">
      <p className="font-bold">Score: {score}</p>
      <button onClick={handleScore} className="bg-blue-300 hover:bg-blue-100 ease-in cursor-pointer p-4">
        Click to add points
      </button>
    </div>
  )
}