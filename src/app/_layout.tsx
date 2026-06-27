import { Slot, Stack } from "expo-router";
import '../../firebaseConfig'
import 'react-native-url-polyfill/auto'
import AppTabs from '../components/app-tabs'
import { SafeAreaView } from "react-native-safe-area-context";

import '@/global.css'
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';


export default function RootLayout() {
  return <>
  {/* <SafeAreaView> */}
  {/* <GluestackUIProvider> */}

  <GluestackUIProvider>
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  </GluestackUIProvider>
  {/* </GluestackUIProvider> */}
  {/* </SafeAreaView> */}
  {/* <Stack screenOptions={
    {
      headerShown: false
    }
  } /> */}
  </>
}
