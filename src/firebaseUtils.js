import {useEffect, useState, useSyncExternalStore} from "react";

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, connectAuthEmulator } from "firebase/auth";
import { getDatabase, ref as dbref, get, connectDatabaseEmulator, onValue } from "firebase/database";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getMessaging, onMessage, isSupported} from "firebase/messaging";


const firebaseConfig = { //it's ok to put these here, I checked
  apiKey: "AIzaSyC8pHMcFe9QcAH-0auLWPwpaIUu3F-UQcw",
  authDomain: "gymkhanacalendar.firebaseapp.com",
  projectId: "gymkhanacalendar",
  storageBucket: "gymkhanacalendar.appspot.com",
  messagingSenderId: "74846642585",
  appId: "1:74846642585:web:9abd6791254c250624b308",
  databaseURL:"https://gymkhanacalendar-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDatabase = getDatabase(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
// export const firebaseMessaging = null;
// export const firebaseMessaging = (async () => (isSupported() ? getMessaging(firebaseApp) : null))(); //error handling present on all invocations of firebaseMessaging in App.js so this isn't an issue
export const firebaseMessaging = (async () => {
	if (await isSupported()) return getMessaging(firebaseApp);
	else return null;
})();

// connectDatabaseEmulator(firebaseDatabase, "127.0.0.1", 9000);
// connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099");
// connectStorageEmulator(firebaseStorage, "127.0.0.1", 9199);

export const entitiesRef = dbref(firebaseDatabase, "/entities");
export const approvedRef = dbref(firebaseDatabase, "/approved");
export const requestedRef = dbref(firebaseDatabase, "/requested");

const firebaseAuthStore = {
	subscribe(callback) {
		return onAuthStateChanged(firebaseAuth, callback)
	},
	getSnapshot() {
		return firebaseAuth.currentUser
	}
}

//some helper functions for firebaseEventsStore
function unpackEvents(snapshot, status, entities) {
// 	console.log("unpackEvents: entities:");
// 	console.log(entities);
// 	console.log(`unpackEvents ${status}`)
	let eventsArr = []
	snapshot.forEach(el => {
		let event = el.val();
		event.orgKey = event.org;
		event.org = entities[event.orgKey];
		event.key = el.key;
		event.status = status;
		eventsArr.push(event);
		// for (const [key, value] of Object.entries(el.val())) {
// 			value.org = entities[el.key];
// 			value.orgKey = el.key;
// 			value.key = key; //for referencing later on if signed in - then updates become dynamic/connection to db opened for constant updates
// 			value.status = status;
// 			eventsArr.push(value);
// 		}
	});
	eventsArr.sort((a, b) => (a.date - b.date)); //sorts by start time
// 	console.log(eventsArr);
	return eventsArr;
}

const firebaseEventsStore = {
	returnValue: {
		events: {
			approved: [],
			requested: []
		},
		entities: {}}, //needed for "caching" and because I don't feel like separating this into another store
	//(react needs to get the same object back if there is no update)
	eventsUnsub: () => {}, //initialize as 'empty' function
	authUnsub: null,
	setReturnValue(obj) {
		this.returnValue = {
			...this.returnValue,
			...obj
		}
	},
	interval: 0,
	pollTime: 5, //in minutes
	pollEvents: (async function () {
		// console.log("Poll events called");
		let prev = Number(localStorage.getItem("updateTime")); //null if not present
			if (Date.now() - Number(prev) > this.pollTime*60*1000) { 
				try {
					let entities_temp = (await get(entitiesRef)).val();
					console.log(entities_temp);
					let snapshot = await get(approvedRef);
					this.setReturnValue({
						entities: entities_temp,
						events: {
							approved: unpackEvents(snapshot, "approved", entities_temp),
							requested: this.returnValue.events.requested,
						}
					})
					localStorage.setItem("events",JSON.stringify(this.returnValue.events.approved));
					localStorage.setItem("entities",JSON.stringify(this.returnValue.entities));
					console.log("Fetched events and entities!");
				} catch (err) {
					console.error("Error in fetching events data");
					console.error(err);
				}
				localStorage.setItem("updateTime", Date.now());
			} else {// get events localStorage
				try {
					let events_approved_temp = localStorage.getItem("events");
					if (events_approved_temp == null) throw new Error("No events stored!");
					let entities_temp = localStorage.getItem("entities");
					if (entities_temp == null) throw new Error("No entities stored!");
					this.setReturnValue({
						entities: JSON.parse(entities_temp),
						events: {
							approved: JSON.parse(events_approved_temp),
							requested: this.returnValue.events.requested,
						}
					})
				} catch (err) {
					console.error("Error in getting events/entities data locally");
					console.error(err);
				}
			}
			//either way, once everything is done, execute the callback (stored in this.subscribers) so that react fetches new data
			this.subscriber();
	}),
	subscriber: () => {
		console.log("Empty subscriber called");
	},
	unsubscribe() {
		console.log("unsubscribe called")
		clearInterval(this.interval);
		this.subscriber = () => {
			console.log("Empty subscriber called");
		}
		this.eventsUnsub();
		this.authUnsub();
	},
	subscribe(callback) {
		//fetch events and entities every 5 minutes
		if (!firebaseAuth.currentUser) {
			this.subscriber = callback;
			this.pollEvents();
			this.interval = setInterval(this.pollEvents.bind(this), (this.pollTime*60)*1000 + 1);
		}
		//when signed in: sets up a callback for events and entities
		//on auth change: if signing out: clean up ^ call back
		this.authUnsub = onAuthStateChanged(firebaseAuth, () => {
			//plan: we use onAuthState to set up the callback for events and entities
			//we can store the callback in eventsUnsub so shouldn't be a problem...?
			// console.log("onAuthStateChanged callback");
			if (firebaseAuth.currentUser) {
				//clear the polling
				if (this.interval !== 0) clearInterval(this.interval);
				//signed in -> set up callback
				let approvedUnsub = onValue(approvedRef, (snapshot) => {
// 					console.log("New approved events data");
					// console.log(snapshot);
					this.setReturnValue({
						events: {
							approved: unpackEvents(snapshot, "approved", this.returnValue.entities),
							requested: this.returnValue.events.requested,
						}
					})
					localStorage.setItem("events",JSON.stringify(this.returnValue.events.approved));
					//call the callback to notify that there is an update
					callback();	
				})
				let requestedUnsub = onValue(requestedRef, (snapshot) => {
// 					console.log("New requested events data");
					// console.log(snapshot)
					this.setReturnValue({
						events: {
							approved: this.returnValue.events.approved,
							requested: unpackEvents(snapshot, "requested", this.returnValue.entities),
						}
					})
					//call the callback
					callback();	
				})
				this.eventsUnsub = () => {
					//these should be captured because closure
					// console.log("unsubscribed")
					approvedUnsub();
					requestedUnsub();
				}
			} else { //i.e. when signing out
				// console.log("signout unsub");
				this.setReturnValue({
					events:{
						approved: this.returnValue.events.approved,
						requested: []
					}
				})
				this.eventsUnsub(); //unsubscribe from everything
				this.eventsUnsub = () => {};
				//set up polling interval again, no need to immediately poll because events were already on instant delivery before
				this.interval = setInterval(this.pollEvents.bind(this), (this.pollTime*60)*1000 + 1);
			}
		});
		return () => (this.unsubscribe.bind(this));
	},
	getSnapshot() {
		return this.returnValue; 
	}
}

firebaseEventsStore.pollEvents(); //pollEvents once on startup
// firebaseEventsStore.interval = setInterval(firebaseEventsStore.pollEvents.bind(firebaseEventsStore), (firebaseEventsStore.pollTime*60)*1000 + 1);
//no need for ^ because subscribing already does this

const firebaseEventsSubscribe = firebaseEventsStore.subscribe.bind(firebaseEventsStore);
const firebaseEventsSnapshot = firebaseEventsStore.getSnapshot.bind(firebaseEventsStore);

(async () => {
	onMessage(await firebaseMessaging, (payload) => {
		console.log('Message received. ', payload);
		//poll events once as well if not logged in
		if (!firebaseAuth.currentUser) {
			//remove updateTime in localStorage so that pollEvents actually works
			console.log("polling events");
			localStorage.removeItem("updateTime");
			firebaseEventsStore.pollEvents();
		}
		navigator.serviceWorker.ready.then((registration) => {
			registration.showNotification(payload.notification.title, {body: payload.notification.body});
		});
	});
})();

//add a message handler for when service worker sends event update message
if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener("message", (e) => {
	console.log("message from service worker");
	console.log(e)
	if (e.data === "get new events") {
		console.log("polling events");
		localStorage.removeItem("updateTime");
		firebaseEventsStore.pollEvents();
	}
});

export function useFirebase() {//hook to abstract all firebase details
	const user = useSyncExternalStore(firebaseAuthStore.subscribe, firebaseAuthStore.getSnapshot);
	const {events, entities} = useSyncExternalStore(
		firebaseEventsSubscribe, 
		firebaseEventsSnapshot
	);
	//^ both functions use 'this' liberally so need to bind 'this' to firebaseEventsStore
	
// 	console.log("Refreshing")
	
	const [privileges, setPrivileges] = useState({});
	// console.log({
// 		user,
// 		events,
// 		entities
// 	})
	useEffect(()=> {
		(async () => {
		if (user) {
			let claims = (await firebaseAuth.currentUser.getIdTokenResult()).claims;
			if (claims.admin) {
				let temp = {}
				for (const entity of Object.keys(entities)) {
					temp[entity] = "approve";
				}
				setPrivileges(temp);
			}
			else if (claims.roles !== undefined) setPrivileges(claims.roles);
		} else {
			setPrivileges({});
		}
		})();
	},[user, entities]); //user may load before entities so re-run whenever entities is filled
	return {
		user,
		events,
		entities,
		privileges
	}
}