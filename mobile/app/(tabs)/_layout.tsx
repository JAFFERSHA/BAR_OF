import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type TabConfig = {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
  roles: ('OWNER' | 'MANAGER' | 'STAFF')[];
};

const TAB_CONFIG: TabConfig[] = [
  { name: 'dashboard', title: 'Dashboard', icon: 'grid-outline', iconFocused: 'grid', roles: ['OWNER', 'MANAGER', 'STAFF'] },
  { name: 'stock', title: 'Stock', icon: 'cube-outline', iconFocused: 'cube', roles: ['OWNER', 'MANAGER'] },
  { name: 'purchase', title: 'Purchase', icon: 'cart-outline', iconFocused: 'cart', roles: ['OWNER', 'MANAGER'] },
  { name: 'sales', title: 'Sales', icon: 'receipt-outline', iconFocused: 'receipt', roles: ['OWNER', 'MANAGER', 'STAFF'] },
  { name: 'notifications', title: 'Alerts', icon: 'notifications-outline', iconFocused: 'notifications', roles: ['OWNER', 'MANAGER'] },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', iconFocused: 'settings', roles: ['OWNER'] }
];

export default function TabLayout() {
  const { user } = useAuth();
  const role = user?.role ?? 'STAFF';

  const visibleTabs = TAB_CONFIG.filter((t) => t.roles.includes(role));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#111', borderTopColor: '#222' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: { fontSize: 11 }
      }}
    >
      {TAB_CONFIG.map((tab) => {
        const visible = visibleTabs.some((t) => t.name === tab.name);
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: visible ? undefined : null,
              tabBarIcon: ({ focused, color, size }) => (
                <Ionicons
                  name={focused ? tab.iconFocused : tab.icon}
                  size={size}
                  color={color}
                />
              )
            }}
          />
        );
      })}
    </Tabs>
  );
}
