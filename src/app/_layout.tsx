import { Stack } from "expo-router";
import 'react-native-url-polyfill/auto'
import AppTabs from '../components/app-tabs'

export default function RootLayout() {
  return <>
  
  <AppTabs />
  {/* <Stack screenOptions={
    {
      headerShown: false
    }
  } /> */}
  </>
}
