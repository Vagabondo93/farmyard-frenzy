# Mettere online Farmyard Frenzy (gratis)

Due servizi gratuiti:

- **GitHub Pages** ospita il sito, pubblicando direttamente i file del ramo `main`: ogni aggiornamento
  inviato al repository va online da solo in un paio di minuti.
- **Firebase** (piano gratuito "Spark") gestisce accesso con account e database: profili, classifiche, stanze.

## 1. Repository GitHub

1. Su https://github.com/new crea un repository vuoto, per esempio `farmyard-frenzy` (pubblico: GitHub Pages
   gratuito richiede un repository pubblico sui piani gratuiti). Non aggiungere README o licenza.
2. Dì a Claude il nome del repository: lo collega alla sessione e ci carica il progetto.
3. Nel repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   ramo **main**, cartella **/ (root)**, poi **Save**.
4. Il sito sarà su `https://<tuo-utente>.github.io/farmyard-frenzy/`.

## 2. Progetto Firebase

1. Vai su https://console.firebase.google.com e crea un progetto (Google Analytics non serve).
2. **Authentication → Inizia → Metodo di accesso**: attiva **Google** e **Anonimo**.
3. **Authentication → Impostazioni → Domini autorizzati**: aggiungi `<tuo-utente>.github.io`.
4. **Firestore Database → Crea database**: modalità produzione, scegli una località europea (es. `eur3`).
5. **Firestore → Regole**: incolla il contenuto di `firestore.rules` e premi **Pubblica**.
6. **Impostazioni progetto (ingranaggio) → Le tue app → Web (`</>`)**: registra l'app e copia l'oggetto
   `firebaseConfig`. Mandalo a Claude (non è un segreto) oppure incollalo in `firebase-config.js`.

## 3. Aggiornamenti

Le modifiche fatte con Claude vengono salvate nel repository: GitHub Pages le pubblica da sola.
Lo stato della pubblicazione si vede nella scheda **Actions** del repository.

## Limiti del piano gratuito

Il piano Spark di Firestore include ogni giorno circa 50.000 letture e 20.000 scritture: bastano per
giocare tra amici. Se il gioco crescesse molto, si valuta il passaggio a un piano a consumo.
