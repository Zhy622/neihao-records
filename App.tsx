import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { AppTabs } from './src/navigation/AppTabs';
import { RecordScreen } from './src/screens/RecordScreen';
import { initializeDatabase } from './src/database/database';
import { RootStackParamList } from './src/types/navigation';
import { colors } from './src/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SQLiteProvider databaseName="neihao-records.db" onInit={initializeDatabase}>
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
          <Stack.Screen name="Main" component={AppTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Record" component={RecordScreen} options={{ title: '记录一次纠结' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SQLiteProvider>
  );
}
