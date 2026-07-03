import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    View
} from 'react-native';

import { router, useLocalSearchParams } from 'expo-router';
import { limitToLast, onValue, orderByChild, query, ref } from 'firebase/database';
import { auth, database } from '../../../../../firebaseConfig';
import { supabase } from '../../../../../supabaseConfig';

let WebView = null;
if (Platform.OS !== 'web') {
    try {
        WebView = require('react-native-webview').WebView;
    } catch (e) {
        //TODO(Show error.)
    }
}

export default function RescueDetails() {

    const { id } = useLocalSearchParams()
    //TODO(Add null check and protection)

    const [isLoading, setIsLoading] = useState(true);

    const [reportData, setReportData] = useState({
        id: id,
        status: 'ACTIVE',
        timestamp: '',
        latitude: 0,
        longitude: 0,
        symptoms: '',
        image: '',
        title: '',
        address: '',
        aiDiagnosis: '',
        ngos: ['']
    });

    const [location, setLocation] = useState(null);
    const [recentMessages, setRecentMessages] = useState([]);

    const scrollY = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1800,
                useNativeDriver: Platform.OS !== 'web',
            })
        ).start();
    }, []);

    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    let currentLoc = await Location.getCurrentPositionAsync({});
                    setLocation({ latitude: currentLoc.coords.latitude, longitude: currentLoc.coords.longitude });
                }
            } catch (err) {
                // TODO(Show error)
            }
        })();
    }, []);

    useEffect(() => {
        setIsLoading(true);
        supabase.rpc('get_animal_reports_by_id', {
            report_id: id
        }).then((data) => {
            if (data?.data?.[0]) {
                console.log(data.data[0])
                setReportData(data.data[0])
            }
            setIsLoading(false);
        }).catch(() => {
            setIsLoading(false);
        });
    }, [id])

    useEffect(() => {
        const messagesRef = ref(database, `messages/${reportData.id}`);
        const previewQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(5));

        const unsubscribe = onValue(previewQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedMessages = Object.keys(data).map((key) => ({
                    id: key,
                    ...data[key],
                    isMe: data[key].senderUid === auth.currentUser?.uid,
                }));
                setRecentMessages(formattedMessages);
            } else {
                setRecentMessages([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const generateWebMapHtml = () => {
        const userMarkerCode = location ? `
      const userIcon = L.divIcon({ className: 'user-dot', iconSize: [14, 14], iconAnchor: [7, 7] });
      L.marker([${location.latitude}, ${location.longitude}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    ` : '';

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { padding: 0; margin: 0; background-color: transparent; }
          #map { height: 100vh; width: 100vw; }
          .custom-pin { background-color: #EF4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
          .user-dot { background-color: #3B82F6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3); }
          @media (prefers-color-scheme: dark) {
            .leaflet-layer,
            .leaflet-control-zoom-in,
            .leaflet-control-zoom-out,
            .leaflet-control-attribution {
              filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
            }
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { zoomControl: true, dragging: true, scrollWheelZoom: true }).setView([${reportData.latitude || 0}, ${reportData.longitude || 0}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
          const icon = L.divIcon({ className: 'custom-pin', iconSize: [24, 24], iconAnchor: [12, 12] });
          L.marker([${reportData.latitude || 0}, ${reportData.longitude || 0}], { icon }).addTo(map);
          ${userMarkerCode}
        </script>
      </body>
      </html>
    `;
    };

    const imageTranslateY = scrollY.interpolate({
        inputRange: [-100, 0, 320],
        outputRange: [-48, 0, 120], 
        extrapolate: 'clamp',
    });

    const imageScale = scrollY.interpolate({
        inputRange: [-100, 0, 1],
        outputRange: [1.3, 1, 1],
        extrapolateRight: 'clamp',
    });

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2.5]
    });

    const pulseOpacity = pulseAnim.interpolate({
        inputRange: [0, 0.6, 1],
        outputRange: [0.6, 0, 0]
    });

    if (isLoading) {
        return (
            <View className="flex-1 bg-background">
                <Box className="w-full h-80 bg-muted animate-pulse relative">
                    <Box className="absolute top-0 left-0 right-0 pt-6 px-4 bg-transparent" pointerEvents="box-none">
                        <HStack className="justify-between items-center w-full max-w-212.5 mx-auto">
                            <Box className="w-10 h-10 rounded-full bg-black/10" />
                            <Box className="w-10 h-10 rounded-full bg-black/10" />
                        </HStack>
                    </Box>
                </Box>
                
                <VStack className="flex-1 bg-background rounded-t-3xl -mt-6 px-6 pt-8 pb-12 w-full max-w-212.5 mx-auto shadow-sm">
                    <HStack className="justify-between items-center mb-4">
                        <Box className="w-24 h-7 rounded-full bg-muted animate-pulse" />
                        <Box className="w-16 h-4 rounded-md bg-muted animate-pulse" />
                    </HStack>
                    
                    <Box className="w-3/4 h-8 rounded-xl bg-muted animate-pulse mb-3" />
                    <Box className="w-1/2 h-4 rounded-md bg-muted animate-pulse mb-8" />
                    
                    <Box className="w-32 h-6 rounded-lg bg-muted animate-pulse mb-4" />
                    <VStack className="gap-2 mb-8">
                        <Box className="w-full h-4 rounded-md bg-muted animate-pulse" />
                        <Box className="w-full h-4 rounded-md bg-muted animate-pulse" />
                        <Box className="w-2/3 h-4 rounded-md bg-muted animate-pulse" />
                    </VStack>

                    <Box className="w-40 h-6 rounded-lg bg-muted animate-pulse mb-4" />
                    <Box className="w-full h-48 rounded-2xl bg-muted animate-pulse mb-8" />
                </VStack>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background">
            <Animated.ScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false} 
                bounces={true}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: Platform.OS !== 'web' }
                )}
            >
                
                <Box className="w-full h-80 relative overflow-hidden bg-muted">
                    <Animated.View style={{ width: '100%', height: '100%', transform: [{ translateY: imageTranslateY }, { scale: imageScale }] }}>
                        <Image 
                            source={{ uri: reportData.image }} 
                            className="w-full h-full object-cover" 
                            alt="Animal image" 
                        />
                    </Animated.View>
                    
                    <Box className="absolute top-0 left-0 right-0 pt-6 px-4 bg-transparent" pointerEvents="box-none">
                        <HStack className="justify-between items-center w-full max-w-212.5 mx-auto" pointerEvents="box-none">
                            <Pressable 
                                className="w-10 h-10 items-center justify-center bg-black/40 rounded-full active:opacity-70 backdrop-blur-sm" 
                                onPress={() => router.back()}
                            >
                                <Ionicons name="arrow-back" size={20} color="white" />
                            </Pressable>
                            <Pressable className="w-10 h-10 items-center justify-center bg-black/40 rounded-full active:opacity-70 backdrop-blur-sm">
                                <Ionicons name="share-social" size={18} color="white" />
                                {/* TODO(Implement share functionality.) */}
                            </Pressable>
                        </HStack>
                    </Box>
                </Box>

                <VStack className="flex-1 bg-background rounded-t-3xl -mt-6 px-6 pt-8 pb-12 w-full max-w-212.5 mx-auto shadow-sm">
                    
                    <HStack className="justify-between items-center mb-3">
                        <Box className={`px-3 py-1.5 rounded-full ${reportData.status === 'Critical' ? 'bg-destructive/10 dark:bg-destructive/20' : 'bg-info/10 dark:bg-info/20'}`}>
                            <Text className={`text-xs font-extrabold uppercase tracking-wide ${reportData.status === 'Critical' ? 'text-destructive' : 'text-info dark:text-blue-400'}`}>
                                {reportData.status === 'ACTIVE' ? 'In Progress' : reportData.status}
                            </Text>
                        </Box>
                        <Text className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                            #{String(reportData.id)}
                        </Text>
                    </HStack>

                    <Heading className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
                        {reportData.title}
                    </Heading>
                    <Text className="text-sm text-muted-foreground font-medium mb-1 line-clamp-2">
                        {reportData.address}
                    </Text>
                    <Text className="text-xs text-muted-foreground/70 font-semibold mb-8">
                        Reported on {reportData.date}
                    </Text>

                    {reportData.symptoms.trim() ? <VStack className="mb-8">
                        <Heading className="text-lg font-bold text-foreground mb-3">Description</Heading>
                        <Text className="text-base text-muted-foreground leading-relaxed">
                            {reportData.symptoms}
                        </Text>
                    </VStack> : <></> }

                    <VStack className="mb-8">
                        <Heading className="text-lg font-bold text-foreground mb-4">Rescue Status</Heading>
                        <Box className="bg-card border border-border p-5 rounded-2xl shadow-sm">
                            
                            <HStack className="mb-0">
                                <VStack className="items-center mr-4">
                                    <Box className="w-5 h-5 rounded-full bg-primary items-center justify-center z-10">
                                        <Ionicons name="checkmark" size={12} color="white" />
                                    </Box>
                                    <Box className="w-0.5 h-10 bg-primary my-1" />
                                </VStack>
                                <VStack className="flex-1 pb-4 pt-0.5">
                                    <Text className="text-sm font-bold text-foreground">Reported</Text>
                                    <Text className="text-xs text-muted-foreground mt-0.5">Case registered successfully</Text>
                                </VStack>
                            </HStack>
                            
                            <HStack className="mb-0">
                                <VStack className="items-center mr-4">
                                    <Box className="w-5 h-5 rounded-full bg-primary items-center justify-center z-10">
                                        <Ionicons name="checkmark" size={12} color="white" />
                                    </Box>
                                    <Box className="w-0.5 h-10 bg-primary/30 my-1" />
                                </VStack>
                                <VStack className="flex-1 pb-4 pt-0.5">
                                    <Text className="text-sm font-bold text-foreground">NGO Alerted</Text>
                                    <Text className="text-xs text-muted-foreground mt-0.5">Nearby partners notified</Text>
                                </VStack>
                            </HStack>

                            <HStack className="mb-0">
                                <VStack className="items-center mr-4">
                                    <Box className="w-5 h-5 items-center justify-center z-10 relative">
                                        <Animated.View 
                                            className="absolute w-full h-full rounded-full bg-primary"
                                            style={{
                                                transform: [{ scale: pulseScale }],
                                                opacity: pulseOpacity,
                                            }}
                                        />
                                        <Box className="w-2.5 h-2.5 rounded-full bg-primary z-20" />
                                    </Box>
                                    <Box className="w-0.5 h-10 bg-muted my-1" />
                                </VStack>
                                <VStack className="flex-1 pb-4 pt-0.5">
                                    <Text className="text-sm font-bold text-primary">Volunteer En Route</Text>
                                    <Text className="text-xs text-primary/80 mt-0.5 font-medium">Volunteer is on the way</Text>
                                </VStack>
                            </HStack>

                            <HStack className="mb-0">
                                <VStack className="items-center mr-4">
                                    <Box className="w-5 h-5 rounded-full bg-background border-2 border-muted-foreground/30 z-10" />
                                </VStack>
                                <VStack className="flex-1 pt-0.5">
                                    <Text className="text-sm font-bold text-muted-foreground">Rescued & Secured</Text>
                                    <Text className="text-xs text-muted-foreground/70 mt-0.5">Pending</Text>
                                </VStack>
                            </HStack>

                        </Box>
                    </VStack>

                    <VStack className="mb-8">
                        <Heading className="text-lg font-bold text-foreground mb-4">Volunteers</Heading>
                        <HStack className="items-center">
                            {/* TODO(Fix volunteer list) */}
                            <Image source={{ uri: 'https://i.pravatar.cc/150?img=32' }} className="w-11 h-11 rounded-full border-2 border-background z-30" alt="Volunteer" />
                            <Image source={{ uri: 'https://i.pravatar.cc/150?img=47' }} className="w-11 h-11 rounded-full border-2 border-background -ml-4 z-20" alt="Volunteer" />
                            <Image source={{ uri: 'https://i.pravatar.cc/150?img=12' }} className="w-11 h-11 rounded-full border-2 border-background -ml-4 z-10" alt="Volunteer" />
                            <Box className="w-11 h-11 rounded-full bg-muted border-2 border-background -ml-4 z-0 items-center justify-center">
                                <Text className="text-xs font-bold text-muted-foreground">+5</Text>
                            </Box>
                        </HStack>
                    </VStack>

                    <VStack className="mb-8">
                        <Heading className="text-lg font-bold text-foreground mb-4">Location</Heading>
                        <Box className="w-full h-48 rounded-2xl overflow-hidden border border-border bg-muted">
                            {Platform.OS === 'web' ? (
                                React.createElement('iframe', { srcDoc: generateWebMapHtml(), style: { width: '100%', height: '100%', border: 'none' } })
                            ) : WebView ? (
                                <WebView
                                    source={{ html: generateWebMapHtml() }}
                                    originWhitelist={['*']}
                                    javaScriptEnabled
                                    domStorageEnabled
                                />
                            ) : (
                                <Box className="flex-1 items-center justify-center bg-muted">
                                    <Text className="text-sm font-bold text-muted-foreground">Map unavailable</Text>
                                </Box>
                            )}
                        </Box>
                    </VStack>

                    <VStack className="mb-8">
                        <Heading className="text-lg font-bold text-foreground mb-4">AI Diagnosis</Heading>
                        <Box className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-5 rounded-2xl">
                            <Text className="text-sm text-foreground font-medium">
                                <Text className="font-bold text-primary">First Aid: </Text>
                                {reportData.aiDiagnosis}
                            </Text>
                        </Box>
                    </VStack>

                    <VStack className="mb-4">
                        <Pressable 
                            className="w-full bg-primary py-4 rounded-2xl items-center flex-row justify-center active:opacity-80 shadow-sm" 
                            onPress={() => router.navigate(`./${id}/chat`)}
                        >
                            <Ionicons name="chatbubbles" size={20} color="white" />
                            <Text className="text-white font-extrabold text-base ml-2 tracking-wide">Open Full Chat</Text>
                        </Pressable>

                        <Box className="mt-4 px-2">
                            {recentMessages.length === 0 ? (
                                <Text className="text-sm text-muted-foreground italic text-center py-2">No messages yet.</Text>
                            ) : (
                                recentMessages.map((msg) => (
                                    <HStack key={msg.id} className="mb-2.5">
                                        <Text className="text-sm font-bold text-foreground">{msg.sender}: </Text>
                                        <Text className="text-sm text-muted-foreground flex-1 line-clamp-1">{msg.text}</Text>
                                    </HStack>
                                ))
                            )}
                        </Box>
                    </VStack>

                </VStack>
            </Animated.ScrollView>
        </View>
    );
}
