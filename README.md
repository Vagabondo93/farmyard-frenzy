# Farmyard Frenzy: The Golden Egg

Gioco di strategia a turni simultanei: compri una squadra di animali e umani al market, dai gli ordini,
e gli automi si sfidano da soli per rubare l'uovo d'oro avversario e portarlo nel proprio nido.

Versione giocabile online (claude.ai): https://claude.ai/artifact/3Xbkd2MF222Dx3ZsZGUuYW

## Contenuto della cartella

| File | Cosa contiene |
|---|---|
| `index.html` | Tutto il gioco: grafica, regole, simulazione, bot, modalità online. Si apre direttamente nel browser. |
| `banner.jpg`, `logo.webp` | Banner e logo usati nel menu (versioni alleggerite). |
| `icons/` | Illustrazioni dei personaggi (256×256, sfondo trasparente). Dove manca un file si usa il disegno vettoriale interno. |
| `docs/` | Banner e logo originali ad alta risoluzione. |
| `tools/bilanciamento.js` | Simula migliaia di battaglie tra squadre casuali e stampa quanto vince ogni unità e ogni ordine. |
| `tools/test-partite.js` | Gioca da solo partite contro il bot, Royal Rumble e partite online, e controlla che non ci siano errori. |
| `tools/test-timer.js` | Controlla il tempo per il Pronto online: conto alla rovescia, partenza automatica, giocatore sparito. |
| `tools/test-rumble-bot.js` | Royal Rumble online con 2 giocatori e 6 bot di riempimento: controlla che tutti vedano lo stesso risultato. |
| `tools/mock-db.js` | Database finto usato dai test per simulare più giocatori online su claude.ai. |
| `tools/test-firebase.js`, `tools/mock-firebase.js` | Test del sito pubblico con un Firebase simulato. |
| `firebase-config.js`, `firestore.rules`, `firebase.json` | Configurazione di Firebase per il sito pubblico. |
| `.nojekyll` | Dice a GitHub Pages di pubblicare i file così come sono. |

## Giocare in locale

Apri `index.html` con il browser. Senza connessione a claude.ai funzionano tutorial,
partite contro il bot e Royal Rumble contro 7 bot; profilo, stanze online e classifica no
(vedi sotto).

## Strumenti di sviluppo

Servono Node.js 18 o più recente.

```bash
npm install
npx playwright install chromium
```

```bash
npm run bilanciamento
```

Parametri: battaglie, oro per squadra, quota di unità ★★, round. Esempio a metà partita:

```bash
node tools/bilanciamento.js 6000 14 0.2 4
```

Stesso test nella modalità Nebbia:

```bash
VAR=fog node tools/bilanciamento.js 3000 14 0.2 4
```

Test delle partite:

```bash
npm test
```

## Modalità

- **Classica**: 1 contro 1, prese per vincere a scelta (1–7).
- **Nebbia**: 7 prese, 7 oro iniziali, ruscello centrale con due ponti nella nebbia; alcuni personaggi solo qui.
- **Royal Rumble**: fino a 8 giocatori, 2 uova a testa (max 5), avversario casuale ogni round, fame dal round 8,
  market condiviso con 19 copie per personaggio. Online si possono riempire i posti liberi con bot (l'Elo conta):
  la loro bravura parte dall'Elo medio dei giocatori e si adatta durante la partita.

Nelle partite online (1 contro 1 e Rumble) il round 1 non ha limiti di tempo; dal round 2, quando il primo
giocatore preme Pronto, gli altri hanno 60 s (+5 s per round, massimo 2 minuti). Allo scadere la squadra parte così
com'è; chi non risponde entro altri 15 s gioca il round con la squadra vuota. Le battaglie online scorrono in tempo
reale per tutti e accelerano da sole: ×1,5 dopo 20 s, ×2 dopo 35 s.

Le partite online sono deterministiche: ogni giocatore simula la stessa battaglia
a partire dalle squadre e dal seme casuale condivisi, quindi tutti vedono lo stesso risultato.

## Online

Sul sito pubblico l'online usa Firebase (accesso con Google o come ospite): la configurazione va in
`firebase-config.js`, le regole del database sono in `firestore.rules` e i passaggi per pubblicare sono in
`docs/PUBBLICAZIONE.md`. Dentro claude.ai il gioco usa invece il database della pagina.

## Come è nato l'online

Profili, Elo, classifiche e stanze usano il database integrato delle pagine di claude.ai
(`window.claude.use('db')`). Fuori da claude.ai quel database non esiste, quindi:

- **pubblicato come sito statico** (GitHub Pages, Netlify, Cloudflare Pages…) il gioco funziona subito
  in modalità offline: tutorial, bot e Rumble contro i bot;
- **per avere l'online anche lì** bisogna sostituire quel database con un servizio proprio
  (per esempio Firebase o Supabase) e un accesso con account. Il codice online è concentrato nella
  sezione `online` di `index.html` e usa poche operazioni (leggi, scrivi, aggiorna, ascolta i cambiamenti),
  quindi il passaggio è circoscritto.

## Limiti noti

- L'Elo viene calcolato e salvato dal browser di ciascun giocatore: per una classifica pubblica
  andrebbe calcolato da un server.
- Al round 1 non c'è limite di tempo, quindi chi chiude la pagina proprio lì lascia l'altro in attesa.
- Bilanciamento: Cane e Galli-co un po' forti, Benefattore debole (vedi `npm run bilanciamento`).
