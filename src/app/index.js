import * as Device from "expo-device"
import { Button, StyleSheet, Text } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ThemedText } from "@/components/themed-text"
import { ThemedView } from "@/components/themed-view"
import { BottomTabInset, MaxContentWidth, Spacing } from "@/constants/theme"
import { useRouter } from "expo-router"

export default function HomeScreen() {
  const router = useRouter()
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.heroSection}>
          <ThemedText type="title" style={styles.title}>
            Welcome to Unspoken
          </ThemedText>
          <Button onPress={() => router.navigate('/signin')} title="Sign In" />
        </ThemedView>
        </SafeAreaView>
        </ThemedView>
      // <SafeAreaView style={styles.safeArea}>
      /* </SafeAreaView> */
    
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row"
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four
  },
  title: {
    textAlign: "center"
  },
  code: {
    textTransform: "uppercase"
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: "stretch",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four
  }
})
