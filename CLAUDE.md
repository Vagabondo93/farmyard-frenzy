# Farmyard Frenzy: note per chi lavora al progetto

## Immagini generate (icone, sprite sheet, simboli)
- **Mai tagliare un foglio in celle uguali.** I generatori di immagini non rispettano la griglia: ali, zampe, code e stelline
  sconfinano nella cella accanto, e un taglio a celle uguali le mozza (è successo con Falco, Lupo e Castoro, e con l'attacco della Mucca).
- Sprite sheet (una riga di fotogrammi): `python3 tools/immagini/sheet.py foglio.png icons/anim/<pg>-<walk|atk|fly>.webp 4 <center|cell|right|cellright>`.
  I confini sono le colonne vuote più larghe tra un fotogramma e l'altro; stampa fw, fh e ax da copiare in `ANIM` (index.html).
- Griglie di icone: `python3 tools/immagini/cutgrid.py foglio.png COLONNE RIGHE nome1,nome2,... [buchi] [cartella]`.
  Ogni figura si prende intera come forma collegata, anche se esce dalla sua cella.
- Dopo ogni ritaglio controllare a occhio che nessuna figura abbia un bordo dritto (segno di taglio).
- Le nuove immagini vanno anche in `PRECACHE` di `sw.js`; se si sostituisce un'immagine esistente, aumentare `VERSION`.
- Sfondo nero: non scontornare per soglia di luminosità (i contorni scuri si fondono con lo sfondo e restano aloni). Chiedere l'immagine su bianco o trasparente.
- Topi: l'icona resta quella con più topi, ma le animazioni in campo sono di un solo topo (ogni topo è un'unità).
