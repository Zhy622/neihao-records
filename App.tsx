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
import { Suspense } from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/auth/AuthProvider';
import { AppTabs } from './src/navigation/AppTabs';
import { AuthLoadingScreen } from './src/screens/AuthLoadingScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { NoteDetailScreen } from './src/screens/NoteDetailScreen';
import { NoteHistoryScreen } from './src/screens/NoteHistoryScreen';
import { RecordDetailScreen } from './src/screens/RecordDetailScreen';
import { RecordScreen } from './src/screens/RecordScreen';
import { PeopleObservationScreen } from './src/screens/PeopleObservationScreen';
import { PeopleObservationHistoryScreen } from './src/screens/PeopleObservationHistoryScreen';
import { PeopleObservationDetailScreen } from './src/screens/PeopleObservationDetailScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { RecordSyncBootstrap } from './src/sync/RecordSyncBootstrap';
import { initializeDatabase } from './src/database/database';
import { RootStackParamList } from './src/types/navigation';
import { colors, fonts } from './src/theme';
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
          headerTitleStyle: { fontSize: 17 },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="Main" component={AppTabs} options={{ headerShown: false }} />
            <Stack.Screen
              name="Record"
              component={RecordScreen}
              options={({ navigation }) => ({
                title: '记录一次纠结',
                headerTitleAlign: 'center',
                headerStyle: { height: 70, backgroundColor: '#F7FAF8' },
                headerShadowVisible: false,
                headerTintColor: '#466349',
                headerTitleStyle: {
                  color: '#466349',
                  fontFamily: 'Inter_500Medium',
                  fontSize: 18,
                  letterSpacing: -0.6,
                },
                headerRight: () => (
                  <HapticPressable
                    accessibilityRole="button"
                    accessibilityLabel="查看历史记录"
                    style={{ padding: 4, borderRadius: 18 }}
                    onPress={() => navigation.navigate('History')}
                  >
                    <Ionicons name="time-outline" size={20} color="#466349" />
                  </HapticPressable>
                ),
              })}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={({ navigation }) => ({
                title: '历史记录',
                headerTitleAlign: 'center',
                headerStyle: { height: 70, backgroundColor: '#F7FAF8' },
                headerShadowVisible: false,
                headerTintColor: '#466349',
                headerTitleStyle: {
                  color: '#466349',
                  fontFamily: 'Inter_500Medium',
                  fontSize: 18,
                  letterSpacing: -0.6,
                },
                headerRight: () => (
                  <HapticPressable
                    accessibilityRole="button"
                    accessibilityLabel="查看统计"
                    style={{ padding: 4, borderRadius: 18 }}
                    onPress={() => navigation.navigate('Stats')}
                  >
                    <Ionicons name="trending-up-outline" size={22} color="#424841" />
                  </HapticPressable>
                ),
              })}
            />
            <Stack.Screen name="Stats" component={StatsScreen} options={{ title: '统计', headerTitleAlign: 'center' }} />
            <Stack.Screen
              name="RecordDetail"
              component={RecordDetailScreen}
              options={{
                title: '记录详情',
                headerTitleAlign: 'center',
                headerStyle: { backgroundColor: '#F7FAF8' },
                headerShadowVisible: false,
                headerTintColor: '#466349',
                headerTitleStyle: {
                  color: '#466349',
                  fontFamily: 'Inter_500Medium',
                  fontSize: 18,
                },
              }}
            />
            <Stack.Screen
              name="NoteHistory"
              component={NoteHistoryScreen}
              options={{
                title: '随记记录',
                headerTitleAlign: 'center',
                headerBackButtonDisplayMode: 'minimal',
                headerStyle: { backgroundColor: 'rgba(247, 250, 248, 0.96)' },
                headerShadowVisible: false,
                headerTintColor: '#466349',
                headerTitleStyle: { color: '#466349', fontFamily: fonts.medium, fontSize: 18 },
              }}
            />
            <Stack.Screen
              name="NoteDetail"
              component={NoteDetailScreen}
              options={() => ({
                title: '随记详情',
                headerTitleAlign: 'center',
                headerBackButtonDisplayMode: 'minimal',
                headerStyle: { backgroundColor: 'rgba(247, 250, 248, 0.96)' },
                headerShadowVisible: false,
                headerTintColor: '#466349',
                headerTitleStyle: { color: '#466349', fontFamily: fonts.medium, fontSize: 18 },
              })}
            />
            <Stack.Screen
              name="PeopleObservation"
              component={PeopleObservationScreen}
              options={({ navigation }) => ({
                title: '观照',
                headerTitleAlign: 'center',
                headerRight: () => (
                  <HapticPressable
                    accessibilityRole="button"
                    accessibilityLabel="查看观照列表"
                    style={{ padding: 4, borderRadius: 18 }}
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
              options={{
                title: '观照列表',
                headerTitleAlign: 'center',
                headerBackButtonDisplayMode: 'minimal',
                headerStyle: { backgroundColor: 'rgba(247, 250, 248, 0.96)' },
                headerShadowVisible: false,
                headerTintColor: '#466349',
                headerTitleStyle: { color: '#466349', fontFamily: fonts.medium, fontSize: 18 },
              }}
            />
            <Stack.Screen
              name="PeopleObservationDetail"
              component={PeopleObservationDetailScreen}
              options={{
                title: '观照详情',
                headerTitleAlign: 'center',
                headerBackButtonDisplayMode: 'minimal',
                headerStyle: { backgroundColor: 'rgba(247, 250, 248, 0.96)' },
                headerShadowVisible: false,
                headerTintColor: '#466349',
                headerTitleStyle: { color: '#466349', fontFamily: fonts.medium, fontSize: 18 },
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );

  return (
    <>
      {session ? <RecordSyncBootstrap /> : null}
      {navigation}
    </>
  );
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <BottomSheetModalProvider>
        <Suspense fallback={<AuthLoadingScreen />}>
          <SQLiteProvider databaseName="neihao-records.db" onInit={initializeDatabase} useSuspense>
            <AuthProvider>
              <AppAlertProvider>
                <RootNavigation />
              </AppAlertProvider>
            </AuthProvider>
          </SQLiteProvider>
        </Suspense>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
