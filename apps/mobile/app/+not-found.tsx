import { Stack } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { EmptyState } from '@/components/states/EmptyState';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found', headerShown: true }} />
      <Screen>
        <EmptyState
          icon="compass-outline"
          title="Screen not found"
          message="This route does not exist."
        />
      </Screen>
    </>
  );
}
