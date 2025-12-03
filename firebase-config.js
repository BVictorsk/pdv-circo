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

// Inicializa o Firestore
const db = firebase.firestore();

// Habilita a persistência e dispara um evento quando estiver pronto.
db.enablePersistence()
  .then(() => {
    console.log("Persistência de dados ativada. O app pode funcionar offline.");
  })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn("A persistência de dados falhou. Múltiplas abas podem causar este problema.");
    } else if (err.code == 'unimplemented') {
      console.warn("O navegador atual não suporta persistência de dados offline.");
    }
  })
  .finally(() => {
    // Dispara o evento 'firestoreReady' independentemente do resultado da persistência,
    // para que a aplicação possa continuar a ser executada.
    document.dispatchEvent(new Event('firestoreReady'));
  });