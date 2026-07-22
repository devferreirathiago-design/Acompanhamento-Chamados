import { Outlet, NavLink } from 'react-router-dom'

function MainLayout() {
  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-slate-700">
          <h1 className="text-xl font-bold">StatusHub</h1>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700'
              }`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/chamados"
            end 
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700'
              }`
            }
          >
            Chamados
          </NavLink>
          <NavLink
            to="/chamados/novo"
            end 
            className={({ isActive }) =>
              `px-3 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700'
              }`
            }
          >
            Novo Chamado
          </NavLink>
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col">
        {/* Cabeçalho */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6">
          <span className="text-slate-600">
            Sistema de Gestão Operacional de Chamados
          </span>
        </header>

        {/* Aqui entra o conteúdo de cada página */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout