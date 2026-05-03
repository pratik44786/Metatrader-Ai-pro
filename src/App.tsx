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
  ArrowUpRight, 
  ArrowDownRight,
  ShieldCheck,
  Brain,
  Server,
  Copy,
  Terminal,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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

function TradeDialog({ symbol, price, isLive }: { symbol: string, price: number, isLive: boolean }) {
  const [lot, setLot] = useState('0.10');
  const queryClient = useQueryClient();

  const tradeMutation = useMutation({
    mutationFn: async (type: 'BUY' | 'SELL') => {
      const endpoint = isLive ? '/api/trade/real' : '/api/trade';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, action: type, volume: parseFloat(lot) || 0.01, price }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
      if (isLive) {
        toast.success(`MT5 Order Queued: ${symbol} ${lot} Lots`);
      } else {
        toast.info(`Simulated: ${symbol} order placed`);
      }
    }
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="bg-zinc-800 border-zinc-700 text-[10px] h-7 px-3 text-white">
          Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white w-[90%] rounded-xl">
        <DialogHeader>
          <DialogTitle>Market Order: {symbol}</DialogTitle>
          <DialogDescription className="text-zinc-500">
            {isLive ? "REAL Execution via VPS Bridge" : "Sandbox Simulation Mode"}
          </DialogDescription>
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
              min="0.01"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => tradeMutation.mutate('BUY')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">BUY</Button>
            <Button onClick={() => tradeMutation.mutate('SELL')} className="bg-rose-600 hover:bg-rose-700 text-white font-bold">SELL</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SettingsView({ account, autoTradeMutation }: { account: AccountInfo | undefined, autoTradeMutation: any }) {
  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800 text-white overflow-hidden">
        <CardHeader className="bg-emerald-500/10 border-b border-emerald-500/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 rounded-md">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm">MetaTrader 5 EA Link</CardTitle>
              <CardDescription className="text-[10px] text-emerald-400">
                {account?.brokerConnected ? "ACTIVE: Linked to VPS Terminal" : "Offline: Waiting for EA Connection"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
           {account?.brokerConnected ? (
             <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                    <p className="text-[8px] text-zinc-500 uppercase font-bold">Login ID</p>
                    <p className="text-xs font-mono">{account.brokerConfig?.login}</p>
                  </div>
                  <div className="p-2 bg-zinc-950 rounded border border-zinc-800">
                    <p className="text-[8px] text-zinc-500 uppercase font-bold">Server</p>
                    <p className="text-xs font-mono truncate">{account.brokerConfig?.server}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                  <Activity className="h-3 w-3 animate-pulse" />
                  <span>Encrypted Reverse-Bridge Active</span>
                </div>
             </div>
           ) : (
             <div className="space-y-4">
               <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                 <p className="text-[10px] text-zinc-400 font-bold">SETUP STEPS FOR VPS:</p>
                 <ol className="text-[9px] text-zinc-500 space-y-1 list-decimal list-inside">
                   <li>Copy your WebApp URL</li>
                   <li>Open MetaEditor on VPS</li>
                   <li>Compile the provided "Bridge EA"</li>
                   <li>Add WebApp URL to MT5 Whitelist</li>
                   <li>Drag EA onto any chart</li>
                 </ol>
               </div>
               <Button 
                variant="outline" 
                className="w-full text-[10px] h-8 border-zinc-800"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  toast.success("URL Copied! Paste in EA inputs on VPS.");
                }}
               >
                 <Copy className="h-3 w-3 mr-2" /> Copy WebApp URL for EA
               </Button>
             </div>
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
              <div className="text-[10px] text-zinc-500">Let Gemini AI execute trades on MT5</div>
            </div>
            <Switch 
              checked={account?.autoTradingEnabled} 
              onCheckedChange={(checked) => autoTradeMutation.mutate(checked)}
            />
          </div>
          <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg flex gap-3">
             <Brain className="h-4 w-4 text-blue-400 mt-1" />
             <p className="text-[10px] text-zinc-400 leading-tight">
               When enabled, the specialized Gemini agent will periodically scan your VPS terminal, analyze liquidity, and send buy/sell signals to the EA.
             </p>
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
  const [analysisText, setAnalysisText] = useState("Run analysis to see real-time market sentiment...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch Account Info
  const { data: account } = useQuery<AccountInfo>({
    queryKey: ['account'],
    queryFn: async () => {
      const res = await fetch('/api/account');
      return res.json();
    },
    refetchInterval: 1000, // Faster poll for live MT5 updates
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
      toast.success('AI Automation Status Updated');
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
      toast.info(`Analysis for ${selectedSymbol} complete`);
    },
    onError: () => {
      setIsAnalyzing(false);
      toast.error('AI Analysis Timeout');
    }
  });

  const renderDashboard = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-zinc-900 border-zinc-800 text-white relative overflow-hidden">
          {account?.brokerConnected && (
             <div className="absolute top-2 right-2 flex items-center gap-1">
               <span className="relative flex h-2 w-2">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               <span className="text-[8px] text-emerald-500 font-bold uppercase">Live</span>
             </div>
          )}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${account?.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-[10px] text-zinc-500">Available Funds</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-zinc-400">Equity</CardTitle>
            <Zap className={`h-4 w-4 ${account?.equity !== account?.balance ? 'text-blue-400 animate-pulse' : 'text-zinc-600'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-xl font-bold ${account?.equity! > account?.balance! ? 'text-emerald-400' : account?.equity! < account?.balance! ? 'text-rose-400' : ''}`}>
              ${account?.equity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-zinc-500">Floating P/L</p>
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
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Trading History</h3>
          {account?.brokerConnected && <Badge variant="outline" className="text-[8px] bg-emerald-500/5 text-emerald-500">MT5 Logs In-Sync</Badge>}
        </div>
        <div className="text-center py-8 bg-zinc-950 rounded-xl border border-zinc-900 border-dashed">
           <Terminal className="h-5 w-5 text-zinc-700 mx-auto mb-2" />
           <p className="text-xs text-zinc-600 italic">No recent executions found in terminal logs</p>
        </div>
      </div>
    </div>
  );

  const renderMarket = () => (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-zinc-400 px-1 uppercase tracking-wider">Markets</h3>
      <div className="grid gap-2">
        {STATIC_MARKET_DATA.map((data) => (
          <Card key={data.symbol} className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">{data.symbol}</div>
                <div className="text-[10px] text-zinc-500">Spot Pair</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-mono text-zinc-200">{data.price}</div>
                  <div className={`text-[10px] ${data.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {data.change > 0 ? '+' : ''}{data.change}%
                  </div>
                </div>
                <TradeDialog symbol={data.symbol} price={data.price} isLive={!!account?.brokerConnected} />
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
                <p className="text-xs text-zinc-400">Agent Status: {isAnalyzing ? "Executing Tools" : "Idle"}</p>
              </div>
            </div>
            {isAnalyzing && (
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
              </div>
            )}
          </div>
        </div>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-zinc-500 uppercase">Analysis Symbol</Label>
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

          <div className="p-4 bg-black/40 rounded-xl border border-zinc-800 min-h-[140px] mb-4">
            <p className="text-sm leading-relaxed text-zinc-300 italic">
              "{analysisText}"
            </p>
          </div>
          
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-900 border-dashed">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${account?.brokerConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                <span className="text-[10px] font-mono text-zinc-400 capitalize">
                  {account?.brokerConnected ? `EA LINK: ${account.brokerConfig?.login}` : "Waiting for MT5 EA..."}
                </span>
              </div>
              <Badge variant="outline" className="text-[9px] border-zinc-800 text-zinc-500">v2.1-REVERSE</Badge>
            </div>
          </div>
          
          <Button 
            onClick={() => analyzeMutation.mutate()} 
            disabled={isAnalyzing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 rounded-xl transition-all active:scale-95 text-sm font-bold"
          >
            {isAnalyzing ? "Processing..." : "Run AI Intelligence"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Signal History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[150px] w-full p-4 pt-0">
            <div className="space-y-3">
               <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 flex justify-between items-center opacity-50">
                 <div className="space-y-1">
                   <div className="text-[10px] font-bold">EURUSD SELL SIGNAL</div>
                   <div className="text-[8px] text-zinc-600">Generated by Agent :: v2.1</div>
                 </div>
                 <Badge className="bg-zinc-800 text-zinc-400 text-[8px]">EXPIRED</Badge>
               </div>
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
          <span className="font-bold tracking-tight">MT-AI PRO</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={account?.brokerConnected ? "default" : "secondary"} className={account?.brokerConnected ? "bg-emerald-600" : "bg-orange-500/10 text-orange-400"}>
            {account?.brokerConnected ? 'EA-LINKED' : 'OFFLINE'}
          </Badge>
          <Badge variant={account?.autoTradingEnabled ? "outline" : "secondary"} className={account?.autoTradingEnabled ? "border-blue-500 text-blue-500" : ""}>
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

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 bg-black/90 backdrop-blur-xl border-t border-zinc-800 z-20">
        <div className="flex items-center justify-around">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<Wallet className="h-5 w-5" />} label="Assets" />
          <NavButton active={activeTab === 'market'} onClick={() => setActiveTab('market')} icon={<Zap className="h-5 w-5" />} label="Signal" />
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
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all duration-200 ${active ? 'text-blue-500 scale-110' : 'text-zinc-600'}`}>
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-tight">{label}</span>
      {active && <motion.div layoutId="nav-dot" className="w-1 h-1 bg-blue-500 rounded-full mt-0.5" />}
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
