/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import {precacheAndRoute} from 'workbox-precaching';

const manifest = self.__WB_MANIFEST;

//handles grabbing clients from previous versions
clientsClaim();

self.skipWaiting();

console.log("SW activated")
console.log("Manifest:");
console.log(manifest);

precacheAndRoute(manifest);

