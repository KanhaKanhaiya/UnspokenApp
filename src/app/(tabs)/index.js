import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '@/components/ui/radio';
import { CircleIcon } from '@/components/ui/icon';
import React, { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, StyleSheet, useWindowDimensions, View, TouchableOpacity, ScrollView, Text, TextInput, ActivityIndicator, Image } from 'react-native';
import * as ExpoLocation from 'expo-location';
import { supabase } from '../../../supabaseConfig';
import { model } from '../../../firebaseConfig';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
//import { useAuth } from '@/hooks/useAuth';

let WebView = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}
export default function Report() {
  const [PetNGORequired, setPetNGORequired] = React.useState('no');

  const {
    width
  } = useWindowDimensions();
  const [imageUri, setImageUri] = useState(null);
  const selectImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Image Permission not granted.');
      //TODO(Make the alert better)
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };
  const takeImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Camera Permission not granted.');
      //TODO(Make the alert better)
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };
  const isLarge = width > 768;
  const [animalType, setAnimalType] = useState("stray");
  const [symptoms, setSymptoms] = useState('');
  const showImageOptions = () => {
    if (Platform.OS === 'web') selectImage(); else Alert.alert("Upload Animal Photo", "Choose one :", [{
      text: "Cancel",
      style: "cancel"
    }, {
      text: "Select Existing Image",
      onPress: selectImage
    }, {
      text: "Take new photo",
      onPress: takeImage
    }], {
      cancelable: true
    });
  };

  // const { loginWithGoogle } = useAuth()
  // useEffect(() => {
  //   loginWithGoogle().then((data) => {

  //   })
  // }, [])

  const [isLocating, setIsLocating] = useState(false);
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0,
    longitudeDelta: 0
  });
  const locateMe = async () => {
    setIsLocating(true);
    try {
      let {
        status
      } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('');
        setIsLocating(false);
        if (Platform.OS === 'web') alert("Location permission denied."); else Alert.alert("Location permission denied.");
        return;
      }
      let currentLoc = await ExpoLocation.getCurrentPositionAsync({});
      const coords = {
        latitude: currentLoc.coords.latitude,
        longitude: currentLoc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };
      setLocation(coords);
      if (Platform.OS !== 'web') {
        let geocode = await ExpoLocation.reverseGeocodeAsync(coords);
        if (geocode.length > 0) {
          const place = geocode[0];
          setAddress(`${place.name || ''}, ${place.city || place.subregion}, ${place.region || ''}`);
        }
      }
    } catch (error) {
      setAddress('');
      if (Platform.OS === 'web') alert("Error in location detection."); else Alert.alert("Error in location detection.");
      // TODO(Improve alert)
    }

    setIsLocating(false);
  };
  const checkValidity = imageUri && ((PetNGORequired !== "no" && animalType === "pet") || animalType === "stray" ? location.latitude && location.longitude : true)
  const generateMapHtml = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { height: 100%; width: 100%; padding: 0; margin: 0; }
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
        const hasLocation = ${Boolean(location.latitude && location.longitude)};
        const lat = ${location.latitude || 20.5937};
        const lng = ${location.longitude || 78.9629};
        const map = L.map('map', { zoomControl: true }).setView([lat, lng], hasLocation ? 15 : 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);
        if (hasLocation) {
          const userIcon = L.divIcon({ className: 'user-dot', iconSize: [14, 14], iconAnchor: [7, 7] });
          L.marker([lat, lng], { icon: userIcon }).addTo(map);
        }
      </script>
    </body>
    </html>
  `;
  const [isAnalyzing, setIsAnalysing] = useState(false);
  const [aiDiagnosis, setAIDiagnosis] = useState(null);
  async function blobToGenerativePart(blob) {
    const base64EncodedDataPromise = new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const raw = typeof reader.result === 'string' ? reader.result : '';
        const base64 = raw.includes(',') ? raw.split(',')[1] : '';
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Unable to read image for AI analysis.'));
      reader.readAsDataURL(blob);
    });

    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: blob.type || 'image/jpeg'
      }
    };
  }
  const handleSendAlert = async () => {
    setIsAnalysing(true);
    setAIDiagnosis(null);
    const pointLocation = `POINT(${location.longitude} ${location.latitude})`;
    try {
      let base64Image;
      if (Platform.OS === "web") {
        const response = await fetch(imageUri);
        base64Image = await response.blob();
      } else 
        base64Image = decode(await new File(imageUri).base64())
      if (!(animalType === "pet" && PetNGORequired === "no")) {
      const {
        data: insertedReports,
        error: insertError
      } = await supabase.from('animal_reports').insert([{
        symptoms: symptoms,
        type: animalType,
        location: pointLocation,
        image: ""
      }]).select();
      if (insertError) throw insertError;
      const createdReport = insertedReports?.[0];
      if (!createdReport) throw new Error('Report creation did not return a row.');

      const {
        data: uploadData,
        error: uploadError
      } = await supabase.storage.from('unspokenStorage').upload(`animalImages/${createdReport.id}`, base64Image, {
        contentType: 'image/jpeg'
      });
      if (uploadError) throw uploadError;
      const publicUrl = supabase.storage.from('unspokenStorage').getPublicUrl(uploadData.path).data.publicUrl;
      const {
        error: updateError
      } = await supabase.from('animal_reports').update({
        image: publicUrl
      }).eq('id', createdReport.id);
      if (updateError) throw updateError;
    }
      try {
        //const model = await getAiModel();
        const imagePart = await blobToGenerativePart(base64Image);
        const geminiResponse = await model.generateContent(['Imagine that you are an excellent vet. DO NOT STATE that You are an AI. State steps for a volunteer to cure and/or provide first aid in simple language to it with suspected illness/injury etc.', imagePart]);
        const rawAIResponse = geminiResponse?.response?.text?.() ?? '';
        const parsed = JSON.parse(rawAIResponse);
        const diagnosis = parsed?.characters?.[0] ?? null;
        if (diagnosis) {
          setAIDiagnosis({
            ...diagnosis,
            confidence: typeof diagnosis.confidence === 'number' ? Math.round(diagnosis.confidence * 100) : diagnosis.confidence
          });
        } else {
          Alert.alert('AI analysis unavailable', 'Report sent, but AI did not return a diagnosis.');
        }
      } catch (aiError) {
        console.error('AI analysis failed:', aiError);
        Alert.alert('AI analysis unavailable', 'Report sent successfully, but AI analysis failed.');
      }
    } catch (error) {
      console.error('Failed to send report:', error);
      Alert.alert('Unable to send alert', 'Please try again.');
    } finally {
      setIsAnalysing(false);
    }
  };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
    <View style={[styles.layout, {
      maxWidth: isLarge ? 850 : '100%'
    }]}>
      <View style={styles.headerView}>
        <View style={styles.versionInfo}>
          {/* TODO(Add icons for better UI) */}
          <Text style={styles.versionInfoText}>Unspoken version 0.0.1</Text>
        </View>
        <Text style={styles.title}>Report</Text>
        <Text style={styles.subtitle}>
          Report animals for their welfare
          {/* TODO(Improve this motivational message and other texts) */}
        </Text>
      </View>
      {/* <Button onPress={() => router.navigate('/nearbyReports')} title="Nearby Reports" style={{ margin: 5 }} /> */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>1. Select Animal Type</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleOption, animalType === 'stray' && styles.toggleOptionActive]} onPress={() => setAnimalType('stray')}>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleTitle, animalType === 'stray' && styles.toggleTitleActive]}>Stray</Text>
              <Text style={styles.animalTypeDescription}>Alerts NGOs</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.toggleOption, animalType === 'pet' && styles.toggleOptionActive]} onPress={() => setAnimalType('pet')}>
            <View style={styles.toggleTextContainer}>
              <Text style={[styles.toggleTitle, animalType === 'pet' && styles.toggleTitleActive]}>Pet</Text>
              <Text style={styles.animalTypeDescription}>Data will NOT be shared with NGOs unless you yourself do so.</Text>
            </View>
          </TouchableOpacity>
        </View>

        {animalType == "pet" ? <View style={{
          ...styles.card,
          marginTop: 15
        }}>
          <Text style={styles.cardHeader}>NGO Rescue Required ?</Text>
          <RadioGroup value={PetNGORequired} onChange={setPetNGORequired}>
            <Radio size={"md"} isInvalid={false} isDisabled={false} value="yes1" aria-label="Radio">
              <RadioIndicator>
                <RadioIcon as={CircleIcon} />
              </RadioIndicator>
              <RadioLabel>Yes, inform NGOs and Volunteers.</RadioLabel>
            </Radio>
            <Radio value="yes2" aria-label="Radio">
              <RadioIndicator>
                <RadioIcon as={CircleIcon} />
              </RadioIndicator>
              <RadioLabel>Yes, inform only NGOs.</RadioLabel>
            </Radio>
            <Radio value="no" aria-label="Radio">
              <RadioIndicator>
                <RadioIcon as={CircleIcon} />
              </RadioIndicator>
              <RadioLabel>No, rescue not required.</RadioLabel>
            </Radio>
          </RadioGroup>
        </View> : <></>}

      </View>


      <View style={[styles.gridRow, {
        flexDirection: isLarge ? 'row' : 'column'
      }]}></View>
      <View style={[styles.card, {
        flex: 1
      }]}>
        <Text style={styles.cardHeader}>2. Upload Photo</Text>
        <TouchableOpacity style={styles.uploadContainer} onPress={showImageOptions}>
          {imageUri ? <View style={styles.imageWrap}>
            <Image source={{
              uri: imageUri
            }} style={styles.uploadedPreview} />
            <View style={styles.imageOverlay}><Text style={styles.overlayText}>Change Photo</Text></View>
          </View> : <View style={styles.uploadPlaceholder}>
            <Text style={styles.uploadMainText}>Click to capture or upload image</Text>
            <Text style={styles.uploadSubText}>Provide clear image of injured animal</Text>
          </View>}
        </TouchableOpacity>
      </View>

      <View style={[styles.card, {
        flex: 1
      }]}>
        <Text style={styles.cardHeader}>3. Describe Symptoms</Text>
        <TextInput style={styles.textArea} placeholder="Example: Destroyed body, damaged head, coughing, vomiting blood etc." placeholderTextColor="#9CA3AF" multiline numberOfLines={2} value={symptoms} onChangeText={setSymptoms} />
      </View>

      <View style={styles.card}>
        <View style={styles.locationHeaderRow}>
          <Text style={styles.cardHeader}>4. Rescue Location</Text>
          <TouchableOpacity style={styles.locateButton} onPress={locateMe}>
            {isLocating ? <ActivityIndicator size="small" color="#059669" /> : <>
              <Text style={styles.locateButtonText}>Locate Me</Text>
            </>}
          </TouchableOpacity>
        </View>

        <TextInput style={styles.addressInput} value={address} onChangeText={setAddress} placeholder='Enter address' placeholderTextColor="#9CA3AF" />

        <View style={styles.mapFrame}>
          {Platform.OS === 'web' ? React.createElement('iframe', {
            srcDoc: generateMapHtml(),
            style: {
              width: '100%',
              height: '100%',
              border: 'none'
            },
            title: 'Rescue Location'
          }) : WebView ? <WebView source={{
            html: generateMapHtml()
          }} originWhitelist={['*']} javaScriptEnabled domStorageEnabled /> : <View style={styles.webMapUI}>
            <Text style={styles.webMapText}>Location</Text>
            <Text style={styles.webMapCoords}>{location.latitude.toFixed(4)} N, {location.longitude.toFixed(4)} E</Text>
          </View>}
        </View>
      </View>

      <TouchableOpacity style={[styles.actionBtn, !checkValidity && styles.actionButtonDisabled]} disabled={!checkValidity || isAnalyzing} onPress={handleSendAlert}>
        {isAnalyzing ? <ActivityIndicator color="#FFFFFF" size="small" /> : <>
          <Text style={styles.actionButtonText}>Send Alert & Run AI Diagnosis</Text>
        </>}
      </TouchableOpacity>

      <View style={[styles.card, styles.AIView, aiDiagnosis && styles.AIActiveView]}>
        <View style={styles.AIHeader}>
          <Text style={styles.AITitle}>AI Analysis</Text>
        </View>
        {/* TODO(Add AI inaccuracy warning) */}
        {aiDiagnosis ? <View style={styles.AIDiagnosisView}>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, {
              backgroundColor: animalType === 'stray' ? '#FEE2E2' : '#FEF3C7'
            }]}>
              <Text style={[styles.statusBadgeText, {
                color: aiDiagnosis.confidence > 75 ? '#991B1B' : '#e06214'
              }]}>
                {aiDiagnosis.confidence > 75 ? 'HIGH' : 'MEDIUM'}
              </Text>
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: '#EEF2FF'
            }]}>
              <Text style={[styles.statusBadgeText, {
                color: '#3730A3'
              }]}>Confidence: {aiDiagnosis.confidence}%</Text>
            </View>
          </View>

          <Text style={styles.conditionHeadline}>{aiDiagnosis.condition}</Text>

          <Text style={styles.sectionHeader}>Immediate Actions:</Text>
          {/* {aiDiagnosis.advice.map((item, index) => (
                <View key={index} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{item}</Text>
                </View>
               ))} */}

          <Text>{aiDiagnosis.advice}</Text>

          <View style={styles.ngoTrackerCard}>
            <Text style={styles.ngoTrackerText}>
              <Text style={{
                fontWeight: '700'
              }}>NGOs Alerted: </Text>{aiDiagnosis.ngoAlertStatus}
            </Text>
          </View>
        </View> : <View style={styles.emptyAIView}>
          <Text style={styles.defaultAIText}>
            AI diagnosis.
          </Text>
        </View>}
      </View>
    </View></ScrollView>;
}
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6'
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 42,
    paddingHorizontal: 16
  },
  layout: {
    width: '100%'
  },
  headerView: {
    alignItems: 'center',
    marginBottom: 28
  },
  versionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12
  },
  versionInfoText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
    marginLeft: 4
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'
      },
      default: {
        elevation: 2
      }
    })
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16
  },
  toggleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  toggleOption: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#FAFAFA'
  },
  toggleOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5'
  },
  toggleTextContainer: {
    marginLeft: 12,
    flex: 1
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4
  },
  toggleTitleActive: {
    color: '#047857'
  },
  animalTypeDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16
  },
  gridRow: {
    gap: 16,
    marginBottom: 16
  },
  uploadContainer: {
    height: 150,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden'
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  uploadMainText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8
  },
  uploadSubText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2
  },
  imageWrap: {
    flex: 1,
    position: 'relative'
  },
  uploadedPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 6,
    alignItems: 'center'
  },
  overlayText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600'
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 150,
    textAlignVertical: 'top'
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  locateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F4EA',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  locateButtonText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4
  },
  addressInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12
  },
  mapFrame: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB'
  },
  webMapUI: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  webMapText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E40AF',
    marginTop: 8
  },
  webMapCoords: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 2
  },
  nativeMap: {
    width: '100%',
    height: '100%'
  },
  actionBtn: {
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 24
  },
  actionButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  AIView: {
    backgroundColor: '#FAFAFF',
    borderColor: '#E0E0FF'
  },
  AIActiveView: {
    borderColor: '#818CF8',
    backgroundColor: '#F8FAFC'
  },
  AIHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
    paddingBottom: 12,
    marginBottom: 16
  },
  AITitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#08e2d0',
    marginLeft: 8
  },
  emptyAIView: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24
  },
  defaultAIText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    maxWidth: 500
  },
  AIDiagnosisView: {
    width: '100%'
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700'
  },
  conditionHeadline: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    paddingLeft: 4
  },
  bulletDot: {
    fontSize: 16,
    color: '#4F46E5',
    marginRight: 8,
    lineHeight: 18
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18
  },
  ngoTrackerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 8,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#A7F3D0'
  },
  ngoTrackerText: {
    fontSize: 12,
    color: '#065F46',
    marginLeft: 8,
    flex: 1
  }
});