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

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  // Note: App might start before key is provided, Gemini handles this gracefully.
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Global Trading State
  let tradingState = {
    balance: 10000.00,
    equity: 10000.00,
    margin: 0,
    positions: [] as any[],
    autoTradingEnabled: false,
    history: [] as any[],
    brokerConnected: false,
    brokerConfig: null as any,
    lastEAPing: 0,
    orderQueue: [] as any[],
    mcpConnected: false, // Legacy fallback
  };

  // Check EA connectivity every second
  setInterval(() => {
    const now = Date.now();
    if (tradingState.lastEAPing > 0 && now - tradingState.lastEAPing > 5000) {
      tradingState.brokerConnected = false;
    }
  }, 1000);

  // Gemini Tools definition for MT-AI Pro
  const mt5Tools: any[] = [
    {
      functionDeclarations: [
        {
          name: "get_account_info",
          description: "Fetch live MetaTrader 5 account status including balance, equity, and margin.",
        },
        {
          name: "get_market_data",
          description: "Get current market prices and recent candle history for a symbol.",
          parameters: {
            type: "object",
            properties: {
              symbol: { type: "string", description: "Symbol name e.g. EURUSD" },
              timeframe: { type: "string", description: "M5, M15, H1, H4, D1" },
            },
            required: ["symbol", "timeframe"],
          },
        },
        {
          name: "execute_trade",
          description: "Place a real trade on the MetaTrader account.",
          parameters: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              action: { type: "string", enum: ["buy", "sell"] },
              volume: { type: "number", description: "Lot size e.g. 0.01" },
            },
            required: ["symbol", "action", "volume"],
          },
        },
      ],
    },
  ];

  // --- EA REVERSE BRIDGE ROUTES ---

  // 1. EA Polls for new orders
  app.get("/api/ea/poll", (req, res) => {
    const orders = [...tradingState.orderQueue];
    tradingState.orderQueue = []; // Clear queue after polling
    res.json({ orders });
  });

  // 2. EA Pushes account info & heartbeats
  app.post("/api/ea/account", (req, res) => {
    const { balance, equity, margin, login, server } = req.body;
    tradingState.balance = parseFloat(balance);
    tradingState.equity = parseFloat(equity);
    tradingState.margin = parseFloat(margin);
    tradingState.brokerConnected = true;
    tradingState.lastEAPing = Date.now();
    tradingState.brokerConfig = { login, server };
    res.json({ success: true });
  });

  // 3. EA Pushes trade results
  app.post("/api/ea/result", (req, res) => {
    console.log("EA Trade Result:", req.body);
    // Optionally update local history or positions here
    res.json({ success: true });
  });

  // 4. Webapp triggers real trade (added to queue)
  app.post("/api/trade/real", (req, res) => {
    const { symbol, action, volume } = req.body;
    const order = { symbol, action: action.toLowerCase(), volume };
    tradingState.orderQueue.push(order);
    res.json({ success: true, message: "Order queued for EA execution", order });
  });

  // 5. Status check
  app.get("/api/ea/status", (req, res) => {
    res.json({ 
      connected: tradingState.brokerConnected, 
      lastPing: tradingState.lastEAPing,
      queueSize: tradingState.orderQueue.length 
    });
  });

  // --- STANDARD API ROUTES ---

  app.get("/api/account", (req, res) => {
    res.json(tradingState);
  });

  app.post("/api/toggle-autotrade", (req, res) => {
    tradingState.autoTradingEnabled = req.body.enabled;
    res.json({ success: true, enabled: tradingState.autoTradingEnabled });
  });

  // Market Simulation Loop (Fallback for UI prices)
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
  }, 3000);

  app.post("/api/analyze", async (req, res) => {
    try {
      const { symbol, timeframe } = req.body;
      const modelWithTools = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        tools: mt5Tools,
      });

      const chat = modelWithTools.startChat();
      const prompt = `You are the MT-AI Pro High-Frequency Trading Agent. 
      Your task is to analyze ${symbol} on ${timeframe}.
      
      Current status:
      - MT5 EA Connection: ${tradingState.brokerConnected ? "ACTIVE (Real Account)" : "INACTIVE (Simulation Mode)"}
      - Auto-Trading: ${tradingState.autoTradingEnabled ? "ON" : "OFF"}
      
      Account Data:
      - Balance: ${tradingState.balance}
      - Equity: ${tradingState.equity}
      
      Instructions:
      1. Use "get_account_info" to check status.
      2. Use "get_market_data" for ${symbol}.
      3. Provide analysis.
      4. If "Auto-Trading" is ON and signal is strong, execute trade using "execute_trade".
      
      Always summarize results for the mobile user.`;

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      
      const call = response.functionCalls()?.[0];
      if (call) {
        const toolResult = await callTool(call.name, call.args);
        const secondResult = await chat.sendMessage([{
          functionResponse: {
            name: call.name,
            response: toolResult,
          }
        }]);
        return res.json({ 
          analysis: secondResult.response.text(),
          toolUsed: call.name,
          toolResult
        });
      }

      res.json({ analysis: response.text() });
    } catch (error) {
      console.error("AI analysis error:", error);
      res.status(500).json({ error: "Analysis failed" });
    }
  });

  const callTool = async (name: string, args: any) => {
    if (tradingState.brokerConnected) {
      // Logic for REAL trading via EA Queue
      switch (name) {
        case 'get_account_info':
          return { balance: tradingState.balance, equity: tradingState.equity, status: "Real Time" };
        case 'get_market_data':
          return { symbol: args.symbol, price: prices[args.symbol] || 1.0, status: "MT5 Feed" };
        case 'execute_trade':
          const order = { symbol: args.symbol, action: args.action.toLowerCase(), volume: args.volume };
          tradingState.orderQueue.push(order);
          return { success: true, message: "Order sent to MT5 Terminal Queue", order };
        default:
          return { error: "Unknown tool" };
      }
    } else {
      // Logic for SIMULATION trading
      switch (name) {
        case 'get_account_info':
          return { balance: tradingState.balance, equity: tradingState.equity, status: "Simulated" };
        case 'get_market_data':
          return { symbol: args.symbol, price: prices[args.symbol] || 1.08, status: "Simulation Feed" };
        case 'execute_trade':
          const price = prices[args.symbol] || 1.08;
          const pos = { 
            id: Math.random().toString(36).substring(7), 
            symbol: args.symbol, 
            type: args.action.toUpperCase(), 
            lot: args.volume, 
            openPrice: price, 
            currentPrice: price, 
            profit: 0, 
            timestamp: new Date().toISOString() 
          };
          tradingState.positions.push(pos);
          return { success: true, position: pos, message: "Simulation order placed locally" };
        default:
          return { error: "Unknown tool" };
      }
    }
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.VITE_DEV === "true") {
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
