const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('dricie.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS drinks (
    key_id TEXT PRIMARY KEY,
    name TEXT,
    category TEXT,
    start_price REAL,
    min_price REAL
  )`);

  const stmt = db.prepare("INSERT OR REPLACE INTO drinks VALUES (?, ?, ?, ?, ?)");

  
  const menu = [
    ['pils', 'Pils', 'Kegs', 0.60, 0.50],
    ['pitcher', 'Pitcher Pils', 'Kegs', 3.60, 3.00],
    ['bok', 'Bok', 'Kegs', 1.80, 1.50],
    ['degusteau', 'Degusteau', 'Kegs', 1.80, 1.50],
    ['wit', 'Wit', 'Kegs', 1.80, 1.50],
    ['zoete_japie', 'Zoete Japie', 'Kegs', 1.80, 1.50],
    ['honig_tripel', 'Honig Tripel', 'Kegs', 1.80, 1.50],
    ['oerpils', 'Oerpils', 'Kegs', 1.80, 1.50],

    ['pepsi_l', 'Pepsi', 'Large Soda', 0.60, 0.50],
    ['bitterlemon', 'Bitterlemon', 'Large Soda', 0.60, 0.50],
    ['7up', '7-UP', 'Large Soda', 0.60, 0.50],
    ['sinas', 'Sinas', 'Large Soda', 0.60, 0.50],
    ['sourcy', 'Sourcy Rood', 'Large Soda', 0.60, 0.50],
    ['rivella', 'Rivella Groot', 'Large Soda', 0.60, 0.50],

    ['icetea', 'Ice Tea', 'Small Soda', 0.75, 0.60],
    ['pepsi_max', 'Pepsi Max', 'Small Soda', 0.75, 0.60],
    ['orange_juice', 'Orange Juice', 'Small Soda', 0.75, 0.60],

    ['twentes_radler', 'Twentes Radler', 'Bottles', 1.80, 1.50],
    ['twents_wit', 'Twents Wit', 'Bottles', 1.80, 1.50],
    ['warsteiner_00', 'Warsteiner 0.0%', 'Bottles', 1.80, 1.50],

    ['wine_sweet', 'Sweet White', 'Wine', 1.20, 1.00],
    ['wine_dry', 'Dry White', 'Wine', 1.20, 1.00],
    ['wine_red', 'Red', 'Wine', 1.20, 1.00]
  ];

  menu.forEach(drink => {
    stmt.run(drink);
  });
  
  stmt.finalize();
  console.log("DRICIE database setup completed successfully");
});

db.close();