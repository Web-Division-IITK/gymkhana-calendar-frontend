# Gymkhana Calendar

A Firebase application for a campus-wide events calendar. Notifications enabled when notifications.sntiitk.com is online.

## Dev Set-up
 - Run `firebase emulators:start` to start the Firebase Emulator Suite (don't test on the production )
     - Note: hosting emulation is also enabled, disable if unneeded
 - Run `npm run start` to start the React dev server (will use the local emulator tools rather than the production ones)
     - Note: you can override this by specifying `REACT_APP_USE_PROD=true` (or anything except `false`) in .env/on the command line
     - Note: service worker probably won't work (fix this!)
 - Note: for now, to test the service worker, build the front-end with the environment variable `REACT_APP_PROD_USE_EMU=true` (or anything except `false`) in .env/on the command line (`GENERATE_SOURCEMAP=true` is also recommended)
     - Warning: sometimes rebuilding will not apply until you close the window/tab and then open it again (service worker issues). You can also manually update the service worker by unregistering it (in DevTools)
 - In the emulator, add an admin user by adding a user with the custom claims `{"admin":true}`
 - Use `sampledb.json` for the local realtime database (make sure to upload it to "gymkhanacalendar-default-rtdb")

## Deployment
 - Run `npm run build` to build the front-end files *(make sure that `REACT_APP_PROD_USE_EMU` is false!)*
 - Run `firebase deploy` to update any DB/Storage rules and deploy the built front-end files to Firebase Hosting

## Notes
 - Google Calendar URL reference: https://github.com/InteractionDesignFoundation/add-event-to-calendar-docs/blob/main/services/google.md