import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Link, Slot } from 'expo-router';
import { Menu, X } from 'lucide-react-native';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { height } = useWindowDimensions();

  const closeMenu = () => setIsOpen(false);

  return (
    <>
      <View className="w-full bg-white border-b border-gray-200 z-50">
        <View className="flex-row justify-between items-center h-16 px-5 max-w-300 mx-auto w-full">
          <Text className="text-xl font-bold text-black">Unspoken</Text>

          <View className="hidden md:flex flex-row gap-6 items-center">
            <Link href="/" asChild>
              <Pressable className="py-2">
                <Text className="text-[15px] text-black font-medium">Report</Text>
              </Pressable>
            </Link>
            <Link href="/reports" asChild>
              <Pressable className="py-2">
                <Text className="text-[15px] text-black font-medium">Nearby</Text>
              </Pressable>
            </Link>
            <Link href="/landing" asChild>
              <Pressable className="py-2">
                <Text className="text-[15px] text-black font-medium">Landing Page</Text>
              </Pressable>
            </Link>
          </View>

          <Pressable className="flex md:hidden p-1" onPress={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={28} color="#000000" /> : <Menu size={28} color="#000000" />}
          </Pressable>
        </View>

        {isOpen && (
          <View className="flex md:hidden bg-white border-b border-gray-200 px-5 py-2 absolute top-16 left-0 right-0 z-50 shadow-sm">
            <Link href="/" asChild onPress={closeMenu}>
              <Pressable className="py-3">
                <Text className="text-[15px] text-black font-medium">Report</Text>
              </Pressable>
            </Link>
            <Link href="/reports" asChild onPress={closeMenu}>
              <Pressable className="py-3">
                <Text className="text-[15px] text-black font-medium">Nearby</Text>
              </Pressable>
            </Link>
            <Link href="/landing" asChild onPress={closeMenu}>
              <Pressable className="py-3">
                <Text className="text-[15px] text-black font-medium">Landing Page</Text>
              </Pressable>
            </Link>
          </View>
        )}
      </View>

      {isOpen && (
        <Pressable 
          style={[
            StyleSheet.absoluteFill,
            {
              position: 'fixed',
              top: 64,
              height: height,
              zIndex: 40,
              backgroundColor: 'transparent'
            }
          ]} 
          onPress={closeMenu} 
        />
      )}

      <Slot />
    </>
  );
}