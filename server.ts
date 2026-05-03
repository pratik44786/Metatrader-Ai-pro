import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini
  const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY || "");
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Mock Trading State
  let tradingState = {
    balance: 10000.00,
    equity: 10000.00,
    margin: 0,
    positions: [] as any[],
    autoTradingEnabled: false,
    history: [] as any[],
  };

  // API Routes
  app.get("/api/account", (req, res) => {
    res.json(tradingState);
  });

  // Market Simulation Loop
  const marketSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'XAUUSD'];
  const prices: { [key: string]: number } = {
    EURUSD: 1.0845,
    GBPUSD: 1.2632,
    USDJPY: 150.21,
    BTCUSD: 62450.00,
    XAUUSD: 2045.21
  };

  setInterval(() => {
    marketSymbols.forEach(symbol => {
      const change = (Math.random() - 0.5) * 0.001 * prices[symbol];
      prices[symbol] += change;
    });

    // Update positions
    tradingState.positions = tradingState.positions.map(pos => {
      const currentPrice = prices[pos.symbol] || pos.currentPrice;
      const priceDiff = pos.type === 'BUY' ? (currentPrice - pos.openPrice) : (pos.openPrice - currentPrice);
      const profit = priceDiff * pos.lot * 100000; // Standard lot size simulation
      return { ...pos, currentPrice, profit };
    });

    // Update Equity
    const totalProfit = tradingState.positions.reduce((sum, pos) => sum + pos.profit, 0);
    tradingState.equity = tradingState.balance + totalProfit;

    // Simple Auto Trade Logic
    if (tradingState.autoTradingEnabled && tradingState.positions.length < 3) {
      const randomSymbol = marketSymbols[Math.floor(Math.random() * marketSymbols.length)];
      const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const lot = 0.1;
      const price = prices[randomSymbol];
      
      tradingState.positions.push({
        id: Math.random().toString(36).substring(7),
        symbol: randomSymbol,
        type,
        lot,
        openPrice: price,
        currentPrice: price,
        profit: 0,
        timestamp: new Date().toISOString(),
      });
    }
  }, 3000);

  app.post("/api/toggle-autotrade", (req, res) => {
    tradingState.autoTradingEnabled = req.body.enabled;
    res.json({ success: true, enabled: tradingState.autoTradingEnabled });
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { symbol, timeframe } = req.body;
      const prompt = `You are a high-level trading AI assistant integrated with MetaTrader. 
      Analyze the market for ${symbol} on the ${timeframe} timeframe. 
      Provide:
      1. Market Sentiment (Bullish/Bearish/Neutral).
      2. 2-3 specific technical observations (e.g., RSI levels, Moving Average trends, or Support/Resistance zones).
      3. A concise trading recommendation for a professional trader.
      
      Keep the full response under 100 words and format it clearly for a mobile interface.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      res.json({ analysis: response.text() });
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  app.post("/api/trade", (req, res) => {
    const { symbol, type, lot, price } = req.body;
    const newPosition = {
      id: Math.random().toString(36).substring(7),
      symbol,
      type,
      lot,
      openPrice: price,
      currentPrice: price,
      profit: 0,
      timestamp: new Date().toISOString(),
    };
    tradingState.positions.push(newPosition);
    res.json(newPosition);
  });

  app.post("/api/close", (req, res) => {
    const { id } = req.body;
    const position = tradingState.positions.find(p => p.id === id);
    if (position) {
      tradingState.history.push({ ...position, closePrice: position.currentPrice, closeTimestamp: new Date().toISOString() });
      tradingState.balance += position.profit;
      tradingState.positions = tradingState.positions.filter(p => p.id !== id);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Position not found" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
