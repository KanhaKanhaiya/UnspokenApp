import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Platform,
    useWindowDimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { auth, database } from '../../../../firebaseConfig';
import { ref, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../../../supabaseConfig';

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

    const [reportData, setReportData] = useState({
        id: id,
        status: 'ACTIVE',
        date: '',
        latitude: 0,
        longitude: 0,
        symptoms: '',
        aiDiagnosis: {
            happened: '',
            firstAid: [
                ''
            ]
        },
        ngos: ['']
    });

    const [location, setLocation] = useState(null);
    const [recentMessages, setRecentMessages] = useState([]);

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
        supabase.rpc('get_animal_reports_by_id', {
            report_id: id
        }).then((data) => {
            console.log(data.data[0])
            setReportData(data.data[0])
        })
    }, [])

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
          body { padding: 0; margin: 0; }
          #map { height: 100vh; width: 100vw; }
          .custom-pin { background-color: #EF4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
          .user-dot { background-color: #3B82F6; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.3); }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const map = L.map('map', { zoomControl: true, dragging: true, scrollWheelZoom: true }).setView([${reportData.latitude}, ${reportData.longitude}], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);
          const icon = L.divIcon({ className: 'custom-pin', iconSize: [24, 24], iconAnchor: [12, 12] });
          L.marker([${reportData.latitude}, ${reportData.longitude}], { icon }).addTo(map);
          ${userMarkerCode}
        </script>
      </body>
      </html>
    `;
    };

    return (
        <View style={styles.screen}>
            <View style={styles.mainLayout}>

                {/* <View style={styles.headerBar}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={20} color="#059669" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} /><Text style={styles.statusText}>{reportData.status}</Text>
                    </View>
                </View> */}

                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    <View style={styles.mapCard}>
                        <View style={styles.mapFrame}>
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
                                <View style={styles.webMapUI}>
                                    <Text style={styles.webMapText}>Map unavailable</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.mapFooter}>
                            <Text style={styles.mapFooterText}><Ionicons name="location-outline" size={14} /> {reportData.latitude}, {reportData.longitude}</Text>
                            <Text style={styles.mapFooterText}>{reportData.date}</Text>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <View style={styles.cardHeaderRow}>

                            <Text style={styles.cardTitle}>AI Diagnosis</Text>
                        </View>
                    </View>

                    <View style={[styles.card, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                        <View style={styles.cardHeaderRow}>
                            <Ionicons name="chatbubbles" size={20} color="#0F766E" />
                            <Text style={[styles.cardTitle, { color: '#0F766E' }]}>Chat</Text>
                        </View>

                        <View style={styles.previewContainer}>
                            {recentMessages.length === 0 ? (
                                <Text style={styles.emptyChatText}>No messages yet.</Text>
                            ) : (
                                recentMessages.map((msg) => (
                                    <View key={msg.id} style={styles.previewMessage}>
                                        <Text style={styles.previewSender}>{msg.sender}: </Text>
                                        <Text style={styles.previewText} numberOfLines={1}>{msg.text}</Text>
                                    </View>
                                ))
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.openChatButton}
                            onPress={() => router.navigate(`./${id}/chat`)}
                        >
                            <MaterialCommunityIcons name="forum-outline" size={20} color="#FFFFFF" />
                            <Text style={styles.openChatButtonText}>Open Full Chat</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </View>
        </View>

    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#F9FAFB' },
    mainLayout: { flex: 1, alignSelf: 'center', width: '100%', backgroundColor: '#FFFFFF', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#F3F4F6', paddingTop: 42 },
    headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    backButton: { flexDirection: 'row', alignItems: 'center' },
    backButtonText: { color: '#059669', fontWeight: '600', fontSize: 14, marginLeft: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginRight: 6 },
    statusText: { color: '#B91C1C', fontSize: 10, fontWeight: '800' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginLeft: 6 },
    mapCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
    mapFrame: { height: 160, width: '100%', backgroundColor: '#E5E7EB' },
    webMapUI: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF' },
    webMapText: { fontSize: 13, color: '#1E40AF', fontWeight: '700' },
    mapFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#F9FAFB' },
    mapFooterText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
    aiTextBold: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
    aiTextNormal: { fontWeight: '400', color: '#4B5563', lineHeight: 20 },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, paddingLeft: 4 },
    bulletDot: { fontSize: 14, color: '#4B5563', marginRight: 6 },
    bulletText: { flex: 1, fontSize: 13, color: '#4B5563', lineHeight: 18 },
    previewContainer: { marginBottom: 12 },
    previewMessage: { flexDirection: 'row', marginBottom: 6 },
    previewSender: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
    previewText: { fontSize: 13, color: '#6B7280', flex: 1 },
    emptyChatText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic', marginVertical: 8 },
    openChatButton: { backgroundColor: '#0F766E', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8 },
    openChatButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginLeft: 8 },
});

