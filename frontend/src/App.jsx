import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

const Layout = lazy(() => import('./components/layout/Layout'))
const Accueil = lazy(() => import('./components/accueil/Accueil'))
const Login = lazy(() => import('./components/auth/Login'))
const Register = lazy(() => import('./components/auth/Register'))
const DashboardAdmin = lazy(() => import('./components/dashboard/DashboardAdmin'))
const DashboardMembre = lazy(() => import('./components/dashboard/DashboardMembre'))
const Evenements = lazy(() => import('./components/informations/Evenements'))
const News = lazy(() => import('./components/informations/News'))
const FinanceParDahira = lazy(() => import('./components/finance/FinanceParDahira'))
const FinanceHierarchie = lazy(() => import('./components/finance/FinanceHierarchie'))
const LeveesFonds = lazy(() => import('./components/finance/LeveesFonds'))
const Barkelou = lazy(() => import('./components/finance/Barkelou'))
const ProgrammeKamil = lazy(() => import('./components/culturelle/ProgrammeKamil'))
const MesProgressions = lazy(() => import('./components/culturelle/MesProgressions'))
const ValidationsKamil = lazy(() => import('./components/culturelle/ValidationsKamil'))
const ActivitesReligieuses = lazy(() => import('./components/culturelle/ActivitesReligieuses'))
const Messagerie = lazy(() => import('./components/communication/Messagerie'))
const Notifications = lazy(() => import('./components/communication/Notifications'))
const ProjetsSociaux = lazy(() => import('./components/sociale/ProjetsSociaux'))
const Reunions = lazy(() => import('./components/organisation/Reunions'))
const SectionsDahiras = lazy(() => import('./components/organisation/SectionsDahiras'))
const AdminOrganisation = lazy(() => import('./components/organisation/AdminOrganisation'))
const Conservatoire = lazy(() => import('./components/conservatoire/Conservatoire'))
const Bibliotheque = lazy(() => import('./components/bibliotheque/Bibliotheque'))
const Cours = lazy(() => import('./components/scientifique/Cours'))
const MonProfil = lazy(() => import('./components/comptes/MonProfil'))
const GestionMembres = lazy(() => import('./components/comptes/GestionMembres'))
const MembreDetail = lazy(() => import('./components/comptes/MembreDetail'))
const GestionRoles = lazy(() => import('./components/comptes/GestionRoles'))
const LogsSysteme = lazy(() => import('./components/comptes/LogsSysteme'))

function ProtectedRoute({ children, roles, permission, requireGestionRole }) {
  const { user, loading, permissions, isGestionRole } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  if (permission && !permissions?.[permission]) return <Navigate to="/" replace />
  if (requireGestionRole && !isGestionRole) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user, isGestionRole } = useAuth()
  // Tout rôle de la matrice pilote (Super Admin + rôles nationaux/section/cellule)
  // atterrit sur le tableau de bord scopé ; seul un simple membre va sur /membre.
  const defaultDashboard = isGestionRole ? '/admin' : '/membre'
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
        <Route path="admin" element={<ProtectedRoute requireGestionRole><DashboardAdmin /></ProtectedRoute>} />
        <Route path="membre" element={<ProtectedRoute roles={['membre']}><DashboardMembre /></ProtectedRoute>} />
        <Route path="informations/evenements" element={<Evenements />} />
        <Route path="informations/news" element={<News />} />
        <Route path="finance/cotisations" element={<Navigate to="/finance/par-dahira" replace />} />
        <Route path="finance/par-dahira" element={<ProtectedRoute permission="can_view_finance"><FinanceParDahira /></ProtectedRoute>} />
        <Route path="finance/hierarchie" element={<ProtectedRoute permission="can_view_national_synthese"><FinanceHierarchie /></ProtectedRoute>} />
        <Route path="finance/levees-fonds" element={<LeveesFonds />} />
        <Route path="finance/barkelou" element={<Barkelou />} />
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
        <Route path="admin/membres" element={<ProtectedRoute permission="can_view_members"><GestionMembres /></ProtectedRoute>} />
        <Route path="admin/membres/:id" element={<ProtectedRoute permission="can_view_members"><MembreDetail /></ProtectedRoute>} />
        <Route path="admin/roles" element={<ProtectedRoute roles={['admin']}><GestionRoles /></ProtectedRoute>} />
        <Route path="admin/logs" element={<ProtectedRoute roles={['admin']}><LogsSysteme /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <AppRoutes />
      </Suspense>
    </ErrorBoundary>
  )
}
