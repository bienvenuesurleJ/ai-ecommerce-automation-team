// simulation.js - Moteur de simulation séparé
class SimulationEngine {
  constructor() {
    this.capital = 10000; // €
    this.startingCapital = 10000;
    this.revenue = 0;
    this.adSpend = 0;
    this.productCosts = 0;
    this.fees = 0;
    this.refunds = 0;
    this.netProfit = 0;
    this.orders = 0;
    this.campaigns = [];
    this.products = [];
    this.creatives = [];
    this.history = [];
    this.activityLog = [];
    this.agents = {
      research: { status: 'IDLE', working: false, interval: null },
      creative: { status: 'IDLE', working: false, interval: null },
      media: { status: 'IDLE', working: false, interval: null },
      optimization: { status: 'IDLE', working: false, interval: null },
      you: { status: 'IDLE', pendingApprovals: [] }
    };
    this.listeners = [];
    this.tickInterval = null;
    this.running = false;
  }

  onUpdate(callback) {
    this.listeners.push(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.getState()));
  }

  log(message) {
    const entry = { time: new Date().toLocaleTimeString(), message };
    this.activityLog.unshift(entry);
    if (this.activityLog.length > 50) this.activityLog.pop();
    this.notify();
  }

  getState() {
    return {
      capital: this.capital,
      revenue: this.revenue,
      adSpend: this.adSpend,
      netProfit: this.netProfit,
      orders: this.orders,
      campaigns: [...this.campaigns],
      products: [...this.products],
      creatives: [...this.creatives],
      agents: JSON.parse(JSON.stringify(this.agents)),
      activityLog: [...this.activityLog],
      history: [...this.history],
      roas: this.adSpend > 0 ? (this.revenue / this.adSpend).toFixed(2) : '0.00',
      activeAgents: Object.values(this.agents).filter(a => a.status === 'WORKING').length
    };
  }

  setCapital(amount) {
    this.capital = parseFloat(amount) || 10000;
    this.startingCapital = this.capital;
    this.log(`Capital de départ défini à ${this.capital.toFixed(2)}€`);
    this.notify();
  }

  reset() {
    this.stopAll();
    this.capital = this.startingCapital;
    this.revenue = 0;
    this.adSpend = 0;
    this.productCosts = 0;
    this.fees = 0;
    this.refunds = 0;
    this.netProfit = 0;
    this.orders = 0;
    this.campaigns = [];
    this.products = [];
    this.creatives = [];
    this.history = [];
    this.activityLog = [];
    this.agents.you.pendingApprovals = [];
    Object.keys(this.agents).forEach(k => {
      if (k !== 'you') this.agents[k].status = 'IDLE';
    });
    this.log('Simulation réinitialisée');
    this.notify();
  }

  startAll() {
    this.startAgent('research');
    this.startAgent('creative');
    this.startAgent('media');
    this.startAgent('optimization');
    this.running = true;
    if (!this.tickInterval) {
      this.tickInterval = setInterval(() => this.tick(), 2000);
    }
    this.log('START ALL - Armée lancée');
    this.notify();
  }

  stopAll() {
    Object.keys(this.agents).forEach(k => this.stopAgent(k));
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.log('STOP ALL - Armée arrêtée');
    this.notify();
  }

  startAgent(name) {
    if (name === 'you') return;
    const agent = this.agents[name];
    if (agent.working) return;
    agent.working = true;
    agent.status = 'WORKING';
    this.log(`${name.toUpperCase()} AI démarré`);
    // Work loop
    agent.interval = setInterval(() => this.agentWork(name), 3000 + Math.random() * 2000);
    this.notify();
  }

  stopAgent(name) {
    const agent = this.agents[name];
    if (!agent) return;
    agent.working = false;
    agent.status = 'IDLE';
    if (agent.interval) {
      clearInterval(agent.interval);
      agent.interval = null;
    }
    this.log(`${name.toUpperCase()} AI arrêté`);
    this.notify();
  }

  agentWork(name) {
    if (!this.agents[name].working) return;
    try {
      if (name === 'research') this.doResearch();
      else if (name === 'creative') this.doCreative();
      else if (name === 'media') this.doMediaBuying();
      else if (name === 'optimization') this.doOptimization();
      this.agents[name].status = 'WORKING';
    } catch (e) {
      this.agents[name].status = 'ERROR';
      this.log(`Erreur ${name}: ${e.message}`);
    }
    this.notify();
  }

  doResearch() {
    const productNames = ['Silk Sleep Set', 'LED Sunset Lamp', 'Mini Portable Blender', 'Neck Cooler', 'Pet Hair Remover', 'Collapsible Water Bottle', 'Smart Plant Pot', 'USB Desk Fan', 'Aroma Diffuser', 'Yoga Mat Pro'];
    const name = productNames[Math.floor(Math.random() * productNames.length)];
    const demand = Math.random() * 100;
    const competition = Math.random() * 100;
    const margin = 30 + Math.random() * 40;
    const score = (demand * 0.4 + (100 - competition) * 0.3 + margin * 0.3).toFixed(0);
    const product = {
      id: Date.now() + Math.random(),
      name,
      demand: demand.toFixed(0),
      competition: competition.toFixed(0),
      margin: margin.toFixed(1),
      score,
      price: (15 + Math.random() * 40).toFixed(2),
      cost: 0
    };
    product.cost = (parseFloat(product.price) * (1 - parseFloat(product.margin)/100)).toFixed(2);
    this.products.unshift(product);
    if (this.products.length > 10) this.products.pop();
    this.log(`Research AI: Produit trouvé - ${name} (Score: ${score})`);
    // Pass to creative if high score
    if (parseInt(score) > 60 && this.agents.creative.working) {
      this.log(`→ Transmis à Creative AI`);
    }
  }

  doCreative() {
    if (this.products.length === 0) {
      this.log('Creative AI: En attente de produits de Research');
      return;
    }
    const product = this.products[0];
    const hooks = ['Stop scrolling! This changed my life', 'POV: You found the perfect gift', 'I tested it so you don\'t have to', 'Why everyone is buying this', 'Unboxing the viral product'];
    const creative = {
      id: Date.now() + Math.random(),
      product: product.name,
      hook: hooks[Math.floor(Math.random() * hooks.length)],
      style: Math.random() > 0.5 ? 'UGC' : 'Studio',
      progress: 0,
      status: 'Creating'
    };
    this.creatives.unshift(creative);
    if (this.creatives.length > 8) this.creatives.pop();
    this.log(`Creative AI: Concept créé pour ${product.name} - "${creative.hook}"`);
    // Simulate progress
    setTimeout(() => {
      creative.progress = 100;
      creative.status = 'Ready';
      this.log(`Creative AI: Pub prête pour ${product.name}`);
      this.notify();
    }, 1500);
  }

  doMediaBuying() {
    if (this.creatives.filter(c => c.status === 'Ready').length === 0) {
      this.log('Media Buying AI: En attente de créatifs');
      return;
    }
    const creative = this.creatives.find(c => c.status === 'Ready');
    if (!creative) return;
    const product = this.products.find(p => p.name === creative.product) || this.products[0];
    const budget = 50 + Math.random() * 150;
    if (this.capital < budget) {
      this.log('Media Buying: Capital insuffisant pour nouvelle campagne');
      return;
    }
    const campaign = {
      id: Date.now() + Math.random(),
      product: creative.product,
      creative: creative.hook,
      budget: budget.toFixed(2),
      spent: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      roas: 0,
      cpa: 0,
      ctr: 0,
      status: 'LIVE',
      platform: ['Meta', 'TikTok', 'Google'][Math.floor(Math.random()*3)],
      startTime: Date.now(),
      isWinner: Math.random() > 0.4 // 60% chance win
    };
    this.campaigns.unshift(campaign);
    if (this.campaigns.length > 12) this.campaigns.pop();
    this.capital -= parseFloat(campaign.budget) * 0.1; // initial spend
    this.adSpend += parseFloat(campaign.budget) * 0.1;
    creative.status = 'Launched';
    this.log(`Media Buying AI: Campagne lancée sur ${campaign.platform} pour ${campaign.product} (Budget: ${campaign.budget}€)`);
  }

  doOptimization() {
    this.campaigns.forEach(camp => {
      if (camp.status !== 'LIVE') return;
      const hours = (Date.now() - camp.startTime) / 3600000;
      if (hours < 0.1) return; // too early
      const performance = camp.isWinner ? 1.5 + Math.random() : 0.3 + Math.random() * 0.7;
      camp.roas = (performance * (1 + Math.random()*0.5)).toFixed(2);
      if (parseFloat(camp.roas) > 2.5 && camp.budget < 500) {
        // Suggest scale - needs approval
        if (!this.agents.you.pendingApprovals.some(a => a.campaignId === camp.id && a.type === 'scale')) {
          this.agents.you.pendingApprovals.push({
            id: Date.now(),
            type: 'scale',
            campaignId: camp.id,
            product: camp.product,
            message: `Scaler ${camp.product} ? ROAS ${camp.roas}x - Budget +100€`,
            amount: 100
          });
          this.log(`Optimization AI: Demande d'approbation pour scaler ${camp.product} (ROAS ${camp.roas}x)`);
        }
      } else if (parseFloat(camp.roas) < 1.2 && parseFloat(camp.spent) > 20) {
        // Kill
        if (!this.agents.you.pendingApprovals.some(a => a.campaignId === camp.id && a.type === 'kill')) {
          this.agents.you.pendingApprovals.push({
            id: Date.now(),
            type: 'kill',
            campaignId: camp.id,
            product: camp.product,
            message: `Couper ${camp.product} ? ROAS ${camp.roas}x - Économie estimée`,
            amount: 0
          });
          this.log(`Optimization AI: Demande d'approbation pour tuer ${camp.product} (ROAS ${camp.roas}x)`);
        }
      }
    });
  }

  tick() {
    // Simulate campaign performance over time
    this.campaigns.forEach(camp => {
      if (camp.status !== 'LIVE') return;
      const spendRate = 5 + Math.random() * 15; // € per tick
      const actualSpend = Math.min(spendRate, parseFloat(camp.budget) - camp.spent);
      if (actualSpend <= 0) {
        camp.status = 'ENDED';
        return;
      }
      camp.spent = (parseFloat(camp.spent) + actualSpend).toFixed(2);
      this.capital -= actualSpend;
      this.adSpend += actualSpend;

      // Traffic sim
      const impressions = Math.floor(actualSpend * (50 + Math.random()*100));
      const ctr = camp.isWinner ? 0.02 + Math.random()*0.03 : 0.005 + Math.random()*0.015;
      const clicks = Math.floor(impressions * ctr);
      const cvr = camp.isWinner ? 0.03 + Math.random()*0.04 : 0.005 + Math.random()*0.015;
      const conversions = Math.floor(clicks * cvr);
      const product = this.products.find(p => p.name === camp.product) || { price: 25, cost: 12 };
      const revenue = conversions * parseFloat(product.price);
      const productCost = conversions * parseFloat(product.cost);
      const fees = revenue * 0.03;
      const refundAmount = Math.random() < 0.05 ? revenue * 0.1 : 0;

      camp.impressions += impressions;
      camp.clicks += clicks;
      camp.conversions += conversions;
      camp.revenue = (parseFloat(camp.revenue) + revenue).toFixed(2);
      camp.ctr = camp.impressions > 0 ? ((camp.clicks / camp.impressions)*100).toFixed(2) : 0;
      camp.cpa = camp.conversions > 0 ? (camp.spent / camp.conversions).toFixed(2) : 0;
      camp.roas = camp.spent > 0 ? (camp.revenue / camp.spent).toFixed(2) : 0;

      this.revenue += revenue;
      this.productCosts += productCost;
      this.fees += fees;
      this.refunds += refundAmount;
      this.orders += conversions;
      this.capital += revenue - productCost - fees - refundAmount;
      this.netProfit = this.revenue - this.adSpend - this.productCosts - this.fees - this.refunds;

      if (conversions > 0) {
        this.log(`Vente! +${revenue.toFixed(2)}€ de ${camp.product} (${conversions} ordre${conversions>1?'s':''})`);
      }
    });

    // History snapshot
    this.history.push({
      time: Date.now(),
      capital: this.capital,
      revenue: this.revenue,
      netProfit: this.netProfit,
      orders: this.orders,
      roas: this.adSpend > 0 ? this.revenue / this.adSpend : 0
    });
    if (this.history.length > 100) this.history.shift();

    this.notify();
  }

  approve(approvalId, approved) {
    const idx = this.agents.you.pendingApprovals.findIndex(a => a.id === approvalId);
    if (idx === -1) return;
    const app = this.agents.you.pendingApprovals[idx];
    const camp = this.campaigns.find(c => c.id === app.campaignId);
    if (approved) {
      if (app.type === 'scale' && camp) {
        camp.budget = (parseFloat(camp.budget) + app.amount).toFixed(2);
        this.log(`YOU: Approuvé scale de ${app.product} +${app.amount}€`);
      } else if (app.type === 'kill' && camp) {
        camp.status = 'KILLED';
        this.log(`YOU: Approuvé kill de ${app.product} - campagne arrêtée`);
      }
    } else {
      this.log(`YOU: Rejeté action pour ${app.product}`);
    }
    this.agents.you.pendingApprovals.splice(idx, 1);
    this.notify();
  }
}

window.SimulationEngine = SimulationEngine;