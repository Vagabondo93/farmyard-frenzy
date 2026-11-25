// Configurazione Firebase per il sito pubblico.
// 1. Crea il progetto su https://console.firebase.google.com (piano gratuito "Spark").
// 2. Impostazioni progetto → Le tue app → aggiungi un'app Web → copia qui l'oggetto firebaseConfig.
// Finché resta null il gioco funziona solo offline (tutorial, bot, Rumble contro i bot).
// Questi valori non sono segreti: identificano il progetto, la protezione la danno le regole in firestore.rules.
window.FF_FIREBASE = null;
/* Esempio:
window.FF_FIREBASE = {
  apiKey: "AIza...",
  authDomain: "farmyard-frenzy.firebaseapp.com",
  projectId: "farmyard-frenzy",
  storageBucket: "farmyard-frenzy.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef"
};
*/
