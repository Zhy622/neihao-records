import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { AppTabs } from './src/navigation/AppTabs';
import { AuthLoadingScreen } from './src/screens/AuthLoadingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { RecordDetailScreen } from './src/screens/RecordDetailScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { RecordSyncBootstrap } from './src/sync/RecordSyncBootstrap';
import { initializeDatabase } from './src/database/database';
import { RootStackParamList } from './src/types/navigation';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

function RootNavigation() {
  const { session, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthLoadingScreen />
      </>
    );
  }

  const navigation = (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="Main" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Record" component={RecordScreen} options={{ title: '记录一次纠结' }} />
            <Stack.Screen name="RecordDetail" component={RecordDetailScreen} options={{ title: '记录详情' }} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );

  return session ? (
    <SQLiteProvider databaseName="neihao-records.db" onInit={initializeDatabase}>
      <RecordSyncBootstrap />
      {navigation}
    </SQLiteProvider>
  ) : navigation;
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
