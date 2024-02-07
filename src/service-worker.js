/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import {precacheAndRoute} from 'workbox-precaching';
import {initializeApp} from 'firebase/app';
import {getMessaging} from 'firebase/messaging/sw';

const manifest = self.__WB_MANIFEST;

const firebaseConfig = {
  apiKey: "AIzaSyC8pHMcFe9QcAH-0auLWPwpaIUu3F-UQcw",
  authDomain: "gymkhanacalendar.firebaseapp.com",
  projectId: "gymkhanacalendar",
  storageBucket: "gymkhanacalendar.appspot.com",
  messagingSenderId: "74846642585",
  appId: "1:74846642585:web:9abd6791254c250624b308",
  databaseURL:"https://gymkhanacalendar-default-rtdb.asia-southeast1.firebasedatabase.app/",
};
try {
	const messaging = getMessaging(initializeApp(firebaseConfig));
} catch (err) {
	//Browser doesn't support firebase messaging, usually because iOS Safari, so log a message to console and send a popup
	console.log("Browser doesn't support Firebase Messaging");
	// (new BroadCastChannel("error")).postMessage("messaging_error");
}

//handles grabbing clients from previous versions
clientsClaim();

self.skipWaiting();

console.log("SW activated")
console.log("Manifest:");
console.log(manifest);

precacheAndRoute(manifest);

