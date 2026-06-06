import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithCredential,
    signOut
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';

//const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let GoogleSignin = null;
if (Platform.OS !== 'web') {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    GoogleSignin.configure({
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
            

            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const credential = GoogleAuthProvider.credential(userInfo.idToken);
            return await signInWithCredential(auth, credential);

        } catch (error) {
            console.error("Error:", error);
            //TODO(Show error.)
        }
    };

    const logout = async () => {
        if (Platform.OS !== 'web' && GoogleSignin) {
            await GoogleSignin.signOut();
        }
        return await signOut(auth);
    };

    return { user, loading, loginWithGoogle, logout };
};