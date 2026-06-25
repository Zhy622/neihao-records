import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { AccountScreen } from '../screens/AccountScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { MainTabsParamList } from '../types/navigation';
import { colors } from '../theme';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const icons: Record<keyof MainTabsParamList, keyof typeof Ionicons.glyphMap> = {
  Home: 'home-outline',
  History: 'time-outline',
  Stats: 'analytics-outline',
  Account: 'person-circle-outline',
};

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarBackground: () => <BlurView intensity={35} tint="light" style={StyleSheet.absoluteFill} />,
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name as keyof MainTabsParamList]} size={size} color={color} />
        ),
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(255, 254, 252, 0.82)',
          borderTopColor: 'rgba(227, 225, 218, 0.72)',
          height: 68,
        },
        tabBarLabelStyle: { fontSize: 13, paddingBottom: 8 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '今天' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: '历史' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: '统计' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: '账号' }} />
    </Tab.Navigator>
  );
}
