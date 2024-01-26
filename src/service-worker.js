/* eslint-disable no-restricted-globals */

import { clientsClaim } from 'workbox-core';
import {precacheAndRoute} from 'workbox-precaching';

//handles grabbing clients from previous versions
clientsClaim();

self.skipWaiting();

const manifest = self.__WB_MANIFEST;

precacheAndRoute(manifest);

console.log("hello world")
console.log(manifest);
console.log("lol");
