import { HomeScreen } from 'app/features/home/screen'
import { LoginScreen } from 'app/features/auth/login-screen'
import { useAuth } from 'app/provider/AuthProvider'

export default function Index() {
  const { session, loading } = useAuth()
  if (loading) return null
  return session ? <HomeScreen /> : <LoginScreen />
}