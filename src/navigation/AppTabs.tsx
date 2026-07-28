import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { AccountScreen } from '../screens/AccountScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NoteEditorScreen } from '../screens/NoteEditorScreen';
import { PeopleObservationScreen } from '../screens/PeopleObservationScreen';
import { MainTabsParamList } from '../types/navigation';
import { colors, fonts } from '../theme';
import { HapticPressable } from '../components/HapticPressable';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const icons: Record<
  Exclude<keyof MainTabsParamList, 'Observation'>,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Notes: { active: 'create', inactive: 'create-outline' },
  Account: { active: 'person', inactive: 'person-outline' },
};
const labels: Record<keyof MainTabsParamList, string> = {
  Home: '首页',
  Notes: '随记',
  Observation: '观照',
  Account: '账号',
};

function MirrorTabIcon({ color, selected, size }: { color: string; selected: boolean; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Circle cx="12" cy="12" r="8.4" fill={selected ? color : 'none'} stroke={color} strokeWidth="1.65" />
      <Path d="M15 6.8a6.6 6.6 0 0 1 2.2 4.2" fill="none" stroke={selected ? '#F7FAF8' : color} strokeLinecap="round" strokeWidth="1.65" />
    </Svg>
  );
}

export function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#466349',
        tabBarInactiveTintColor: '#424841',
        tabBarBackground: () => (
          <BlurView intensity={35} tint="light" style={[StyleSheet.absoluteFill, styles.tabBarBackground]} />
        ),
        tabBarIcon: ({ color, focused }) => {
          const routeIcons = icons[route.name as keyof typeof icons];

          return (
            <View style={styles.tabItem}>
              {route.name === 'Observation' ? (
                <MirrorTabIcon color={color} selected={focused} size={focused ? 20 : 19} />
              ) : (
                <Ionicons
                  name={focused ? routeIcons.active : routeIcons.inactive}
                  size={focused ? 21 : 20}
                  color={color}
                />
              )}
              <Text style={[styles.tabLabel, { color }]}>
                {labels[route.name as keyof MainTabsParamList]}
              </Text>
            </View>
          );
        },
        tabBarStyle: {
          position: 'absolute',
          height: 81,
          paddingTop: 12,
          paddingBottom: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          borderTopColor: 'rgba(194, 200, 191, 0.1)',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          boxShadow: '0 -4px 24px rgba(70, 99, 73, 0.06)',
        },
        tabBarItemStyle: { padding: 0 },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: '情绪笔录',
          // headerShown: true,
          headerTitleAlign: 'center',
          headerStyle: { height: 80, backgroundColor: 'rgba(247, 250, 248, 0.96)' },
          headerShadowVisible: true,
          headerTintColor: '#181C1C',
          headerTitleStyle: {
            fontFamily: fonts.bold,
            fontSize: 24,
            letterSpacing: -0.6,
          },
        }}
      />
      <Tab.Screen
        name="Notes"
        component={NoteEditorScreen}
        options={({ navigation }) => ({
          title: '随记',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => null,
          headerStyle: { backgroundColor: 'rgba(247, 250, 248, 0.96)' },
          headerShadowVisible: false,
          headerTintColor: '#466349',
          headerTitleStyle: { color: '#466349', fontFamily: fonts.medium, fontSize: 18 },
          headerRight: () => (
            <HapticPressable
              accessibilityRole="button"
              accessibilityLabel="查看随记记录"
              style={{ padding: 4, borderRadius: 18, marginRight: 12 }}
              onPress={() => navigation.getParent()?.navigate('NoteHistory')}
            >
              <Ionicons name="reader-outline" size={22} color="#466349" />
            </HapticPressable>
          ),
        })}
      />
      <Tab.Screen
        name="Observation"
        component={PeopleObservationScreen}
        options={({ navigation }) => ({
          title: '观照',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => null,
          headerStyle: { backgroundColor: 'rgba(247, 250, 248, 0.96)' },
          headerShadowVisible: false,
          headerTintColor: '#466349',
          headerTitleStyle: { color: '#466349', fontFamily: fonts.medium, fontSize: 18 },
          headerRight: () => (
            <HapticPressable
              accessibilityRole="button"
              accessibilityLabel="查看观照列表"
              style={{ padding: 4, borderRadius: 18, marginRight: 12 }}
              onPress={() => navigation.getParent()?.navigate('PeopleObservationHistory')}
            >
              <Ionicons name="list-outline" size={22} color="#466349" />
            </HapticPressable>
          ),
        })}
      />
      <Tab.Screen name="Account" component={AccountScreen} options={{ title: '账号' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    overflow: 'hidden',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  tabItem: {
    width: 62,
    minHeight: 51,
    paddingVertical: 4,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontFamily: fonts.regular,
    fontSize: 10,
    lineHeight: 14,
  },
});
