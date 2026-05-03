//+------------------------------------------------------------------+
//|                                              MT5_Bridge_EA.mq5   |
//|                                  Copyright 2024, MT-AI Pro Team  |
//|                                             https://mt-ai.pro    |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, MT-AI Pro Team"
#property link      "https://mt-ai.pro"
#property version   "2.00"
#property strict
#property script_show_inputs

#include <Trade\Trade.mqh>

//--- INPUT PARAMETERS
input string   WebAppURL    = "https://YOUR-APP.vercel.app"; // URL without trailing slash
input int      PingInterval = 1;                             // Heartbeat interval in seconds
input double   DefaultLot   = 0.01;
input bool     ShowLogs     = true;

//--- GLOBAL VARIABLES
CTrade         trade;
uint           last_ping_time = 0;
string         headers = "Content-Type: application/json\r\n";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   if(WebAppURL == "https://YOUR-APP.vercel.app")
   {
      Alert("Please set your WebAppURL in EA Inputs!");
      return(INIT_PARAMETERS_INCORRECT);
   }
   
   trade.SetExpertMagicNumber(20260503);
   Print("MT5 AI Bridge EA v2.0 Started");
   Print("Connecting to: ", WebAppURL);
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   uint current_tick = GetTickCount();
   if(current_tick - last_ping_time < (uint)PingInterval * 1000)
      return;
      
   last_ping_time = current_tick;
   
   if(SendPing())
   {
      FetchAndExecuteOrders();
   }
}

//+------------------------------------------------------------------+
//| Send Ping with Full Account & Position Data                     |
//+------------------------------------------------------------------+
bool SendPing()
{
   char post_data[];
   char result[];
   string result_headers;
   
   string positions_json = BuildPositionsJSON();
   
   string json = StringFormat(
      "{\"balance\":%G, \"equity\":%G, \"margin\":%G, \"freeMargin\":%G, \"login\":\"%s\", \"server\":\"%s\", \"currency\":\"%s\", \"leverage\":%lld, \"positions\":%s}",
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      AccountInfoDouble(ACCOUNT_MARGIN),
      AccountInfoDouble(ACCOUNT_FREEMARGIN),
      (string)AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoString(ACCOUNT_SERVER),
      AccountInfoString(ACCOUNT_CURRENCY),
      AccountInfoInteger(ACCOUNT_LEVERAGE),
      positions_json
   );
   
   StringToCharArray(json, post_data);
   
   int res = WebRequest("POST", WebAppURL + "/api/ea/ping", headers, 5000, post_data, result, result_headers);
   
   if(res == 200)
   {
      if(ShowLogs) Print("✅ Ping OK");
      return true;
   }
   else
   {
      Print("❌ Ping Failed. WebRequest Error: ", res, " | GetLastError: ", GetLastError());
      return false;
   }
}

//+------------------------------------------------------------------+
//| Build JSON string for all open positions                         |
//+------------------------------------------------------------------+
string BuildPositionsJSON()
{
   string json = "[";
   int total = PositionsTotal();
   for(int i=0; i<total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(PositionSelectByTicket(ticket))
      {
         if(i > 0) json += ",";
         json += StringFormat(
            "{\"ticket\":%llu, \"symbol\":\"%s\", \"type\":\"%s\", \"volume\":%G, \"openPrice\":%G, \"currentPrice\":%G, \"profit\":%G, \"sl\":%G, \"tp\":%G}",
            ticket,
            PositionGetString(POSITION_SYMBOL),
            (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "BUY" : "SELL"),
            PositionGetDouble(POSITION_VOLUME),
            PositionGetDouble(POSITION_PRICE_OPEN),
            PositionGetDouble(POSITION_PRICE_CURRENT),
            PositionGetDouble(POSITION_PROFIT),
            PositionGetDouble(POSITION_SL),
            PositionGetDouble(POSITION_TP)
         );
      }
   }
   json += "]";
   return json;
}

