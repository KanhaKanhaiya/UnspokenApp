import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  getReactNativePersistence,
  browserLocalPersistence,
  getAuth
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getDatabase } from 'firebase/database';
import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from "firebase/ai";
import { installAbortSignalPolyfill } from 'abort-signal-polyfill';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);

installAbortSignalPolyfill()

let auth;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const database = getDatabase(app);

const ai = getAI(app, { backend: new GoogleAIBackend() });

      const jsonSchema = Schema.object({
 properties: {
    characters: Schema.array({
      items: Schema.object({
        properties: {
          condition: Schema.string(),
          confidence: Schema.number(),
          advice: Schema.string(),
          ngoAlertStatus: Schema.string(),
        },
      }),
    }),
  }
});

const model = getGenerativeModel(ai, { model: "gemini-3.1-flash-lite", generationConfig: {
    responseMimeType: "application/json",
    responseSchema: jsonSchema
  }, });

export { auth, database, model };