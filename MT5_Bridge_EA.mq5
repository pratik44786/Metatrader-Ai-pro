//+------------------------------------------------------------------+
//|                                              MT5_Bridge_EA.mq5   |
//|                                  Copyright 2024, MT-AI Pro Team  |
//|                                             https://mt-ai.pro    |
//+------------------------------------------------------------------+
#property copyright "Copyright 2024, MT-AI Pro Team"
#property link      "https://mt-ai.pro"
#property version   "1.00"
#property strict
#property script_show_inputs

#include <Trade\Trade.mqh>

//--- INPUT PARAMETERS
input string   WebAppURL = "https://YOUR-APP-URL.vercel.app"; // WebApp Base URL (No trailing slash)
input int      PollInterval = 1000;                          // Poll Interval in Milliseconds

//--- GLOBAL VARIABLES
CTrade         trade;
datetime       last_poll_time = 0;
string         headers = "Content-Type: application/json\r\n";

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   Print("MT5 AI Bridge EA Started");
   Print("Target WebApp: ", WebAppURL);
   
   // Enable WebRequest for the URL in Tools -> Options -> Expert Advisors
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("MT5 AI Bridge EA Stopped");
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   static uint last_tick_time = 0;
   uint current_time = GetTickCount();
   
   if(current_time - last_tick_time < (uint)PollInterval)
      return;
      
   last_tick_time = current_time;
   
   SendAccountInfo();
   PollOrders();
}

//+------------------------------------------------------------------+
//| Send Account Details to WebApp                                   |
//+------------------------------------------------------------------+
void SendAccountInfo()
{
   char post_data[];
   char result[];
   string result_headers;
   
   string json = StringFormat(
      "{\"balance\":%G, \"equity\":%G, \"margin\":%G, \"login\":\"%s\", \"server\":\"%s\", \"currency\":\"%s\"}",
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      AccountInfoDouble(ACCOUNT_MARGIN),
      (string)AccountInfoInteger(ACCOUNT_LOGIN),
      AccountInfoString(ACCOUNT_SERVER),
      AccountInfoString(ACCOUNT_CURRENCY)
   );
   
   StringToCharArray(json, post_data);
   
   int res = WebRequest("POST", WebAppURL + "/api/ea/account", headers, 5000, post_data, result, result_headers);
   
   if(res == -1)
   {
      Print("Error in SendAccountInfo. Error code: ", GetLastError());
      if(GetLastError() == 4060)
         Print("Check: Tools -> Options -> Expert Advisors -> Allow WebRequest for: ", WebAppURL);
   }
}

//+------------------------------------------------------------------+
//| Poll WebApp for Pending Orders                                  |
//+------------------------------------------------------------------+
void PollOrders()
{
   char result[];
   string result_headers;
   char post_data[];
   
   int res = WebRequest("GET", WebAppURL + "/api/ea/poll", headers, 5000, post_data, result, result_headers);
   
   if(res == 200)
   {
      string response = CharArrayToString(result);
      if(StringFind(response, "\"orders\":[]") == -1) // If orders array is not empty
      {
         ProcessOrders(response);
      }
   }
}

//+------------------------------------------------------------------+
//| Parse and Execute Orders                                         |
//+------------------------------------------------------------------+
void ProcessOrders(string json)
{
   // Simple JSON parser for basic order structure: {"orders":[{"symbol":"EURUSD","action":"buy","volume":0.1}]}
   int start_pos = StringFind(json, "{");
   while(start_pos != -1)
   {
      int action_pos = StringFind(json, "\"action\":\"", start_pos);
      if(action_pos == -1) break;
      
      string action = ExtractStringValue(json, "action", action_pos);
      string symbol = ExtractStringValue(json, "symbol", action_pos - 100); // Look back a bit for symbol
      double volume = ExtractDoubleValue(json, "volume", action_pos);
      
      if(symbol == "" || symbol == "null") symbol = _Symbol;
      
      bool success = false;
      if(action == "buy")
         success = trade.Buy(volume, symbol);
      else if(action == "sell")
         success = trade.Sell(volume, symbol);
         
      SendResult(action, symbol, volume, success, trade.ResultOrder());
      
      start_pos = StringFind(json, "{", action_pos + 10);
   }
}

//+------------------------------------------------------------------+
//| Send Trade Result back to WebApp                                 |
//+------------------------------------------------------------------+
void SendResult(string action, string symbol, double volume, bool success, ulong ticket)
{
   char post_data[];
   char result[];
   string result_headers;
   
   string status = success ? "FILLED" : "REJECTED";
   string json = StringFormat(
      "{\"action\":\"%s\", \"symbol\":\"%s\", \"volume\":%G, \"status\":\"%s\", \"ticket\":%llu}",
      action, symbol, volume, status, ticket
   );
   
   StringToCharArray(json, post_data);
   WebRequest("POST", WebAppURL + "/api/ea/result", headers, 5000, post_data, result, result_headers);
}

//+------------------------------------------------------------------+
//| Helper: Extract String from JSON                                 |
//+------------------------------------------------------------------+
string ExtractStringValue(string json, string key, int search_start)
{
   string pattern = "\"" + key + "\":\"";
   int pos = StringFind(json, pattern, MathMax(0, search_start));
   if(pos == -1) return "";
   
   int start = pos + StringLen(pattern);
   int end = StringFind(json, "\"", start);
   if(end == -1) return "";
   
   return StringSubstr(json, start, end - start);
}

//+------------------------------------------------------------------+
//| Helper: Extract Double from JSON                                 |
//+------------------------------------------------------------------+
double ExtractDoubleValue(string json, string key, int search_start)
{
   string pattern = "\"" + key + "\":";
   int pos = StringFind(json, pattern, MathMax(0, search_start));
   if(pos == -1) return 0;
   
   int start = pos + StringLen(pattern);
   int end = StringFind(json, ",", start);
   if(end == -1) end = StringFind(json, "}", start);
   if(end == -1) return 0;
   
   return StringToDouble(StringSubstr(json, start, end - start));
}
