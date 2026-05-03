# 🚀 MT-AI Pro :: REVERSE BRIDGE SETUP (Complete Rewire)

This application uses a "Reverse Bridge" architecture. Instead of the webapp calling your VPS, the MetaTrader 5 Expert Advisor (EA) calls the webapp every second to sync data and fetch trades.

## 1. Deploy & Prepare
- Ensure the app is deployed (Vercel/Cloud Run).
- Copy your Public App URL: `https://your-app.vercel.app`

## 2. MetaTrader 5 Configuration
1. Open **MetaTrader 5** on your VPS.
2. Go to **Tools** → **Options** → **Expert Advisors**.
3. Enable: `[x] Allow automated trading`.
4. Enable: `[x] Allow WebRequest for listed URL:`.
5. Add your exact WebApp URL to the list: `https://your-app.vercel.app`

## 3. Install the Expert Advisor
1. Open **MetaEditor** (F4).
2. Create or open `MT5_Bridge_EA.mq5`.
3. Paste the complete MQL5 source code provided.
4. Click **Compile** (F7).
5. Ensure there are **0 errors** in the Toolbox.

## 4. Launch AI Trading
1. Go back to MT5.
2. Find `MT5_Bridge_EA` in the Navigator.
3. Drag it onto **one chart** (e.g. EURUSD M1).
4. **Inputs Tab:** Set `WebAppURL` to your Vercel URL.
5. Click **OK**.
6. Check the **Journal** tab. You should see `✅ Ping OK` every second.

## 5. WebApp Controls
- Open your WebApp URL on your phone or PC.
- You should see 🟢 **EA-LIVE** and your real MT5 Balance/Equity.
- Enable **AUTO** switch at the top to let Gemini AI take control.
- Adjust **Risk %** and **Symbol** settings.
- Run **Intelligence Analysis** to see what the AI is thinking.

---
**⚠️ Important:** 
- The AI will only trade if `eaConnected` is true (Green badge).
- The AI uses "Standard MT5 Python Integration" logic inside the EA.
- Keep the chart open on the VPS 24/7 for the heartbeat to stay alive.
