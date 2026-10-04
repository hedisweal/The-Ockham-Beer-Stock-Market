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
        let simulatedHistory = [];
        let currentSimPrice = row.start_price;
        
        for (let i = 0; i < 39; i++) {
          let noise = (Math.random() * 0.15) - 0.075;
          currentSimPrice = Math.max(row.min_price, currentSimPrice + noise);
          simulatedHistory.push(Math.round(currentSimPrice * 20) / 20);
        }
        simulatedHistory.push(row.start_price); 

        beers[row.key_id] = {
          name: row.name,
          category: row.category,
          price: row.start_price,
          minPrice: row.min_price,
          salesThisTick: 0,
          history: simulatedHistory, 
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
    
    let totalMarketSales = 0;
    for (const id in beers) {
      totalMarketSales += beers[id].salesThisTick;
    }
    
    for (const id in beers) {
      const b = beers[id];
      const sales = b.salesThisTick;
      let nextPrice = b.price;
      
      if (b.forcedNextPrice !== null) {
        nextPrice = b.forcedNextPrice;
        b.forcedNextPrice = null;
      } else {
        if (totalMarketSales > 0) {
          if (sales > 0) {
            nextPrice += (sales * 0.20);
          } else {
            nextPrice -= 0.15;
          }
        } else {
          nextPrice -= 0.10;
        }

        let volatility = (Math.random() * 0.10) - 0.05;
        nextPrice += volatility;
      }
      
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
      if (beers[id] && typeof count === 'number' && count > 0) {
        beers[id].salesThisTick += count;
      }
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
      beers[id].history = Array(40).fill(beers[id].minPrice);
      beers[id].forcedNextPrice = null; 
      beers[id].salesThisTick = 0; 
    }
    io.emit('market_update', { beers, tickTimeLeft });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🍺 Server is running! Open http://localhost:${PORT} in your browser.`);
});