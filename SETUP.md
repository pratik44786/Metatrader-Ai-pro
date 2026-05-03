# 🚀 MT-AI Pro :: VPS Setup Guide (Mobile User)

Since you are using a mobile phone and have a VPS with MetaTrader 5 (MT5) installed, follow these exact steps to link your terminal to the AI webapp.

## Step 1: Prepare MT5 Settings
1. Open **MetaTrader 5** on your VPS.
2. Go to **Tools** → **Options** (or press Ctrl+O).
3. Click the **Expert Advisors** tab.
4. Check these boxes:
   - [x] **Allow automated trading**
   - [x] **Allow WebRequest for listed URL:**
5. Click the "**+ Add new URL...**" button and add your Vercel WebApp URL:
   - `https://your-webapp-url.vercel.app` (Copy this from your mobile browser).

## Step 2: Install the Bridge EA
1. Open **MetaEditor** (Press F4 in MT5).
2. Right-click on the `Experts` folder in the Navigator → `New File`.
3. Choose `Expert Advisor (template)` → Name it `Bridge_EA`.
4. Delete everything in the file and paste the code from **MT5_Bridge_EA.mq5** provided earlier.
5. Click **Compile** (Top toolbar or F7).
   - *Ensure 0 errors in the toolbox at the bottom.*

## Step 3: Run the EA
1. Go back to MetaTrader 5.
2. In the Navigator (Ctrl+N), find **Expert Advisors** → `Bridge_EA`.
3. Drag it onto **any chart** (e.g., EURUSD M1).
4. In the **Inputs** tab:
   - `WebAppURL`: Paste your Vercel URL (e.g., `https://my-trading-app.vercel.app`).
   - `PollInterval`: Leave at `1000`.
5. Click **OK**.

## Step 4: Verification
1. Check the MT5 **Experts** tab (bottom Terminal window).
2. You should see: `MT5 AI Bridge EA Started`.
3. Open your mobile app.
4. The dashboard will instantly show "**EA-LINKED**" or a **Blinking Green Dot** next to your balance.
5. You can now execute trades from your phone, and they will trigger on your VPS terminal automatically.

---
**💡 Jugad Note:** If `npx` or `node` is missing on your VPS, don't worry. This MQL5 EA works directly inside MT5 and doesn't need any extra software.
