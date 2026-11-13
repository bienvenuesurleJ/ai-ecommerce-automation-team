-- Schema SQL pour future base de données (PostgreSQL / SQLite)
-- À utiliser quand on passera de la simulation client-side à un backend

CREATE TABLE simulations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Default',
  starting_capital DECIMAL(12,2) NOT NULL DEFAULT 10000.00,
  current_capital DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  simulation_id INTEGER REFERENCES simulations(id),
  name VARCHAR(255) NOT NULL,
  demand DECIMAL(5,2),
  competition DECIMAL(5,2),
  margin DECIMAL(5,2),
  score DECIMAL(5,2),
  price DECIMAL(10,2),
  cost DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE creatives (
  id SERIAL PRIMARY KEY,
  simulation_id INTEGER REFERENCES simulations(id),
  product_id INTEGER REFERENCES products(id),
  hook TEXT,
  style VARCHAR(50),
  status VARCHAR(50) DEFAULT 'Creating',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaigns (
  id SERIAL PRIMARY KEY,
  simulation_id INTEGER REFERENCES simulations(id),
  product_id INTEGER REFERENCES products(id),
  creative_id INTEGER REFERENCES creatives(id),
  platform VARCHAR(50),
  budget DECIMAL(10,2),
  spent DECIMAL(10,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  roas DECIMAL(8,2),
  cpa DECIMAL(8,2),
  status VARCHAR(50) DEFAULT 'LIVE',
  is_winner BOOLEAN,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_log (
  id SERIAL PRIMARY KEY,
  simulation_id INTEGER REFERENCES simulations(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE approvals (
  id SERIAL PRIMARY KEY,
  simulation_id INTEGER REFERENCES simulations(id),
  campaign_id INTEGER REFERENCES campaigns(id),
  type VARCHAR(20), -- 'scale' or 'kill'
  message TEXT,
  amount DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performances
CREATE INDEX idx_campaigns_sim ON campaigns(simulation_id);
CREATE INDEX idx_log_sim ON activity_log(simulation_id);
CREATE INDEX idx_approvals_status ON approvals(status);