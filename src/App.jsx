import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">StatusHub</h1>
      <p className="text-slate-400">
        Sistema de Gestão Operacional de Ocorrências
      </p>

      <button
        type="button"
        onClick={() => setCount((count) => count + 1)}
        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors"
      >
        Cliques: {count}
      </button>
    </div>
  )
}

export default App