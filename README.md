# Secret Doodle MEGA

Party game multijoueur : réponds à une question secrète, dessine la réponse d'un autre joueur, puis devine à qui appartient le secret.

## Nouveautés MEGA

- Parties plus longues : 1 à 10 rounds.
- Packs de questions : Fun tranquille, Chaos, Absurdoodle, École, Gaming, Méga Mix.
- Réponse piège optionnelle.
- Votes bonus drôles.
- Défis de dessin + événements chaos à chaque round.
- Score cumulatif + badges de fin + galerie des dessins.
- UI plus pro, responsive téléphone/PC.
- Serveur prêt pour Railway.
- Client prêt pour Vercel.

## Lancer en local

```bash
npm install
npm run install-all
npm run dev
```

Site : http://localhost:5173
Serveur : http://localhost:3001

## Déploiement

### Vercel
Root Directory : `client`

### Railway
Root Directory : `server`
Start command : `npm start`

Le serveur écoute automatiquement `process.env.PORT`.

## URL serveur côté client

Dans `client/src/main.jsx`, le client utilise :

```js
const SERVER_URL = import.meta.env.VITE_SERVER_URL || ...
```

Sur Vercel, tu peux ajouter une variable :

```txt
VITE_SERVER_URL=https://ton-serveur.up.railway.app
```

## Ajouts MEGA

- Mini chat dans la room.
- Réactions emoji flottantes.
- Timers configurables pour réponses et dessins.
- Événements de round : mème, monstre, détail caché, drama, etc.
- Canvas amélioré : palette, gomme, undo, taille du pinceau.
- Galerie finale de tous les dessins.
- Jusqu’à 10 rounds pour des parties plus longues.
