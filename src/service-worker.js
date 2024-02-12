/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import {precacheAndRoute} from 'workbox-precaching';
import {initializeApp} from 'firebase/app';
import {getMessaging, onBackgroundMessage} from 'firebase/messaging/sw';

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
	onBackgroundMessage(messaging, payload => {
		self.registration.showNotification(payload.notification.title, {body: payload.notification.body});
		//same as below, fetch events again but don't focus the client this time
		self.clients
			.matchAll({type:"window"})
			.then((clientList) => {
				if (clientList.length == 0) {
					console.log("no opened windows");
// 					return self.clients.openWindow(`${self.location.origin}`).then(windowClient => {
// 						windowClient.postMessage("get new events");
// 						return windowClient.focus();
// 					});
				} else {
					for (const client of clientList) {
						console.log("sending message to window");
						client.postMessage("get new events");
					}
// 					console.log("focusing first window");
// 					return clientList[0].focus();
				}
			})
			.catch(err => {
				console.error("Error when trying to open notification and send message to pages");
				console.error(err);
			})
	});
	self.addEventListener("notificationclick", (e) => {
		console.log("notification clicked");
		e.notification.close();
		//if the notification is clicked, send a message to clients to fetch new events
		//if no client, make one
		//focus the client
		e.waitUntil(
			self.clients
			.matchAll({type:"window"})
			.then((clientList) => {
				if (clientList.length == 0) {
					console.log("no opened windows");
					return self.clients.openWindow(`${self.location.origin}`).then(windowClient => {
						windowClient.postMessage("get new events");
						return windowClient.focus();
					});
				} else {
// 					for (const client of clientList) {
// 						console.log("sending message to window");
// 						client.postMessage("get new events");
// 					}
					console.log("focusing first window");
					return clientList[0].focus();
				}
			})
			.catch(err => {
				console.error("Error when trying to open notification and send message to pages");
				console.error(err);
			})
		)
	});
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

