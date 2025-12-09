// Cole o objeto de configuração do Firebase que você copiou do console.
const firebaseConfig = {
  apiKey: "AIzaSyA_6Nfy6MW45UyEgEt15yaNbtRZlnNM5Bc",
  authDomain: "pdv-teste-494a2.firebaseapp.com",
  projectId: "pdv-teste-494a2",
  storageBucket: "pdv-teste-494a2.firebasestorage.app",
  messagingSenderId: "85393612762",
  appId: "85393612762:web:37e83ce3d70e6f705eeae3",
  measurementId: "G-STY7DSP3T6"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Inicializa o Firestore
