import { Feather, Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Image,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from "@/src/hooks/useAuth"

export default function Profile() {

const { user, loading } = useAuth()

    return (
        <View className="flex-1 bg-background">

            <View className="bg-primary px-6 pt-14 pb-6 flex-row justify-between items-center shadow-sm z-10">
                <View className="flex-row items-center gap-2">
                    <Ionicons name="paw" size={22} color="#FFFFFF" />
                    <Text className="text-white text-xl font-bold">My Profile</Text>
                </View>
                <TouchableOpacity className="p-2 active:opacity-70">
                    <Feather name="edit" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1 px-6 pt-8"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 100 : 80 }}
            >
                <View className="items-center mb-8">
                    <View className="w-24 h-24 rounded-full border-4 border-white shadow-sm overflow-hidden mb-4 bg-gray-200">
                        <Image
                            source={{ uri: loading ? '' : user.photoURL }}
                            className="w-full h-full"
                            alt="Profile Picture"
                        />
                    </View>
                    <Text className="text-2xl font-extrabold text-gray-900">{loading ? '' : user.displayName}</Text>
                    <Text className="text-sm font-semibold text-gray-500 mt-1 tracking-wide">Volunteer</Text>
                </View>

                <View className="flex-row justify-between bg-white rounded-3xl py-6 px-2 mb-8 shadow-sm border border-gray-100">
                    <View className="items-center flex-1">
                        <Text className="text-xl font-extrabold text-gray-900">A</Text>
                        <Text className="text-[11px] text-gray-500 font-semibold mt-1 text-center">Rescues Joined</Text>
                    </View>
                    <View className="w-px bg-gray-100 h-full" />
                    <View className="items-center flex-1">
                        <Text className="text-xl font-extrabold text-gray-900">B</Text>
                        <Text className="text-[11px] text-gray-500 font-semibold mt-1 text-center">Reports</Text>
                    </View>
                    <View className="w-px bg-gray-100 h-full" />
                    <View className="items-center flex-1">
                        <Text className="text-xl font-extrabold text-gray-900">C</Text>
                        <Text className="text-[11px] text-gray-500 font-semibold mt-1 text-center">Hours Volunteered</Text>
                    </View>
                </View>

                <View className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                    <MenuItem icon="activity" label="My Activity" isFirst />
                    <MenuDivider />
                    <MenuItem icon="file-text" label="My Reports" />
                    <MenuDivider />
                    <MenuItem icon="heart" label="Saved Animals" />
                    <MenuDivider />
                    <MenuItem icon="settings" label="Settings" />
                    <MenuDivider />
                    <MenuItem icon="help-circle" label="Help & Support" isLast />
                </View>
            </ScrollView>
        </View>
    );
}

function MenuItem({ icon, label, isFirst, isLast }) {
    return (
        <TouchableOpacity
            className={`flex-row items-center justify-between px-5 py-4 bg-white active:bg-gray-50 ${isFirst ? 'pt-6' : ''} ${isLast ? 'pb-6' : ''}`}
        >
            <View className="flex-row items-center gap-4">
                <View className="w-8 h-8 items-center justify-center">
                    <Feather name={icon} size={20} color="#4B5563" />
                </View>
                <Text className="text-[15px] font-bold text-gray-700">{label}</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#D1D5DB" />
        </TouchableOpacity>
    );
}

function MenuDivider() {
    return (
        <View className="h-px bg-gray-100 mx-5 ml-16" />
    );
}
