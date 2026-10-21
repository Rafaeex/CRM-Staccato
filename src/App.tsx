import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Dashboard from './pages/Index'
import Clientes from './pages/Clientes'
import FichaCliente from './pages/FichaCliente'
import Atendimentos from './pages/Atendimentos'
import Agenda from './pages/Agenda'
import Reclamacoes from './pages/Reclamacoes'
import QuebrasBoem from './pages/QuebrasBoem'
import FollowUps from './pages/FollowUps'
import Quadro from './pages/Quadro'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

const App = () => (
  <BrowserRouter>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas do CRM */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/quadro" element={<Quadro />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/clientes/:id" element={<FichaCliente />} />
            <Route path="/atendimentos" element={<Atendimentos />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/reclamacoes" element={<Reclamacoes />} />
            <Route path="/quebras" element={<QuebrasBoem />} />
            <Route path="/follow-ups" element={<FollowUps />} />
          </Route>

          {/* Redirecionamentos de rotas legadas do site antigo para o CRM */}
          <Route path="/agendar" element={<Navigate to="/" replace />} />
          <Route path="/servicos" element={<Navigate to="/" replace />} />
          <Route path="/pedidos" element={<Navigate to="/atendimentos" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </TooltipProvider>
  </BrowserRouter>
)

export default App
