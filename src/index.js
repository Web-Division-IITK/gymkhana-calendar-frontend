import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

//register service worker
window.addEventListener('load', async () => {
	if (!('serviceWorker' in navigator)) return;
	try {
		const registration = await navigator.serviceWorker.register("/service-worker.js");
		let sw;
		console.log("Registered service worker");
		if (registration.installing) {
			console.log("Installing...");
			sw = registration.installing;
		} else if (registration.waiting) {
			console.log("Waiting, this should not happen (?)");
			sw = registration.waiting;
		} else if (registration.active) {
			console.log("Active!");
			sw = registration.active;
			console.log(sw)
			sw.postMessage({t:"Hello"})
		}
		registration.addEventListener("statechange", (e) => {
			console.log("State change");
			console.log(sw.state)
		})
	} catch (err) {
		console.error(`Service worker error ${err}`);
	}
});

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
