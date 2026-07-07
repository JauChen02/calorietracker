import * as SecureStore from 'expo-secure-store';

// Clerk requires a token cache to persist sessions across app restarts.
// expo-secure-store keeps data in the OS keychain / keystore, never in
// AsyncStorage, satisfying the rule against storing auth tokens insecurely.
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};
