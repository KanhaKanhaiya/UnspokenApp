import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { SymbolView } from 'expo-symbols';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, useColorScheme, View, StyleSheet, useWindowDimensions, Platform } from 'react-native';
import { ComponentProps } from 'react';

import { ExternalLink } from './external-link';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Colors } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs options={{ backBehavior: 'none' }}>
      <TabSlot style={styles.tabSlot} />
      <TabList asChild>
        <CustomTabList>
          {/* <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger> */}
          {/* <TabTrigger name="explore" href="/explore" asChild>
            <TabButton>Explore</TabButton>
          </TabTrigger> */}
          {/* <TabTrigger name='home' href='/' asChild>
          </TabTrigger> */}
          <TabTrigger name='report' href='/' asChild>
            <TabButton iconName="alert-circle">Report</TabButton>
          </TabTrigger>
          <TabTrigger name='reports' href={'/reports'} asChild>
            <TabButton iconName="map">Nearby</TabButton>
          </TabTrigger>
          <TabTrigger name='signin' href='/signin' />
          {/* <TabTrigger name='home' href='/' /> */}
          {/* <TabTrigger name='reportDetails' href='/reports//chat' />
<TabTrigger name='reportDetails' href='/reports//' /> */}
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

interface CustomTabButtonProps extends TabTriggerSlotProps {
  iconName?: ComponentProps<typeof Ionicons>['name'];
}

export function TabButton({ children, isFocused, iconName, ...props }: CustomTabButtonProps) {
  const scheme = useColorScheme();
  const activeColor = scheme === 'dark' ? '#60A5FA' : '#3B82F6';
  const inactiveColor = scheme === 'dark' ? '#9CA3AF' : '#6B7280';
  const tintColor = isFocused ? activeColor : inactiveColor;

  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <View style={[styles.tabButtonInner, isFocused && styles.tabButtonActive]}>
        {iconName && (
          <Ionicons
            name={iconName}
            size={22}
            color={tintColor}
          />
        )}
        {(!iconName || isFocused) && (
          <ThemedText type="smallBold" style={[styles.tabText, { color: tintColor }]}>
            {children}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View style={[styles.tabListWrapper, isLargeScreen && styles.tabListWrapperLarge]}>
      <ThemedView type="backgroundElement" style={styles.glassContainer}>
        {/* <ThemedText type="smallBold" style={styles.brandText}>
          Expo Starter
        </ThemedText> */}
        {props.children}

        {/* <ExternalLink href="https://docs.expo.dev" asChild>
          <Pressable style={styles.externalPressable}>
            <ThemedText type="link">Docs</ThemedText>
            <SymbolView
              tintColor={colors.text}
              name={{ ios: 'arrow.up.right.square', web: 'link' }}
              size={12}
            />
          </Pressable>
        </ExternalLink> */}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabSlot: {
    flex: 1,
    width: '100%',
  },
  tabListWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },
  tabListWrapperLarge: {
    bottom: 40,
  },
  glassContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 36,
    width: '100%',
    maxWidth: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  brandText: {
    marginRight: 'auto',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  tabText: {
    fontSize: 14,
    letterSpacing: 0.3,
  },
  externalPressable: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginLeft: 12,
  },
});