//+------------------------------------------------------------------+
//| Poll for Pending Orders                                          |
//+------------------------------------------------------------------+
void FetchAndExecuteOrders()
{
   char result[];
   string result_headers;
   char post_data[];
   
   int res = WebRequest("GET", WebAppURL + "/api/ea/orders", headers, 5000, post_data, result, result_headers);
   
   if(res == 200)
   {
      string response = CharArrayToString(result);
      // Looking for orders array content
      if(StringFind(response, "\"orders\":[]") == -1)
      {
         Print("📦 Orders Received: ", response);
         ExecuteOrdersFromJSON(response);
      }
   }
}

//+------------------------------------------------------------------+
//| Simple JSON parser and executor                                  |
//+------------------------------------------------------------------+
void ExecuteOrdersFromJSON(string json)
{
   int start = StringFind(json, "{\"id\":");
   while(start != -1)
   {
      string id = ExtractString(json, "id", start);
      string action = ExtractString(json, "action", start);
      string symbol = ExtractString(json, "symbol", start);
      double volume = ExtractDouble(json, "volume", start);
      
      Print("⚡ Processing Order: ", id, " | ", action, " ", symbol, " ", volume);
      
      bool success = false;
      if(action == "buy")
         success = trade.Buy(volume, symbol);
      else if(action == "sell")
         success = trade.Sell(volume, symbol);
      else if(action == "close")
         success = ClosePosition(symbol);
         
      SendTradeResult(id, action, symbol, volume, success);
      
      start = StringFind(json, "{\"id\":", start + 10);
   }
}

//+------------------------------------------------------------------+
//| Close all positions for a symbol                                 |
//+------------------------------------------------------------------+
bool ClosePosition(string symbol)
{
   bool all_closed = true;
   for(int i=PositionsTotal()-1; i>=0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(PositionSelectByTicket(ticket))
      {
         if(PositionGetString(POSITION_SYMBOL) == symbol)
         {
            if(!trade.PositionClose(ticket)) all_closed = false;
         }
      }
   }
   return all_closed;
}

//+------------------------------------------------------------------+
//| Send Result of Trade Execution                                  |
//+------------------------------------------------------------------+
void SendTradeResult(string id, string action, string symbol, double volume, bool success)
{
   char post_data[];
   char result[];
   string result_headers;
   
   string json = StringFormat(
      "{\"orderId\":\"%s\", \"action\":\"%s\", \"symbol\":\"%s\", \"volume\":%G, \"success\":%s, \"ticket\":%llu, \"balance\":%G, \"equity\":%G}",
      id, action, symbol, volume, (success ? "true" : "false"), trade.ResultOrder(),
      AccountInfoDouble(ACCOUNT_BALANCE), AccountInfoDouble(ACCOUNT_EQUITY)
   );
   
   StringToCharArray(json, post_data);
   WebRequest("POST", WebAppURL + "/api/ea/result", headers, 5000, post_data, result, result_headers);
}

//--- JSON HELPERS

string ExtractString(string json, string key, int search_start)
{
   string pattern = "\"" + key + "\":\"";
   int pos = StringFind(json, pattern, search_start);
   if(pos == -1) // handle space
   {
      pattern = "\"" + key + "\": \"";
      pos = StringFind(json, pattern, search_start);
   }
   if(pos == -1) return "";
   
   int start = pos + StringLen(pattern);
   int end = StringFind(json, "\"", start);
   return StringSubstr(json, start, end - start);
}

double ExtractDouble(string json, string key, int search_start)
{
   string pattern = "\"" + key + "\":";
   int pos = StringFind(json, pattern, search_start);
   if(pos == -1) return 0;
   
   int start = pos + StringLen(pattern);
   int end = StringFind(json, ",", start);
   if(end == -1) end = StringFind(json, "}", start);
   if(end == -1) return 0;
   
   string val = StringSubstr(json, start, end - start);
   StringReplace(val, " ", "");
   return StringToDouble(val);
}
