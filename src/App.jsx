import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import NovoChamado from "./pages/NovoChamado";
import ImportarChamados from "./pages/ImportarChamados";
import Configuracoes from "./pages/Configuracoes";
import RedefinirSenha from "./pages/RedefinirSenha";

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/novo" element={<NovoChamado />} />
        <Route path="/importar" element={<ImportarChamados />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      </Route>
    </Routes>
  );
}
