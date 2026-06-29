import 'dotenv/config.js';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

function get_required_env(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

const firebase_config = {
    apiKey: get_required_env('FIREBASE_API_KEY'),
    authDomain: get_required_env('FIREBASE_AUTH_DOMAIN'),
    projectId: get_required_env('FIREBASE_PROJECT_ID'),
    storageBucket: get_required_env('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: get_required_env('FIREBASE_MESSAGING_SENDER_ID'),
    appId: get_required_env('FIREBASE_APP_ID'),
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
};

const firebase_app = getApps().length === 0
    ? initializeApp(firebase_config)
    : getApps()[0];

const db = getFirestore(firebase_app);

export { db, firebase_app };
