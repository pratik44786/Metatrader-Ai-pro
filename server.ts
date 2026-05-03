import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Global State (In-Memory)
let state = {
  balance: 0,
  equity: 0,
  margin: 0,
  freeMargin: 0,
  login: "",
  server: "",
  currency: "USD",
  leverage: 0,
  eaConnected: false,
  lastEAPing: 0,
  positions: [] as any[],
  orderQueue: [] as any[],
  history: [] as any[],
  autoTradeEnabled: false,
  selectedSymbol: "EURUSD",
  selectedTimeframe: "H1",
  riskPercent: 1.0,
  lastAnalysis: "Waiting for EA connection...",
  lastAnalysisSignal: "HOLD",
  lastAnalysisConfidence: 0,
  lastAnalysisTime: 0,
};

// Helper — defined before any usage
const msSinceLastPing = () => Date.now() - state.lastEAPing;

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// AI Analysis Engine
const runAIAnalysis = async () => {
  if (!state.eaConnected || msSinceLastPing() > 30000) return; 

  try {
    const prompt = `
You are an expert forex trading analyst AI.

Account Status:
- Balance: $${state.balance}
- Equity: $${state.equity}  
- Margin Level: ${state.margin > 0 ? (state.equity / state.margin * 100).toFixed(2) : '100'}%
- Open Positions: ${state.positions.length}
${state.positions.map(p => `  - ${p.symbol} ${p.type} ${p.volume} lots | P&L: $${p.profit}`).join('\n')}

Task: Analyze ${state.selectedSymbol} on ${state.selectedTimeframe} timeframe.

Respond in this EXACT JSON format only:
{
  "analysis": "2-3 sentence market analysis here",
  "signal": "BUY", "SELL", or "HOLD",
  "confidence": 0-100,
  "reason": "one line reason for signal",
  "suggestedVolume": 0.01
}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleanJson);

    state.lastAnalysis = data.analysis;
    state.lastAnalysisSignal = data.signal;
    state.lastAnalysisConfidence = data.confidence;
    state.lastAnalysisTime = Date.now();

    if (state.autoTradeEnabled && (data.signal === "BUY" || data.signal === "SELL") && data.confidence > 75) {
      const calculatedVolume = Math.max(0.01, parseFloat(((state.balance * state.riskPercent / 100) / 100).toFixed(2)));
      const order = {
        id: Math.random().toString(36).substring(7),
        symbol: state.selectedSymbol,
        action: data.signal.toLowerCase(),
        volume: calculatedVolume,
        timestamp: Date.now(),
        type: "AI_AUTO"
      };
      state.orderQueue.push(order);
      console.log(`[AI AUTO] Queued ${data.signal} for ${state.selectedSymbol} vol:${calculatedVolume}`);
    }

    return data;
  } catch (error) {
    console.error("AI Analysis Engine Error:", error);
    return null;
  }
};

// --- EA ROUTES ---

app.post("/api/ea/ping", async (req, res) => {
  const data = req.body;
  if (data.balance !== undefined) state.balance = parseFloat(data.balance) || 0;
  if (data.equity !== undefined) state.equity = parseFloat(data.equity) || 0;
  if (data.margin !== undefined) state.margin = parseFloat(data.margin) || 0;
  if (data.freeMargin !== undefined) state.freeMargin = parseFloat(data.freeMargin) || 0;
  if (data.login) state.login = String(data.login);
  if (data.server) state.server = String(data.server);
  if (data.currency) state.currency = data.currency;
  if (data.leverage) state.leverage = parseInt(data.leverage) || 0;
  if (data.positions) state.positions = data.positions;
  state.eaConnected = true;
  state.lastEAPing = Date.now();

  // Run AI analysis every 30 seconds if auto-trading is enabled, triggered by heartbeat
  if (state.autoTradeEnabled && (Date.now() - state.lastAnalysisTime > 30000)) {
    runAIAnalysis().catch(console.error);
  }

  res.json({ 
    success: true, 
    autoTradeEnabled: state.autoTradeEnabled,
    selectedSymbol: state.selectedSymbol,
    selectedTimeframe: state.selectedTimeframe
  });
});

app.get("/api/ea/orders", (req, res) => {
  if (msSinceLastPing() > 5000) state.eaConnected = false;
  const orders = [...state.orderQueue];
  state.orderQueue = [];
  res.json({ orders });
});

app.get("/api/ea/poll", (req, res) => {
  if (msSinceLastPing() > 5000) state.eaConnected = false;
  const orders = [...state.orderQueue];
  state.orderQueue = [];
  res.json({ orders });
});

app.get("/api/ea/account", (req, res) => {
  if (msSinceLastPing() > 5000) state.eaConnected = false;
  res.json(state);
});

app.post("/api/ea/result", (req, res) => {
  const data = req.body;
  if (data.success) {
    state.history.unshift({
      ...data,
      timestamp: Date.now()
    });
    if (state.history.length > 50) state.history.pop();
  }
  state.balance = data.balance || state.balance;
  state.equity = data.equity || state.equity;
  res.json({ success: true });
});

// --- FRONTEND ROUTES ---

app.get("/api/state", (req, res) => {
  if (msSinceLastPing() > 5000) state.eaConnected = false;
  res.json(state);
});

app.post("/api/autotrade", (req, res) => {
  state.autoTradeEnabled = req.body.enabled;
  res.json({ success: true, enabled: state.autoTradeEnabled });
});

app.post("/api/settings", (req, res) => {
  const { symbol, timeframe, riskPercent } = req.body;
  if (symbol) state.selectedSymbol = symbol;
  if (timeframe) state.selectedTimeframe = timeframe;
  if (riskPercent) state.riskPercent = parseFloat(riskPercent);
  res.json({ success: true });
});

app.post("/api/analyze", async (req, res) => {
  const data = await runAIAnalysis();
  res.json(data ? { ...data, success: true } : { success: false, error: "Analysis failed" });
});

app.post("/api/trade/manual", (req, res) => {
  const { symbol, action, volume } = req.body;
  const order = {
    id: Math.random().toString(36).substring(7),
    symbol: symbol || state.selectedSymbol,
    action: action.toLowerCase(),
    volume: volume || 0.01,
    timestamp: Date.now(),
    type: "MANUAL"
  };
  state.orderQueue.push(order);
  res.json({ success: true, orderId: order.id });
});

// --- VITE MIDDLEWARE ---

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(3000, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:3000`);
    });
  }
}

setupVite();

export default app;
