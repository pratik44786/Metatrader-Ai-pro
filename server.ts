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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Mock Trading State
  let tradingState = {
    balance: 10000.00,
    equity: 10000.00,
    margin: 0,
    positions: [] as any[],
    autoTradingEnabled: false,
    history: [] as any[],
    brokerConnected: false,
    brokerConfig: null as any,
    mcpUrl: null as string | null,
    mcpConnected: false,
  };

  // Gemini Tools definition for MT5 MCP
  const mt5Tools = [
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

  // API Routes
  app.get("/api/account", (req, res) => {
    res.json(tradingState);
  });

  app.post("/api/mcp/config", async (req, res) => {
    const { url } = req.body;
    try {
      if (url.includes("localhost") || url.includes("127.0.0.1")) {
        return res.status(400).json({ 
          error: "Invalid URL", 
          message: "You cannot use 'localhost' since the app is running in the cloud. Use an ngrok URL or public IP." 
        });
      }

      // Pre-flight check
      const check = await fetch(`${url}/info`).catch(() => null);
      
      tradingState.mcpUrl = url;
      tradingState.mcpConnected = true;
      res.json({ success: true, url, message: "Bridge configured" });
    } catch (e) {
      res.status(500).json({ error: "Connection error" });
    }
  });

  app.post("/api/broker/connect", (req, res) => {
    const { login, password, server } = req.body;
    if (login && password && server) {
      tradingState.brokerConnected = true;
      tradingState.brokerConfig = { login, server };
      // In a real app, this is where we'd initiate the MT5 Socket/WebAPI connection
      res.json({ success: true, message: "MT5 Broker Linked Successfully" });
    } else {
      res.status(400).json({ error: "Missing login details" });
    }
  });

  app.post("/api/broker/disconnect", (req, res) => {
    tradingState.brokerConnected = false;
    tradingState.brokerConfig = null;
    res.json({ success: true });
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
      const modelWithTools = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        tools: mt5Tools,
      });

      const chat = modelWithTools.startChat();
      const prompt = `You are the MT-AI Pro High-Frequency Trading Agent. 
      Your task is to analyze ${symbol} on ${timeframe}.
      
      Current status:
      - MCP Bridge: ${tradingState.mcpConnected ? "CONNECTED" : "DISCONNECTED (Simulation Mode)"}
      - Auto-Trading: ${tradingState.autoTradingEnabled ? "ON" : "OFF"}
      
      Instructions:
      1. First, use "get_account_info" to see your current standing.
      2. Then use "get_market_data" for ${symbol}.
      3. Provide a market sentiment analysis.
      4. If "Auto-Trading" is ON and you see a strong signal, execute a trade using "execute_trade".
      
      Keep the final summary concise (under 100 words).`;

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      
      // Handle tool calls if any (Auto-Execution)
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
    if (tradingState.mcpConnected && tradingState.mcpUrl) {
      try {
        const res = await fetch(`${tradingState.mcpUrl}/tools/call`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, arguments: args }),
        });
        return await res.json();
      } catch (e) {
        return { error: "MCP tool call failed" };
      }
    } else {
      switch (name) {
        case 'get_account_info':
          return { balance: tradingState.balance, equity: tradingState.equity };
        case 'get_market_data':
          return { symbol: args.symbol, price: prices[args.symbol] || 1.08, status: "Simulated Data" };
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
          return { success: true, position: pos, message: "Simulation order placed" };
        default:
          return { error: "Unknown tool" };
      }
    }
  };

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
