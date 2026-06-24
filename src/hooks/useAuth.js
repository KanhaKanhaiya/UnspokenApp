import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    signOut
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { getAuth } from 'firebase/auth';

let GoogleOneTapSignIn = null;
let isNoSavedCredentialFoundResponse = null;
let isSuccessResponse = null;
if (Platform.OS !== 'web') {
    GoogleOneTapSignIn = require('react-native-nitro-google-signin').GoogleOneTapSignIn;
    isNoSavedCredentialFoundResponse = require('react-native-nitro-google-signin').isNoSavedCredentialFoundResponse;
    isSuccessResponse = require('react-native-nitro-google-signin').isSuccessResponse;
    GoogleOneTapSignIn.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
}

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const loginWithGoogle = async () => {
        try {
            if (Platform.OS === 'web') {
                const provider = new GoogleAuthProvider();
                return await signInWithPopup(auth, provider);
            }

            // if (isExpoGo)
            //     return;


            await GoogleOneTapSignIn.checkPlayServices()

            let response = await GoogleOneTapSignIn.signIn();
            if (isNoSavedCredentialFoundResponse(response)) {
                response = await GoogleOneTapSignIn.createAccount();
            }
            if (isNoSavedCredentialFoundResponse(response)) {
                response = await GoogleOneTapSignIn.presentExplicitSignIn();
            }

            if (!isSuccessResponse(response)) {
                throw new Error('Google Sign-In was cancelled or failed');
            }

            const idToken = response.data?.idToken;
            if (!idToken) {
                throw new Error('No ID token found');
            }
            const googleCredential = GoogleAuthProvider.credential(idToken);
            return signInWithCredential(getAuth(), googleCredential);

        } catch (error) {
            console.error("Error:", error);
            //TODO(Show error.)
        }
    };

    const logout = async () => {
        if (Platform.OS !== 'web') {
            await GoogleOneTapSignIn.signOut()
        }
        return await signOut(auth);
    };

    return { user, loading, loginWithGoogle, logout };
};