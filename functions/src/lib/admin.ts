import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const app = initializeApp();
export const db = getFirestore(app);

export const REGION = 'europe-west3';
export const GRAPH_API_VERSION = 'v21.0';
