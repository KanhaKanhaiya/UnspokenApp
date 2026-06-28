import { Box } from '@/components/ui/box';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { Ionicons } from '@expo/vector-icons';
import * as ExpoLocation from 'expo-location';
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    useWindowDimensions
} from "react-native";
import { supabase } from "../../../../supabaseConfig";
import LoadingUI from "../../../components/loading-ui";

let WebView = null
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView
}

let cachedReports = null

export default function NearbyReports() {

  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState(cachedReports || [])

  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0
  });

  useEffect(() => {
    (async () => {

      try {
        let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (Platform.OS === 'web')
            alert("Location permission denied.")
          else
            Alert.alert("Location permission denied.")
          return;
        }
        let currentLoc = await ExpoLocation.getCurrentPositionAsync({});
        setLocation({ ...location, longitude: currentLoc.coords.longitude, latitude: currentLoc.coords.latitude })

        if (cachedReports !== null) {
          setLoading(false)
          return; }
        try {
          //const { data: reportsData, error: reportsError } = await 
          supabase.rpc('get_reports_nearby', {
            user_lng: currentLoc.coords.longitude,
            user_lat: currentLoc.coords.latitude,
            radius_meters: 5000
          }).then((data) => {
            console.log(data)
            setReports(data.data)
            setTimeout(() => {
cachedReports = data.data
              setLoading(false)
            }, 5000)
            //TODO(Remove deliberate delay)
          })

          if (reportsError) {
            return;
            // TODO(Add error handling)
          }
        } catch (error) { }

      } catch (error) {
        if (Platform.OS === 'web')
          alert("Error in location detection.")
        else
          Alert.alert("Error in location detection.")
        // TODO(Improve alert)
      }
    })()
  }, [])

  const { width } = useWindowDimensions();
  const isLarge = width > 768;

  const [selectedRescueID, setSelectedRescueID] = useState(null);

  const generateWebMapHtml = () => {
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
          .custom-pin {
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%; border: 2px solid white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            color: white; font-weight: bold; font-family: sans-serif; font-size: 14px;
            transition: transform 0.2s;
          }
          .custom-pin:hover { transform: scale(1.1); }
          .user-dot {
            background-color: #3B82F6; width: 14px; height: 14px;
            border-radius: 50%; border: 2px solid white;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
          }
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
          const map = L.map('map', { zoomControl: false }).setView([${location.latitude}, ${location.longitude}], 14);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap'
          }).addTo(map);

          const userIcon = L.divIcon({ className: 'user-dot', iconSize: [14, 14], iconAnchor: [7, 7] });
          L.marker([${location.latitude}, ${location.longitude}], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

          const rescues = ${JSON.stringify(reports)};
          rescues.forEach(r => {
            const icon = L.divIcon({
              className: 'custom-pin',
              html: \`<div style="background-color: #EF4444; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center;">!</div>\`,
              iconSize: [28, 28],
              iconAnchor: [14, 14]
            });

            const marker = L.marker([r.latitude, r.longitude], { icon }).addTo(map);
            marker.on('click', () => {
                            const message = JSON.stringify({ type: 'PIN_CLICK', id: r.id });
              if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
              window.parent.postMessage(message, '*');
            });
          });
        </script>
      </body>
      </html>
    `;
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMapMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PIN_CLICK') {
            setSelectedRescueID(data.id);
          }
        } catch (e) {
        }
      };
      window.addEventListener('message', handleWebMapMessage);
      return () => window.removeEventListener('message', handleWebMapMessage);
    }
  }, []);

  const displayedRescues = selectedRescueID
    ? reports.filter(r => r.id === selectedRescueID)
    : reports;

  if (loading) return <LoadingUI />

  return (
    <Box className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 16 }} showsVerticalScrollIndicator={false}>
        <Box className={`w-full ${isLarge ? 'max-w-[850px]' : ''}`}>
          
          <VStack className="mb-5 px-1">
            <Heading className="text-3xl font-extrabold text-foreground tracking-tight">Nearby Rescues</Heading>
            <Text className="text-sm text-muted-foreground mt-1.5 font-medium">Monitoring {reports.length} emergencies within 5km</Text>
          </VStack>
          
          <Box className={`w-full bg-muted rounded-2xl overflow-hidden mb-6 border border-border ${isLarge ? 'h-[360px]' : 'h-[260px]'}`}>
            {Platform.OS === 'web' ? (
              React.createElement('iframe', {
                srcDoc: generateWebMapHtml(),
                style: { width: '100%', height: '100%', border: 'none' },
                title: "Nearby Rescues"
              })
            ) : WebView ? (
              <WebView
                source={{ html: generateWebMapHtml() }}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'PIN_CLICK') {
                      setSelectedRescueID(data.id);
                    }
                  } catch (e) {
                  }
                }}
              />
            ) : (
              <Box className="flex-1 items-center justify-center bg-muted">
                <Text className="text-sm text-muted-foreground font-bold">Map unavailable</Text>
              </Box>
            )}
          </Box>

          {selectedRescueID && (
            <Pressable 
              className="w-full bg-primary/10 dark:bg-primary/20 p-4 rounded-xl flex-row items-center justify-between mb-6 border border-primary/20 active:opacity-70" 
              onPress={() => setSelectedRescueID(null)}
            >
              <HStack className="items-center">
                <Ionicons name="pin" size={20} color="#10B981" />
                <Text className="ml-2 font-bold text-primary text-sm">Showing Selected Pin</Text>
              </HStack>
              <HStack className="items-center">
                <Text className="font-bold text-primary text-sm mr-1">Clear Filter</Text>
                <Ionicons name="close-circle" size={20} color="#10B981" />
              </HStack>
            </Pressable>
          )}

          <HStack className="justify-between items-center mb-5 px-1">
            <Heading className="text-lg font-extrabold text-foreground">
              {selectedRescueID ? 'Incident Details' : 'Active Rescues'}
            </Heading>
            <HStack className="items-center bg-card px-3 py-1.5 rounded-full border border-border shadow-sm">
              <Box className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
              <Text className="text-xs font-bold text-foreground">{displayedRescues.length} Active</Text>
            </HStack>
          </HStack>

          <VStack className="gap-4">
            {displayedRescues.map((rescue) => (
              <Pressable
                key={rescue.id}
                className={`bg-card rounded-2xl flex-row p-4 border shadow-sm active:opacity-70 transition-colors ${selectedRescueID === rescue.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                onPress={() => router.push('/reports/' + rescue.id)}
              >
                <Image source={{ uri: rescue.image }} className="w-24 h-24 rounded-xl bg-muted object-cover" alt={rescue.title || "Rescue image"} />

                <VStack className="flex-1 pl-4 justify-between py-0.5">
                  <HStack className="justify-between items-start">
                    <Box className={`px-2.5 py-1 rounded-md ${rescue.status === 'Critical' ? 'bg-destructive/10 dark:bg-destructive/20' : 'bg-amber-500/10 dark:bg-amber-500/20'}`}>
                      <Text className={`text-[10px] font-extrabold uppercase tracking-wider ${rescue.status === 'Critical' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>
                        {rescue.status}
                      </Text>
                    </Box>
                    <Text className="text-xs text-muted-foreground font-semibold">{rescue.time}</Text>
                  </HStack>

                  <Heading className="text-base font-bold text-foreground mt-1.5 line-clamp-1">{rescue.title}</Heading>
                  <Text className="text-sm text-muted-foreground leading-tight mt-1 mb-2 line-clamp-2">{rescue.symptoms}</Text>

                  <HStack className="items-center">
                    <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                    <Text className="text-xs font-bold text-foreground ml-1">{rescue.distance} • </Text>
                    <Text className="text-xs text-muted-foreground flex-1 line-clamp-1">{rescue.address}</Text>
                  </HStack>
                  {/* <Button title="See details." onPress={() => router.navigate('/reports/' + rescue.id)} /> */}
                </VStack>
              </Pressable>
            ))}
          </VStack>
        </Box>
      </ScrollView>

      {/* <View style={{ flex: 1, padding: 20 }}>
            <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
                <View>
                    <Text style={{ fontSize: 15 }}>{item.id}</Text>
                </View>
                )}
                />
        </View> */}
    </Box>
  )
}