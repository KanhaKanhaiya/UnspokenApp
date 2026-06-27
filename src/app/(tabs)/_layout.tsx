import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Slot, Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
    if (Platform.OS === "web") 
        return <Slot /> 
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <FontAwesome size={28} name="cog" color={color} />,
        }}
      />
    </Tabs>
  );
}
