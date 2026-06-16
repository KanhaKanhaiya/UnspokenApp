import React, { useEffect, useState } from "react";
import { supabase } from "../../../supabaseConfig";
import {
  FlatList, View, Text, StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  Button
} from "react-native";
import * as ExpoLocation from 'expo-location'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from "expo-router";
import LoadingUI from "@/components/loading-ui";

export default function NearbyReports() {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([])

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
        try {
          //const { data: reportsData, error: reportsError } = await 
          supabase.rpc('get_reports_nearby', {
            user_lng: currentLoc.coords.longitude,
            user_lat: currentLoc.coords.latitude,
            radius_meters: 5000
          }).then((data) => {
            console.log(data)
            setReports(data.data)
            setLoading(false)
          })

          if (reportsError) {
            return;
            // TODO(Add error handling)
          }

          console.log(reportsData)
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

  let MapView = null;
  let Marker = null;
  if (Platform.OS !== 'web') {
    try {
      const Maps = require('react-native-maps');
      MapView = Maps.default;
      Marker = Maps.Marker;
    } catch (e) {
      //  TODO(Show Error)
    }
  }

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
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            color: white; font-weight: bold; font-family: sans-serif; font-size: 14px;
          }
          .user-dot {
            background-color: #3B82F6; width: 14px; height: 14px;
            border-radius: 50%; border: 2px solid white;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3);
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
              window.parent.postMessage(JSON.stringify({ type: 'PIN_CLICK', id: r.id }), '*');
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

  if (loading) {
    return (
      // <View style={styles.centerContainer}>
      //   <ActivityIndicator size="large" color="#12ee25" />
      //   <Text style={styles.loadingText}>Loading</Text>
      // </View>
      <LoadingUI />
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={[styles.contentLimiter, { maxWidth: isLarge ? 850 : '100%' }]}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Nearby Rescues</Text>
            <Text style={styles.pageSubtitle}>Showing {reports.length} cases within 5 km</Text>
          </View>
          <View style={[styles.mapCardWrapper, { height: isLarge ? 320 : 220 }]}>
            {Platform.OS === 'web' ? (
              React.createElement('iframe', {
                srcDoc: generateWebMapHtml(),
                style: { width: '100%', height: '100%', border: 'none' },
                title: "Nearby Rescues"
              })
            ) : (
              <MapView style={styles.nativeMapStyle} initialRegion={location}>
                <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} zIndex={999}>
                  <View style={styles.userDotPulseContainer}>
                    <View style={styles.userPulseRing} />
                    <View style={styles.userCoreBlueDot} />
                  </View>
                </Marker>

                {reports.map((report) => (
                  <Marker
                    key={report.id}
                    coordinate={{ latitude: report.latitude, longitude: report.longitude }}
                    onPress={() => setSelectedRescueID(report.id)}
                  >
                    <View style={[styles.customNativePin, report.status === 'Critical' && styles.criticalPinBg]}>
                      <MaterialCommunityIcons name="alert-circle" size={16} color="#FFF" />
                    </View>
                  </Marker>
                ))}
              </MapView>
            )}

            {selectedRescueID && (
              <TouchableOpacity style={styles.clearFilterFloatingBtn} onPress={() => setSelectedRescueID(null)}>
                <Ionicons name="eye-outline" size={14} color="#1F2937" />
                <Text style={styles.clearFilterText}>Show All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.feedHeaderRow}>
            <Text style={styles.feedTitle}>
              {selectedRescueID ? 'Selected Case' : 'All Active Rescues'}
            </Text>
            <View style={styles.counterBadge}>
              <View style={styles.pulsingDot} />
              <Text style={styles.counterBadgeText}>{displayedRescues.length} Active</Text>
            </View>
          </View>

          {displayedRescues.map((rescue) => (
            <TouchableOpacity
              key={rescue.id}
              activeOpacity={0.9}
              style={[styles.rescueFeedCard, selectedRescueID === rescue.id && styles.highlightedCardBorder]}
              onPress={() => setSelectedRescueID(rescue.id)}
            >
              <Image source={{ uri: rescue.image }} style={styles.rescueThumb} />

              <View style={styles.cardDetailsBox}>
                <View style={styles.badgeLine}>
                  <View style={[styles.statusIndicatorTag, rescue.status === 'Critical' ? styles.tagRed : styles.tagAmber]}>
                    <Text style={[styles.tagText, styles.textRed]}>
                      {rescue.status}
                    </Text>
                  </View>
                  <Text style={styles.timeLabelText}>{rescue.time}</Text>
                </View>

                <Text style={styles.incidentHeadline} numberOfLines={1}>{rescue.title}</Text>
                <Text style={styles.symptomSummaryText} numberOfLines={2}>{rescue.symptoms}</Text>

                <View style={styles.locationFooterMeta}>
                  <Ionicons name="location-outline" size={14} color="#6B7280" />
                  <Text style={styles.distanceMetricText}>{rescue.distance} • </Text>
                  <Text style={styles.addressStringText} numberOfLines={1}>{rescue.address}</Text>
                </View>
                <Button title="See details." onPress={() => router.navigate('/reports/' + rescue.id)} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#4B5563', fontWeight: '600' },

  scrollContainer: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16 },
  contentLimiter: { width: '100%' },

  pageHeader: { marginBottom: 16, paddingHorizontal: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },

  mapCardWrapper: {
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  nativeMapStyle: { width: '100%', height: '100%' },

  clearFilterFloatingBtn: {
    position: 'absolute', bottom: 12, right: 12, backgroundColor: '#FFFFFF',
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14,
    borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 4, zIndex: 10
  },
  clearFilterText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#1F2937' },

  customNativePin: { backgroundColor: '#F59E0B', padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#FFFFFF' },
  criticalPinBg: { backgroundColor: '#EF4444' },
  userDotPulseContainer: { alignItems: 'center', justifyContent: 'center' },
  userCoreBlueDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#FFFFFF' },
  userPulseRing: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(59, 130, 246, 0.24)' },

  feedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  feedTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  counterBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  pulsingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  counterBadgeText: { fontSize: 12, fontWeight: '700', color: '#065F46' },

  rescueFeedCard: { backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
  highlightedCardBorder: { borderColor: '#818CF8', backgroundColor: '#FAFAFF', borderWidth: 1.5 },
  rescueThumb: { width: 85, height: 85, borderRadius: 12, backgroundColor: '#E5E7EB' },
  cardDetailsBox: { flex: 1, paddingLeft: 14, justifyContent: 'space-between' },
  badgeLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusIndicatorTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagRed: { backgroundColor: '#FEE2E2' },
  tagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  textRed: { color: '#991B1B' },
  textAmber: { color: '#92400E' },
  timeLabelText: { fontSize: 11, color: '#9CA3AF', fontWeight: '500' },
  incidentHeadline: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginTop: 4 },
  symptomSummaryText: { fontSize: 13, color: '#6B7280', lineHeight: 18, marginVertical: 4 },
  locationFooterMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  distanceMetricText: { fontSize: 12, fontWeight: '600', color: '#4B5563', marginLeft: 4 },
  addressStringText: { fontSize: 12, color: '#9CA3AF', flex: 1 },
})
