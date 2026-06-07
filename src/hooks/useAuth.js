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

let GoogleSignIn = null;
if (Platform.OS !== 'web') {
    GoogleSignIn = require('@react-native-google-signin/google-signin').GoogleSignIn;
    GoogleSignIn.configure({
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
            

            await GoogleSignIn.hasPlayServices();
            const userInfo = await GoogleSignIn.signIn();
            const credential = GoogleAuthProvider.credential(userInfo.idToken);
            return await signInWithCredential(auth, credential);

        } catch (error) {
            console.error("Error:", error);
            //TODO(Show error.)
        }
    };

    const logout = async () => {
        if (Platform.OS !== 'web' && GoogleSignIn) {
            await GoogleSignIn.signOut();
        }
        return await signOut(auth);
    };

    return { user, loading, loginWithGoogle, logout };
};