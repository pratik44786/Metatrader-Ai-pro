/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  Terminal,
  Zap,
  Info,
  ChevronRight,
  XCircle,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
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

const SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'NAS100', 'US30'];
const TIMEFRAMES = ['M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

export default function App() {
  const [state, setState] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [manualVolume, setManualVolume] = useState('0.01');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/state');
        const data = await res.json();
        setState(data);
      } catch (e) {
        console.error("Fetch state error", e);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const toggleAutoTrade = async (enabled: boolean) => {
    await fetch('/api/autotrade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    toast.success(`AI Auto-Trading ${enabled ? 'ENABLED' : 'DISABLED'}`);
  };

  const updateSettings = async (field: string, value: any) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    toast.info(`Setting updated: ${field}`);
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success("Intelligence Analysis Complete");
      } else {
        toast.error("Analysis Failed");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const placeManualTrade = async (action: 'buy' | 'sell' | 'close', sym?: string) => {
    const res = await fetch('/api/trade/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        symbol: sym || state?.selectedSymbol, 
        action, 
        volume: parseFloat(manualVolume) 
      }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success(`${action.toUpperCase()} manually queued for MT5`);
    }
  };

  if (!state) return <div className="h-screen flex items-center justify-center bg-black text-white">Initializing Engine...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 font-sans selection:bg-blue-500/30">
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-black text-xl tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">MT-AI PRO</span>
            <div className="flex items-center gap-2">
               <Badge variant="outline" className={`text-[9px] h-4 ${state.eaConnected ? 'border-emerald-500/50 text-emerald-500' : 'border-zinc-700 text-zinc-500'}`}>
                 {state.eaConnected ? '🟢 EA-LIVE' : '🔴 OFFLINE'}
               </Badge>
               <span className="text-[9px] text-zinc-600 font-mono">{state.server || 'BROKER_NOT_FOUND'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-right">
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Balance</p>
              <p className="text-sm font-black text-emerald-400">${state.balance.toLocaleString()}</p>
            </div>
            <div className="h-8 w-[1px] bg-zinc-800" />
            <div>
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Equity</p>
              <p className={`text-sm font-black ${state.equity >= state.balance ? 'text-blue-400' : 'text-rose-400'}`}>
                ${state.equity.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-800">
            <span className="text-[10px] font-bold text-zinc-500 ml-2">AUTO</span>
            <Switch 
              checked={state.autoTradeEnabled}
              onCheckedChange={toggleAutoTrade}
              className="data-[state=checked]:bg-blue-600 h-5 w-9"
            />
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT PANEL: Account & Positions */}
        <section className="lg:col-span-4 space-y-6">
          <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
            <CardHeader className="pb-2 border-b border-zinc-800/50 mb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Live Margins</CardTitle>
                <Wallet className="h-4 w-4 text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold">Used Margin</p>
                  <p className="text-md font-mono">${state.margin.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold">Free Margin</p>
                  <p className="text-md font-mono">${state.freeMargin.toLocaleString()}</p>
                </div>
              </div>
              <div className="relative pt-1">
                 <div className="flex mb-2 items-center justify-between">
                   <div>
                     <span className="text-[10px] font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-400 bg-blue-500/10">
                       Margin Level
                     </span>
                   </div>
                   <div className="text-right">
                     <span className="text-[10px] font-semibold inline-block text-blue-400">
                       {state.margin > 0 ? ((state.equity / state.margin) * 100).toFixed(0) : '100'}%
                     </span>
                   </div>
                 </div>
                 <div className="overflow-hidden h-1.5 mb-4 text-xs flex rounded bg-zinc-800">
                   <div style={{ width: `${Math.min(100, state.margin > 0 ? (state.equity / state.margin) * 20 : 100)}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"></div>
                 </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 min-h-[300px]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Open Positions ({state.positions.length})</CardTitle>
                <Terminal className="h-4 w-4 text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[250px] w-full">
                {state.positions.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-xs text-zinc-600 italic">No open trades on terminal</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/50">
                    {state.positions.map((p: any) => (
                      <div key={p.ticket} className="p-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{p.symbol}</span>
                            <Badge className={p.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}>
                              {p.type} {p.volume}
                            </Badge>
                          </div>
                          <p className="text-[9px] text-zinc-500">Entry: {p.openPrice.toFixed(5)} → {p.currentPrice.toFixed(5)}</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <p className={`text-sm font-mono font-bold ${p.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {p.profit >= 0 ? '+' : ''}${p.profit.toFixed(2)}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10"
                            onClick={() => placeManualTrade('close', p.symbol)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="p-4 border-t border-zinc-800 bg-zinc-950/30 flex justify-between items-center">
                <span className="text-[10px] text-zinc-500 uppercase font-bold">Total Running P/L</span>
                <span className={`text-sm font-black ${state.equity >= state.balance ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${(state.equity - state.balance).toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Recent History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <ScrollArea className="h-[200px]">
                 {state.history.map((h: any, i: number) => (
                   <div key={i} className="p-3 border-b border-zinc-800/50 flex justify-between items-center text-[11px]">
                     <div className="flex gap-2 items-center">
                        <span className="font-bold">{h.symbol}</span>
                        <span className={h.status === 'FILLED' ? 'text-emerald-500' : 'text-rose-500'}>{h.status}</span>
                     </div>
                     <span className="text-zinc-500 font-mono">{new Date(h.timestamp).toLocaleTimeString()}</span>
                   </div>
                 ))}
               </ScrollArea>
            </CardContent>
          </Card>
        </section>

        {/* RIGHT PANEL: AI Analysis & Controls */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-wrap gap-4 items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 backdrop-blur-sm">
             <div className="flex flex-col gap-1.5 min-w-[140px]">
               <Label className="text-[10px] text-zinc-500 uppercase font-black ml-1">Asset</Label>
               <Select value={state.selectedSymbol} onValueChange={(v) => updateSettings('symbol', v)}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {SYMBOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
               </Select>
             </div>
             <div className="flex flex-col gap-1.5 min-w-[100px]">
               <Label className="text-[10px] text-zinc-500 uppercase font-black ml-1">Timeframe</Label>
               <Select value={state.selectedTimeframe} onValueChange={(v) => updateSettings('timeframe', v)}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {TIMEFRAMES.map(tf => <SelectItem key={tf} value={tf}>{tf}</SelectItem>)}
                  </SelectContent>
               </Select>
             </div>
             <div className="flex flex-col gap-1.5 min-w-[80px]">
               <Label className="text-[10px] text-zinc-500 uppercase font-black ml-1">Risk %</Label>
               <Input 
                 type="number" 
                 value={state.riskPercent} 
                 onChange={(e) => updateSettings('riskPercent', e.target.value)}
                 className="bg-zinc-950 border-zinc-800 h-9 text-xs" 
               />
             </div>
             <div className="flex-1" />
             <Button 
               onClick={runAnalysis} 
               disabled={isAnalyzing || !state.eaConnected}
               className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20"
              >
               {isAnalyzing ? (
                 <div className="flex gap-1">
                   <div className="w-1 h-1 bg-white rounded-full animate-bounce" />
                   <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.1s]" />
                   <div className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:-0.2s]" />
                 </div>
               ) : (
                 <>Run Intelligence Analysis</>
               )}
             </Button>
          </div>

          <Card className="bg-zinc-900/50 border-zinc-800 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${state.lastAnalysisSignal === 'BUY' ? 'bg-emerald-500' : state.lastAnalysisSignal === 'SELL' ? 'bg-rose-500' : 'bg-zinc-700'}`} />
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner ${
                  state.lastAnalysisSignal === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 
                  state.lastAnalysisSignal === 'SELL' ? 'bg-rose-500/10 text-rose-500' : 
                  'bg-zinc-800 text-zinc-500'
                }`}>
                  {state.lastAnalysisSignal || '---'}
                </div>
                <div>
                   <h2 className="font-black text-lg">AI Execution Signal</h2>
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] text-zinc-500 uppercase font-bold">{state.selectedSymbol} :: {state.selectedTimeframe}</span>
                     <span className="text-[10px] text-zinc-600 italic">• Updated {state.lastAnalysisTime ? new Date(state.lastAnalysisTime).toLocaleTimeString() : 'Never'}</span>
                   </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500 uppercase font-black">Confidence</p>
                <p className="text-2xl font-black text-blue-400">{state.lastAnalysisConfidence}%</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800">
                <p className="text-sm leading-relaxed text-zinc-300 italic opacity-90">
                  "{state.lastAnalysis}"
                </p>
              </div>

              {state.autoTradeEnabled && (
                <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <div className="p-1.5 bg-blue-500/10 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="text-[11px] text-blue-400 font-bold">AUTO-TRADING ACTIVE: The agent will automatically fire orders when confidence {'>'} 75%.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                   <p className="text-[10px] text-zinc-500 uppercase font-black mb-3">Execute Instant BUY</p>
                   <div className="flex gap-2">
                     <Input 
                        type="number" 
                        value={manualVolume} 
                        onChange={(e) => setManualVolume(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 h-10 font-mono text-xs" 
                      />
                     <Button 
                       onClick={() => placeManualTrade('buy')} 
                       className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 grow"
                     >
                       BUY
                     </Button>
                   </div>
                </div>
                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                   <p className="text-[10px] text-zinc-500 uppercase font-black mb-3">Execute Instant SELL</p>
                   <div className="flex gap-2">
                     <Input 
                        type="number" 
                        value={manualVolume} 
                        onChange={(e) => setManualVolume(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 h-10 font-mono text-xs" 
                      />
                     <Button 
                        onClick={() => placeManualTrade('sell')} 
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 grow"
                      >
                        SELL
                     </Button>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-800 rounded-lg">
                  <terminal className="h-4 w-4 text-zinc-500" />
                </div>
                <p className="text-xs text-zinc-400 font-medium">Pending Reverse-Bridge Orders:</p>
              </div>
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 font-mono border-blue-500/20">
                {state.orderQueue.length} WAITING
              </Badge>
            </CardContent>
          </Card>
        </section>
      </main>

      <Toaster position="bottom-right" theme="dark" richColors closeButton />
    </div>
  );
}
