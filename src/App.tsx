/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  History, 
  Settings, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { AccountInfo, MarketData } from './types';

const queryClient = new QueryClient();

// Static Market Data
const STATIC_MARKET_DATA: MarketData[] = [
  { symbol: 'EURUSD', price: 1.0845, change: 0.05 },
  { symbol: 'GBPUSD', price: 1.2632, change: -0.12 },
  { symbol: 'USDJPY', price: 150.21, change: 0.34 },
  { symbol: 'BTCUSD', price: 62450.00, change: 2.45 },
  { symbol: 'XAUUSD', price: 2045.21, change: -0.15 },
];

const CHART_DATA = [
  { time: '10:00', price: 1.0820 },
  { time: '11:00', price: 1.0835 },
  { time: '12:00', price: 1.0830 },
  { time: '13:00', price: 1.0845 },
  { time: '14:00', price: 1.0840 },
  { time: '15:00', price: 1.0855 },
];

function TradeDialog({ symbol, price }: { symbol: string, price: number }) {
  const [lot, setLot] = useState('0.10');
  const queryClient = useQueryClient();

  const tradeMutation = useMutation({
    mutationFn: async (type: 'BUY' | 'SELL') => {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, type, lot: parseFloat(lot) || 0.01, price }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
      toast.success(`${symbol} order executed successfully`);
    }
  });

  return (
    <Dialog>
      <DialogTrigger className="bg-zinc-800 border border-zinc-700 text-[10px] h-7 px-3 rounded-md hover:bg-zinc-700 transition-colors text-white">
        Trade
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Quick Execution: {symbol}</DialogTitle>
          <DialogDescription className="text-zinc-500">Current Market Price: {price}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lot">Lot Size</Label>
            <Input 
              id="lot" 
              value={lot} 
              onChange={(e) => setLot(e.target.value)} 
              className="bg-zinc-800 border-zinc-700 font-mono" 
              type="number"
              step="0.01"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => tradeMutation.mutate('BUY')} className="bg-emerald-600 hover:bg-emerald-700 text-white">BUY</Button>
            <Button onClick={() => tradeMutation.mutate('SELL')} className="bg-rose-600 hover:bg-rose-700 text-white">SELL</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsView({ account, autoTradeMutation }: { account: AccountInfo | undefined, autoTradeMutation: any }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [server, setServer] = useState('');
  const queryClient = useQueryClient();

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/broker/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password, server }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
      toast.success("MT5 Broker Connected - Environment Switched to LIVE");
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/broker/disconnect', { method: 'POST' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
      toast.info("Broker Disconnected - Switched to Sandbox Mode");
    }
  });

  const [mcpUrl, setMcpUrl] = useState('http://localhost:8000');
  const [isMcpConnecting, setIsMcpConnecting] = useState(false);

  const connectMcpMutation = useMutation({
    mutationFn: async () => {
      setIsMcpConnecting(true);
      const res = await fetch('/api/mcp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mcpUrl }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setIsMcpConnecting(false);
      queryClient.invalidateQueries({ queryKey: ['account'] });
      if (data.success) {
        toast.success("MCP Bridge Active: Linked to MT5 Terminal");
      } else {
        toast.error("MCP Connection Failed: Terminal Unreachable");
      }
    },
    onError: () => {
      setIsMcpConnecting(false);
      toast.error("MCP Network Error: Check Terminal Bridge");
    }
  });

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-600 rounded-md">
              <Brain className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">MCP AI Bridge</CardTitle>
              <CardDescription className="text-[10px]">Connect to metatrader-mcp-server running on your PC.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mcp-url" className="text-xs">MCP Server Endpoint (HTTP)</Label>
            <div className="flex gap-2">
              <Input 
                id="mcp-url" 
                value={mcpUrl}
                onChange={(e) => setMcpUrl(e.target.value)}
                placeholder="http://localhost:8000" 
                className="bg-zinc-800 border-zinc-700 h-9 text-xs flex-1" 
              />
              <Button 
                onClick={() => connectMcpMutation.mutate()}
                disabled={isMcpConnecting}
                className="bg-blue-600 hover:bg-blue-700 h-9 px-3"
              >
                {isMcpConnecting ? <Activity className="h-4 w-4 animate-spin" /> : "Link"}
              </Button>
            </div>
            <p className="text-[10px] text-zinc-500 italic">Example: http://YOUR_PC_IP:8000 or ngrok URL</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle className="text-sm">MT5 Broker Connection</CardTitle>
          <CardDescription className="text-[10px]">
            {account?.brokerConnected 
              ? `Currently linked to ${account.brokerConfig?.server} (ID: ${account.brokerConfig?.login})`
              : "Enter your MetaTrader 5 account details to link the AI agent."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!account?.brokerConnected ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="mt5-login" className="text-xs">Account Login (ID)</Label>
                <Input 
                  id="mt5-login" 
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="e.g. 12345678" 
                  className="bg-zinc-800 border-zinc-700 h-9 text-xs" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5-pass" className="text-xs">Trading Password</Label>
                <Input 
                  id="mt5-pass" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="bg-zinc-800 border-zinc-700 h-9 text-xs" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mt5-server" className="text-xs">Server Name</Label>
                <Input 
                  id="mt5-server" 
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder="e.g. MetaQuotes-Demo" 
                  className="bg-zinc-800 border-zinc-700 h-9 text-xs" 
                />
              </div>
              <Button 
                disabled={connectMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs h-9"
                onClick={() => connectMutation.mutate()}
              >
                {connectMutation.isPending ? "Connecting..." : "Save & Connect Broker"}
              </Button>
            </>
          ) : (
            <Button 
              variant="destructive"
              className="w-full text-xs h-9"
              onClick={() => disconnectMutation.mutate()}
            >
              Disconnect MT5 Account
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle className="text-sm">Automation Logic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-sm font-medium">Automatic Trading</div>
              <div className="text-[10px] text-zinc-500">Let Gemini execute trades automatically</div>
            </div>
            <Switch 
              checked={account?.autoTradingEnabled} 
              onCheckedChange={(checked) => autoTradeMutation.mutate(checked)}
            />
          </div>
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <div className="text-sm font-medium">MCP Gateway Status</div>
            <div className={`flex items-center gap-2 p-3 ${account?.brokerConnected ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/5 border-amber-500/20 text-amber-500'} rounded-lg`}>
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-medium">
                {account?.brokerConnected ? `Active: ${account.brokerConfig?.server}-Bridge` : "Waiting for MT5 Connection..."}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TradingDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('H1');
  const [analysisText, setAnalysisText] = useState("Scan the market to begin AI analysis...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch Account Info
  const { data: account } = useQuery<AccountInfo>({
    queryKey: ['account'],
    queryFn: async () => {
      const res = await fetch('/api/account');
      return res.json();
    },
    refetchInterval: 3000,
  });

  // Toggle Auto Trading
  const autoTradeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch('/api/toggle-autotrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
      toast.success('Automatic trading status updated');
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol, timeframe: selectedTimeframe }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysisText(data.analysis);
      setIsAnalyzing(false);
      toast.info(`Market analysis for ${selectedSymbol} received`);
    },
    onError: () => {
      setIsAnalyzing(false);
      toast.error('Failed to get AI analysis');
    }
  });

  const renderDashboard = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">${account?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-[10px] text-zinc-500">Total Funds</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Equity</CardTitle>
            <Activity className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">${account?.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-[10px] text-zinc-500">Unrealized P/L</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm">EURUSD</CardTitle>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">M15</Badge>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">1.08451</div>
              <div className="text-[10px] text-emerald-500">+0.00045 (+0.04%)</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#ec4899' }}
                />
                <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-zinc-400 px-1 uppercase tracking-wider">Active Positions</h3>
        <AnimatePresence mode='popLayout'>
          {account?.positions.length === 0 ? (
            <div className="text-center py-6 text-zinc-600 text-sm italic">No open trades</div>
          ) : (
            account?.positions.map((pos) => (
              <motion.div
                key={pos.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${pos.type === 'BUY' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                        {pos.type === 'BUY' ? <ArrowUpRight className="h-4 w-4 text-emerald-500" /> : <ArrowDownRight className="h-4 w-4 text-rose-500" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{pos.symbol}</div>
                        <div className="text-[10px] text-zinc-400">{pos.type} • {pos.lot} Lots</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-bold ${pos.profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {pos.profit >= 0 ? '+' : ''}{pos.profit.toFixed(2)} USD
                      </div>
                      <div className="text-[10px] text-zinc-500">Entry: {pos.openPrice}</div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderMarket = () => (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-zinc-400 px-1 uppercase tracking-wider">Watchlist</h3>
      <div className="grid gap-2">
        {STATIC_MARKET_DATA.map((data) => (
          <Card key={data.symbol} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{data.symbol}</div>
                <div className="text-[10px] text-zinc-500">Major Pair</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-mono text-zinc-200">{data.price}</div>
                  <div className={`text-[10px] ${data.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {data.change > 0 ? '+' : ''}{data.change}%
                  </div>
                </div>
                <TradeDialog symbol={data.symbol} price={data.price} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderAI = () => (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800 text-white overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold">Gemini Trading Agent</h3>
                <p className="text-xs text-zinc-400">Connected to MetaTrader AI</p>
              </div>
            </div>
            {isAnalyzing && (
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
            )}
          </div>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-500 uppercase">Symbol</Label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-xs">
                  <SelectValue placeholder="Select Symbol" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  {STATIC_MARKET_DATA.map((m) => (
                    <SelectItem key={m.symbol} value={m.symbol}>{m.symbol}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-500 uppercase">Timeframe</Label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 h-9 text-xs">
                  <SelectValue placeholder="Select TF" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  {['M5', 'M15', 'H1', 'H4', 'D1'].map((tf) => (
                    <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="p-4 bg-black/40 rounded-xl border border-zinc-800 min-h-[120px] mb-4">
            <p className="text-sm leading-relaxed text-zinc-300 italic">
              "{analysisText}"
            </p>
          </div>
          
          <div className="space-y-2 mb-4">
            <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Execution Engine</h4>
            <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900 border-dashed">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className="text-[10px] font-mono text-zinc-400">
                    {isAnalyzing ? "AGENT_EXECUTING_TOOLS..." : "AGENT_IDLE_READY"}
                  </span>
                </div>
                <Badge variant="outline" className="text-[9px] border-zinc-800">MCP::JSON_RPC</Badge>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => analyzeMutation.mutate()} 
            disabled={isAnalyzing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 rounded-xl transition-all active:scale-95"
          >
            {isAnalyzing ? "Processing..." : "Run AI Intelligence"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Strategy Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[150px] w-full p-4 pt-0">
            <div className="space-y-2 font-mono text-[10px] text-zinc-500">
              <div>[H.M.S] Scanning market liquidity...</div>
              <div className="text-blue-400">[H.M.S] Trend signal identified on {selectedSymbol}</div>
              <div>[H.M.S] Monitoring price action...</div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col max-w-md mx-auto relative overflow-hidden">
      <header className="p-4 border-b border-zinc-800 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold tracking-tight">MT AI Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={account?.mcpConnected ? "default" : "secondary"} className={account?.mcpConnected ? "bg-blue-600" : ""}>
            {account?.mcpConnected ? 'MCP-LINK' : 'MCP-OFF'}
          </Badge>
          <Badge variant={account?.brokerConnected ? "default" : "secondary"} className={account?.brokerConnected ? "bg-emerald-600" : ""}>
            {account?.brokerConnected ? 'LIVE' : 'DEMO'}
          </Badge>
          <Badge variant={account?.autoTradingEnabled ? "outline" : "secondary"} className={account?.autoTradingEnabled ? "border-emerald-500 text-emerald-500" : ""}>
            {account?.autoTradingEnabled ? 'A-ON' : 'A-OFF'}
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'market' && renderMarket()}
            {activeTab === 'ai' && renderAI()}
            {activeTab === 'settings' && <SettingsView account={account} autoTradeMutation={autoTradeMutation} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-black/80 backdrop-blur-xl border-t border-zinc-800 z-20">
        <div className="flex items-center justify-around">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Wallet className="h-5 w-5" />} label="Assets" />
          <NavButton active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={<History className="h-5 w-5" />} label="Market" />
          <NavButton active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} icon={<Brain className="h-5 w-5" />} label="Agent" />
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings className="h-5 w-5" />} label="Setup" />
        </div>
      </nav>
      <Toaster position="top-center" richColors />
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-blue-500' : 'text-zinc-500'}`}>
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TradingDashboard />
    </QueryClientProvider>
  );
}
