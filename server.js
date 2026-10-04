const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let beers = {}; 
let tickTimeLeft = 30; 

const db = new sqlite3.Database('dricie.db', (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the Dricie SQLite database.");
    
    db.all("SELECT * FROM drinks", [], (err, rows) => {
      if (err) throw err;
      
      rows.forEach(row => {
        // 1. GÉNÉRATION DU PRE-MARKET (Création d'un faux historique vivant)
        let simulatedHistory = [];
        let currentSimPrice = row.start_price;
        
        for (let i = 0; i < 39; i++) {
          // Bruit aléatoire de +/- 0.05 ou 0.10
          let noise = (Math.random() * 0.15) - 0.075;
          currentSimPrice = Math.max(row.min_price, currentSimPrice + noise);
          // Arrondi à 5 centimes
          simulatedHistory.push(Math.round(currentSimPrice * 20) / 20);
        }
        simulatedHistory.push(row.start_price); // Le point actuel est le vrai prix de départ

        beers[row.key_id] = {
          name: row.name,
          category: row.category,
          price: row.start_price,
          minPrice: row.min_price,
          salesThisTick: 0,
          history: simulatedHistory, // On injecte l'historique simulé
          forcedNextPrice: null
        };
      });
      console.log(`${rows.length} drinks loaded into the market!`);
    });
  }
});

setInterval(() => {
  tickTimeLeft--;

  if (tickTimeLeft <= 0) {
    tickTimeLeft = 30; 
    
    // Calcul du volume global de transactions dans le bar
    let totalMarketSales = 0;
    for (const id in beers) {
      totalMarketSales += beers[id].salesThisTick;
    }
    
    for (const id in beers) {
      const b = beers[id];
      const sales = b.salesThisTick;
      let nextPrice = b.price;
      
      if (b.forcedNextPrice !== null) {
        // Priorité absolue au barman
        nextPrice = b.forcedNextPrice;
        b.forcedNextPrice = null;
      } else {
        // 2. LE VRAI ALGORITHME BOURSIER
        if (totalMarketSales > 0) {
          if (sales > 0) {
            // Demande forte : La boisson explose (+0.20 par vente)
            nextPrice += (sales * 0.20);
          } else {
            // Délaissée : Les autres se vendent mais pas elle, elle chute (-0.15)
            nextPrice -= 0.15;
          }
        } else {
          // Marché mort (0 ventes au total) : Baisse lente et générale de -0.10
          nextPrice -= 0.10;
        }

        // 3. MOTEUR DE VOLATILITÉ (Bruit de marché aléatoire)
        // Ajoute entre -0.05 et +0.05 à chaque tick pour "casser" les lignes plates
        let volatility = (Math.random() * 0.10) - 0.05;
        nextPrice += volatility;
      }
      
      // 4. LISSAGE À 5 CENTIMES ET PRIX PLANCHER
      b.price = Math.max(b.minPrice, Math.round(nextPrice * 20) / 20);
      
      b.history.push(b.price);
      if (b.history.length > 40) b.history.shift(); 
      
      b.salesThisTick = 0; 
    }
  }

  io.emit('market_update', { beers, tickTimeLeft });
}, 1000);

io.on('connection', (socket) => {
  socket.emit('market_update', { beers, tickTimeLeft });

  socket.on('order', (cart) => {
    for (const [id, count] of Object.entries(cart)) {
      if (beers[id]) beers[id].salesThisTick += count;
    }
  });

  socket.on('force_price', ({ id, price }) => {
    if (beers[id]) {
      beers[id].forcedNextPrice = Math.max(beers[id].minPrice, parseFloat(price));
    }
  });

  socket.on('admin_crash', () => {
    for (const id in beers) {
      beers[id].price = beers[id].minPrice; 
      beers[id].history = Array(40).fill(beers[id].minPrice); // Le krach efface l'historique
      beers[id].forcedNextPrice = null; 
    }
    io.emit('market_update', { beers, tickTimeLeft });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🍺 Server is running! Open http://localhost:${PORT} in your browser.`);
});