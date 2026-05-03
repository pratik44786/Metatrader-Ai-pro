import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    lastAnalysis: "Waiting for first analysis...",
    lastAnalysisSignal: "HOLD",
    lastAnalysisConfidence: 0,
    lastAnalysisTime: 0,
  };

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const lastEAPing = () => Date.now() - state.lastEAPing;

  // AI Analysis Engine
  const runAIAnalysis = async () => {
    if (!state.eaConnected || lastEAPing() > 30000) return; // Only analyze if EA is fresh

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
      
      // Clean potential markdown blocks
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const data = JSON.parse(cleanJson);

      state.lastAnalysis = data.analysis;
      state.lastAnalysisSignal = data.signal;
      state.lastAnalysisConfidence = data.confidence;
      state.lastAnalysisTime = Date.now();

      if (state.autoTradeEnabled && (data.signal === "BUY" || data.signal === "SELL") && data.confidence > 75) {
        // Simple lot calc: balance * risk / 1000 (rough estimate for 1% risk on standard lots)
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

  // AI Interval (Every 30 seconds)
  setInterval(() => {
    if (state.autoTradeEnabled) runAIAnalysis();
  }, 30000);

  // --- EA ROUTES ---

  app.post("/api/ea/ping", (req, res) => {
    const data = req.body;
    state.balance = data.balance;
    state.equity = data.equity;
    state.margin = data.margin;
    state.freeMargin = data.freeMargin;
    state.login = data.login;
    state.server = data.server;
    state.currency = data.currency;
    state.leverage = data.leverage;
    state.positions = data.positions || [];
    state.lastEAPing = Date.now();
    state.eaConnected = true;

    res.json({ 
      success: true, 
      autoTradeEnabled: state.autoTradeEnabled,
      selectedSymbol: state.selectedSymbol,
      selectedTimeframe: state.selectedTimeframe
    });
  });

  app.get("/api/ea/orders", (req, res) => {
    if (lastEAPing() > 5000) state.eaConnected = false;
    const orders = [...state.orderQueue];
    state.orderQueue = [];
    res.json({ orders });
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
    if (lastEAPing() > 5000) state.eaConnected = false;
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

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const appPromise = startServer();
export default appPromise;
