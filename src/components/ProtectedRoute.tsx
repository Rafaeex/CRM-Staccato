import { Navigate, Outlet, useLocation } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'

export default function ProtectedRoute() {
  const location = useLocation()
  const isAuth = pb.authStore.isValid

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
