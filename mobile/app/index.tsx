import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { token } = useAuth();
  return token ? <Redirect href="/(tabs)/dashboard" /> : <Redirect href="/login" />;
}
