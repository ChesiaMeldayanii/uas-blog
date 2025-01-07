const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getDatabase } = require("firebase/database"); // Import the Realtime Database API

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAFSqleA8lQI964_ZevT_oWjPs1icFrPDM",
  authDomain: "uas-blog-f0acc.firebaseapp.com",
  databaseURL:
    "https://uas-blog-f0acc-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "uas-blog-f0acc",
  storageBucket: "uas-blog-f0acc.appspot.com",
  messagingSenderId: "346540544636",
  appId: "1:346540544636:web:33e7ed75ea40e47fc32ff9",
  measurementId: "G-C5PRH15STF",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Modular syntax untuk Auth
const db = getDatabase(app); // Use Realtime Database instead of Firestore

module.exports = { auth, db };
