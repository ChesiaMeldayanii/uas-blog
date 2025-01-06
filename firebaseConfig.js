const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getDatabase } = require('firebase/database'); // Import the Realtime Database API

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyClHqtYrBXvUuqhESGwS-t81H0Dq8zjT7g",
  authDomain: "blog-5ba0a.firebaseapp.com",
  projectId: "blog-5ba0a",
  storageBucket: "blog-5ba0a.appspot.com",
  messagingSenderId: "982577444950",
  appId: "1:982577444950:web:652401ee1ed339d864a3f7",
  measurementId: "G-EFMXXLMFHJ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Modular syntax untuk Auth
const db = getDatabase(app); // Use Realtime Database instead of Firestore

module.exports = { auth, db };