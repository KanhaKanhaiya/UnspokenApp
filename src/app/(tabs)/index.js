import React, { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform, useWindowDimensions, ScrollView, View } from 'react-native';
import * as ExpoLocation from 'expo-location';
import { supabase } from '../../../supabaseConfig';
import { model } from '../../../firebaseConfig';
import { File } from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

import { Radio, RadioGroup, RadioIcon, RadioIndicator, RadioLabel } from '@/components/ui/radio';
import { CircleIcon } from '@/components/ui/icon';
import { Box } from '@/components/ui/box';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Pressable } from '@/components/ui/pressable';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { Input, InputField } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Image } from '@/components/ui/image';
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
        const geminiResponse = await model.generateContent(['You are an excellent vet. DO NOT STATE that you are AI. State steps for a volunteer to cure and/or provide first aid in simple language to it with suspected illness/injury etc. Do not help in anything else. You are only a vet working for "Unspoken."', imagePart, symptoms.trim() !== "" ? "User provided description : " + symptoms : ""]);
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

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ alignItems: 'center', paddingVertical: 42, paddingHorizontal: 16 }}>
      <Box className={`w-full ${isLarge ? 'max-w-[850px]' : ''}`}>
        
        <VStack className="items-center mb-8">
          <Box className="bg-primary/10 px-3 py-1.5 rounded-full mb-3 flex-row items-center">
            {/* TODO(Add icons for better UI) */}
            <Text className="text-primary font-bold text-xs ml-1">Unspoken version 0.0.1</Text>
          </Box>
          <Heading className="text-3xl font-extrabold text-foreground mb-2 tracking-tight">Report</Heading>
          <Text className="text-sm text-muted-foreground text-center leading-relaxed">
            Report animals for their welfare
            {/* TODO(Improve this motivational message and other texts) */}
          </Text>
        </VStack>

        <Box className="bg-card rounded-2xl p-6 mb-5 border border-border shadow-sm">
          <Heading className="text-sm text-foreground mb-4 font-bold">1. Select Animal Type</Heading>
          
          <HStack className="flex-wrap gap-3">
            <Pressable 
              className={`flex-1 min-w-[240px] flex-row items-start border-2 rounded-xl p-4 ${animalType === 'stray' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`} 
              onPress={() => setAnimalType('stray')}
            >
              <VStack className="ml-3 flex-1">
                <Text className={`text-sm font-bold mb-1 ${animalType === 'stray' ? 'text-primary' : 'text-foreground'}`}>Stray</Text>
                <Text className="text-xs text-muted-foreground leading-tight">Alerts NGOs</Text>
              </VStack>
            </Pressable>

            <Pressable 
              className={`flex-1 min-w-[240px] flex-row items-start border-2 rounded-xl p-4 ${animalType === 'pet' ? 'border-primary bg-primary/5' : 'border-border bg-background'}`} 
              onPress={() => setAnimalType('pet')}
            >
              <VStack className="ml-3 flex-1">
                <Text className={`text-sm font-bold mb-1 ${animalType === 'pet' ? 'text-primary' : 'text-foreground'}`}>Pet</Text>
                <Text className="text-xs text-muted-foreground leading-tight">Data will NOT be shared with NGOs unless you yourself do so.</Text>
              </VStack>
            </Pressable>
          </HStack>

          {animalType == "pet" ? (
            <Box className="mt-5 pt-5 border-t border-border">
              <Heading className="text-sm text-foreground mb-4">NGO Rescue Required ?</Heading>
              <RadioGroup value={PetNGORequired} onChange={setPetNGORequired}>
                <Radio value="yes1" size="md">
                  <RadioIndicator>
                    <RadioIcon as={CircleIcon} />
                  </RadioIndicator>
                  <RadioLabel className="text-foreground ml-2">Yes, inform NGOs and Volunteers.</RadioLabel>
                </Radio>
                <Radio value="yes2" size="md" className="mt-3">
                  <RadioIndicator>
                    <RadioIcon as={CircleIcon} />
                  </RadioIndicator>
                  <RadioLabel className="text-foreground ml-2">Yes, inform only NGOs.</RadioLabel>
                </Radio>
                <Radio value="no" size="md" className="mt-3">
                  <RadioIndicator>
                    <RadioIcon as={CircleIcon} />
                  </RadioIndicator>
                  <RadioLabel className="text-foreground ml-2">No, rescue not required.</RadioLabel>
                </Radio>
              </RadioGroup>
            </Box>
          ) : <></>}
        </Box>

        <Box className="bg-card rounded-2xl p-6 mb-5 border border-border shadow-sm">
          <Heading className="text-sm text-foreground mb-4 font-bold">2. Upload Photo</Heading>
          <Pressable 
            className="h-40 border-2 border-dashed border-border rounded-xl bg-muted overflow-hidden justify-center" 
            onPress={showImageOptions}
          >
            {imageUri ? (
              <Box className="flex-1 relative">
                <Image source={{ uri: imageUri }} className="w-full h-full object-cover" alt="Uploaded Animal" />
                <Box className="absolute bottom-0 left-0 right-0 bg-black/60 py-2 items-center">
                  <Text className="text-white text-xs font-semibold">Change Photo</Text>
                </Box>
              </Box>
            ) : (
              <VStack className="flex-1 items-center justify-center p-5">
                <Text className="text-sm font-bold text-foreground mt-2">Click to capture or upload image</Text>
                <Text className="text-xs text-muted-foreground mt-1">Provide clear image of injured animal</Text>
              </VStack>
            )}
          </Pressable>
        </Box>

        <Box className="bg-card rounded-2xl p-6 mb-5 border border-border shadow-sm">
          <Heading className="text-sm text-foreground mb-4 font-bold">3. Describe Symptoms</Heading>
          <Textarea className="bg-background border-border rounded-xl min-h-[120px]">
            <TextareaInput 
              placeholder="Example: Destroyed body, damaged head, coughing, vomiting blood etc." 
              className="text-foreground" 
              placeholderTextColor="gray" 
              value={symptoms} 
              onChangeText={setSymptoms} 
            />
          </Textarea>
        </Box>

        <Box className="bg-card rounded-2xl p-6 mb-6 border border-border shadow-sm">
          <HStack className="justify-between items-center mb-4">
            <Heading className="text-sm text-foreground font-bold">4. Rescue Location</Heading>
            <Pressable className="flex-row items-center bg-primary/10 py-1.5 px-3 rounded-md" onPress={locateMe}>
              {isLocating ? (
                <Spinner size="small" className="text-primary" />
              ) : (
                <Text className="text-primary font-bold text-xs ml-1">Locate Me</Text>
              )}
            </Pressable>
          </HStack>
          <Input className="bg-background border-border rounded-xl mb-4 h-12">
            <InputField 
              value={address} 
              onChangeText={setAddress} 
              placeholder="Enter address" 
              className="text-foreground" 
              placeholderTextColor="gray" 
            />
          </Input>
          <Box className="h-[180px] rounded-xl overflow-hidden border border-border">
            {Platform.OS === 'web' ? React.createElement('iframe', {
              srcDoc: generateMapHtml(),
              style: { width: '100%', height: '100%', border: 'none' },
              title: 'Rescue Location'
            }) : WebView ? (
              <WebView source={{ html: generateMapHtml() }} originWhitelist={['*']} javaScriptEnabled domStorageEnabled />
            ) : (
              <VStack className="flex-1 bg-muted items-center justify-center p-5">
                <Text className="text-sm font-bold text-foreground mt-2">Location</Text>
                <Text className="text-xs text-muted-foreground mt-1">{location.latitude.toFixed(4)} N, {location.longitude.toFixed(4)} E</Text>
              </VStack>
            )}
          </Box>
        </Box>

        <Button 
          size="xl" 
          className={`py-4 rounded-xl mb-6 border-0 ${checkValidity && !isAnalyzing ? 'bg-destructive' : 'bg-muted'}`}
          disabled={!checkValidity || isAnalyzing} 
          onPress={handleSendAlert}
        >
          {isAnalyzing ? (
            <ButtonSpinner color="white" />
          ) : (
            <ButtonText className="text-white text-base font-bold">Send Alert & Run AI Diagnosis</ButtonText>
          )}
        </Button>

        <Box className={`border rounded-2xl p-6 ${aiDiagnosis ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
          <HStack className="items-center border-b border-border pb-3 mb-4">
            <Heading className="text-sm font-extrabold text-primary">AI Analysis</Heading>
          </HStack>
          
          {/* TODO(Add AI inaccuracy warning) */}
          
          {aiDiagnosis ? (
            <VStack className="w-full">
              <HStack className="gap-2 mb-3">
                <Box className={`px-2.5 py-1 rounded-md ${aiDiagnosis.confidence > 75 ? 'bg-destructive/20' : 'bg-amber-500/20'}`}>
                  <Text className={`text-[10px] font-bold ${aiDiagnosis.confidence > 75 ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'}`}>
                    {aiDiagnosis.confidence > 75 ? 'HIGH' : 'MEDIUM'}
                  </Text>
                </Box>
                <Box className="px-2.5 py-1 rounded-md bg-primary/20">
                  <Text className="text-[10px] font-bold text-primary">Confidence: {aiDiagnosis.confidence}%</Text>
                </Box>
              </HStack>
              
              <Heading className="text-lg font-extrabold text-foreground mb-4">{aiDiagnosis.condition}</Heading>
              
              <Heading className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">Immediate Actions:</Heading>
              
              {/* {aiDiagnosis.advice.map((item, index) => (
                    <View key={index} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{item}</Text>
                    </View>
                   ))} */}
              
              <Text className="text-foreground text-sm">{aiDiagnosis.advice}</Text>
              
              <HStack className="items-center bg-primary/10 p-3 rounded-md mt-5 border border-primary/20">
                <Text className="text-xs text-primary flex-1">
                  <Text className="font-bold text-primary">NGOs Alerted: </Text>
                  {aiDiagnosis.ngoAlertStatus}
                </Text>
              </HStack>
            </VStack>
          ) : (
            <VStack className="items-center justify-center py-6">
              <Text className="text-center text-muted-foreground text-sm leading-relaxed mt-3 max-w-[500px]">
                AI diagnosis.
              </Text>
            </VStack>
          )}
        </Box>

      </Box>
    </ScrollView>
  );
}
