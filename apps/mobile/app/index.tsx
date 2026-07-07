import { Redirect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { LoadingState } from '@/components/states/LoadingState';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <LoadingState />;

  return <Redirect href={isSignedIn ? '/today' : '/login'} />;
}
