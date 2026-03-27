import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AuthContext, useAuthProvider } from './src/hooks/useAuth';
import { LoadingScreen } from './src/components/LoadingScreen';
import { adminApi } from './src/api/adminClient';

export default function App() {
  const auth = useAuthProvider();

  useEffect(() => {
    auth.init();
    // Admin-API Credentials aus AsyncStorage laden (falls vorhanden)
    adminApi.init().catch(console.error);
  }, []);

  if (auth.loading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider>
      <AuthContext.Provider
        value={{
          user: auth.user,
          loading: auth.loading,
          login: auth.login,
          logout: auth.logout,
          isAuthenticated: auth.isAuthenticated,
        }}
      >
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="dark" />
        </NavigationContainer>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
