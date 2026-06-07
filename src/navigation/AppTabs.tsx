import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AdviceScreen } from '../screens/AdviceScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { MainTabsParamList } from '../types/navigation';
import { colors } from '../theme';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64 },
        tabBarLabelStyle: { fontSize: 13, paddingBottom: 8 },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '今天' }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: '历史' }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: '统计' }} />
      <Tab.Screen name="Advice" component={AdviceScreen} options={{ title: '习惯建议' }} />
    </Tab.Navigator>
  );
}
