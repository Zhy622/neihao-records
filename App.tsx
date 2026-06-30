import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { AppTabs } from './src/navigation/AppTabs';
import { AuthLoadingScreen } from './src/screens/AuthLoadingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { RecordDetailScreen } from './src/screens/RecordDetailScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { PeopleObservationScreen } from './src/screens/PeopleObservationScreen';
import { PeopleObservationHistoryScreen } from './src/screens/PeopleObservationHistoryScreen';
import { PeopleObservationDetailScreen } from './src/screens/PeopleObservationDetailScreen';
import { RecordSyncBootstrap } from './src/sync/RecordSyncBootstrap';
import { initializeDatabase } from './src/database/database';
import { RootStackParamList } from './src/types/navigation';
import { colors } from './src/theme';
import { HapticPressable } from './src/components/HapticPressable';
import { AppAlertProvider } from './src/components/AppAlert';

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
            <Stack.Screen
              name="PeopleObservation"
              component={PeopleObservationScreen}
              options={({ navigation }) => ({
                title: '人物观照',
                headerTitleAlign: 'center',
                headerRight: () => (
                  <HapticPressable
                    accessibilityRole="button"
                    accessibilityLabel="查看人物观照列表"
                    style={{ padding: 8, borderRadius: 18 }}
                    onPress={() => navigation.navigate('PeopleObservationHistory')}
                  >
                    <Ionicons name="list-outline" size={22} color={colors.primary} />
                  </HapticPressable>
                ),
              })}
            />
            <Stack.Screen
              name="PeopleObservationHistory"
              component={PeopleObservationHistoryScreen}
              options={{ title: '人物观照列表', headerTitleAlign: 'center' }}
            />
            <Stack.Screen
              name="PeopleObservationDetail"
              component={PeopleObservationDetailScreen}
              options={{ title: '观照详情', headerTitleAlign: 'center' }}
            />
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
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <AuthProvider>
          <AppAlertProvider>
            <RootNavigation />
          </AppAlertProvider>
        </AuthProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
