import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import Accueil from './components/accueil/Accueil'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
import DashboardAdmin from './components/dashboard/DashboardAdmin'
import DashboardMembre from './components/dashboard/DashboardMembre'
import DashboardJewrin from './components/dashboard/DashboardJewrin'
import Evenements from './components/informations/Evenements'
import FinanceParDahira from './components/finance/FinanceParDahira'
import FinanceHierarchie from './components/finance/FinanceHierarchie'
import LeveesFonds from './components/finance/LeveesFonds'
import ProgrammeKamil from './components/culturelle/ProgrammeKamil'
import MesProgressions from './components/culturelle/MesProgressions'
import ValidationsKamil from './components/culturelle/ValidationsKamil'
import ActivitesReligieuses from './components/culturelle/ActivitesReligieuses'
import Messagerie from './components/communication/Messagerie'
import Notifications from './components/communication/Notifications'
import ProjetsSociaux from './components/sociale/ProjetsSociaux'
import Reunions from './components/organisation/Reunions'
import SectionsDahiras from './components/organisation/SectionsDahiras'
import AdminOrganisation from './components/organisation/AdminOrganisation'
import Conservatoire from './components/conservatoire/Conservatoire'
import Bibliotheque from './components/bibliotheque/Bibliotheque'
import Cours from './components/scientifique/Cours'
import MonProfil from './components/comptes/MonProfil'
import GestionMembres from './components/comptes/GestionMembres'

const JEWRINE_ROLES = [
  'jewrin',
  'jewrine_conservatoire',
  'jewrine_finance',
  'jewrine_culturelle',
  'jewrine_sociale',
  'jewrine_communication',
  'jewrine_organisation',
]

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  const isJewrine =
    !!user?.role &&
    (user.role === 'jewrin' ||
      user.role.toLowerCase().startsWith('jewrine_'))
  const defaultDashboard = user?.role === 'admin' ? '/admin' : isJewrine ? '/jewrin' : '/membre'
  return (
    <Routes>
      {/* Racine : par défaut on affiche l'accueil (ou redirection dashboard si connecté) */}
      <Route path="/" element={user ? <Navigate to={defaultDashboard} replace /> : <Accueil />} />
      <Route path="/accueil" element={<Accueil />} />
      <Route path="/login" element={user ? <Navigate to={defaultDashboard} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={defaultDashboard} replace /> : <Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={defaultDashboard} replace />} />
        <Route path="admin" element={<ProtectedRoute roles={['admin']}><DashboardAdmin /></ProtectedRoute>} />
        <Route path="membre" element={<ProtectedRoute roles={['membre']}><DashboardMembre /></ProtectedRoute>} />
        <Route path="jewrin" element={<ProtectedRoute roles={JEWRINE_ROLES}><DashboardJewrin /></ProtectedRoute>} />
        <Route path="informations/evenements" element={<Evenements />} />
        <Route path="finance/cotisations" element={<Navigate to="/finance/par-dahira" replace />} />
        <Route path="finance/par-dahira" element={<ProtectedRoute roles={['admin', 'jewrine_finance']}><FinanceParDahira /></ProtectedRoute>} />
        <Route path="finance/hierarchie" element={<ProtectedRoute roles={['admin', 'jewrine_finance']}><FinanceHierarchie /></ProtectedRoute>} />
        <Route path="finance/levees-fonds" element={<LeveesFonds />} />
        <Route path="culturelle/kamil" element={<ProgrammeKamil />} />
        <Route path="culturelle/mes-progressions" element={<MesProgressions />} />
        <Route path="culturelle/validations" element={<ValidationsKamil />} />
        <Route path="culturelle/activites-religieuses" element={<ActivitesReligieuses />} />
        <Route path="communication/messagerie" element={<Messagerie />} />
        <Route path="communication/notifications" element={<Notifications />} />
        <Route path="sociale/projets" element={<ProjetsSociaux />} />
        <Route path="organisation/reunions" element={<Reunions />} />
        <Route path="organisation/sections-dahiras" element={<SectionsDahiras />} />
        <Route path="organisation/admin" element={<ProtectedRoute roles={['admin']}><AdminOrganisation /></ProtectedRoute>} />
        <Route path="conservatoire" element={<Conservatoire />} />
        <Route path="bibliotheque" element={<Bibliotheque />} />
        <Route path="scientifique/cours" element={<Cours />} />
        <Route path="comptes/profil" element={<MonProfil />} />
        <Route path="admin/membres" element={<ProtectedRoute roles={['admin']}><GestionMembres /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppRoutes />
}
