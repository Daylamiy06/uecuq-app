/* Configuration et initialisation Firebase (Auth + Realtime Database) */
window.UE = {mods: []};
window.fbOk = typeof firebase !== 'undefined' && !!firebase.auth && !!firebase.database;
let auth, db;
if (fbOk) {
  firebase.initializeApp({
  apiKey: "AIzaSyCh402NJnmy7NUABIQ-cRw8ujRrk9AOJj0",
  authDomain: "uecuq-db.firebaseapp.com",
  databaseURL: "https://uecuq-db-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "uecuq-db",
  storageBucket: "uecuq-db.firebasestorage.app",
  messagingSenderId: "1043911441442",
  appId: "1:1043911441442:web:ff07a9b7abc4a4588a9e7b"
});
  auth = firebase.auth(); db = firebase.database();
}
