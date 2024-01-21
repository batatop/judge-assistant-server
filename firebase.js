const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://judge-assistant-3c8dd-default-rtdb.europe-west1.firebasedatabase.app",
  storageBucket: "judge-assistant-3c8dd.appspot.com" 
});

exports.firebase = admin;
exports.storage = admin.storage();
exports.db = admin.database();