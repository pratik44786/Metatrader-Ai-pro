/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  History as HistoryIcon, 
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
  BarChart3,
  Globe,
  Cpu,
  Lock,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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

const INITIAL_STATE = {
  balance: 0,
  equity: 0,
  margin: 0,
  freeMargin: 0,
  login: "",
  server: "",
  currency: "USD",
  leverage: 0,
  eaConnected: false,
  lastEAPing: 0,
  positions: [],
  orderQueue: [],
  history: [],
  autoTradeEnabled: false,
  selectedSymbol: "EURUSD",
  selectedTimeframe: "H1",
  riskPercent: 1.0,
  lastAnalysis: "Waiting for intelligence...",
  lastAnalysisSignal: "HOLD",
  lastAnalysisConfidence: 0,
  lastAnalysisTime: 0,
};

export default function App() {
  const [state, setState] = useState<any>(INITIAL_STATE);
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
               <Badge variant="outline" className={`text-[9px] h-4 ${state.eaConnected ? 'border-emerald-500/50 text-emerald-500' : 'border-zinc-700 text-rose-500'}`}>
                 {state.eaConnected ? '🟢 EA LIVE' : '🔴 EA Disconnected'}
               </Badge>
               {state.server && <span className="text-[9px] text-zinc-600 font-mono">{state.server}</span>}
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

      <main className="p-6 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
        {/* LEFT PANEL: Account & Positions */}
        <section className="lg:col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-sm shadow-xl">
              <CardHeader className="pb-2 border-b border-zinc-800/50 mb-4 bg-zinc-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-black">Capital Summary</CardTitle>
                  </div>
                  <Lock className="h-3 w-3 text-zinc-700" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800/50 group hover:border-blue-500/30 transition-all">
                    <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Margin Used</p>
                    <p className="text-xl font-black font-mono tracking-tighter text-zinc-200">${state.margin.toLocaleString()}</p>
                  </div>
                  <div className="p-4 bg-zinc-950/60 rounded-2xl border border-zinc-800/50 group hover:border-emerald-500/30 transition-all">
                    <p className="text-[10px] text-zinc-600 uppercase font-bold mb-1">Available</p>
                    <p className="text-xl font-black font-mono tracking-tighter text-emerald-500">${state.freeMargin.toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-4 bg-zinc-950/40 rounded-2xl border border-zinc-800/30">
                  <div className="flex mb-3 items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Safety Margin Level</span>
                    <span className={`text-[10px] font-black p-1 rounded ${state.margin > 0 && (state.equity / state.margin) < 2 ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {state.margin > 0 ? ((state.equity / state.margin) * 100).toFixed(0) : '100'}%
                    </span>
                  </div>
                  <div className="overflow-hidden h-2 flex rounded-full bg-zinc-800 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, state.margin > 0 ? (state.equity / state.margin) * 5 : 100)}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${state.margin > 0 && (state.equity / state.margin) < 2 ? 'bg-rose-500' : 'bg-blue-600'}`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800 shadow-xl overflow-hidden">
              <CardHeader className="pb-3 border-b border-zinc-800/50 bg-zinc-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    <CardTitle className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-black">Active Terminal ({state.positions.length})</CardTitle>
                  </div>
                  <RefreshCw className={`h-3 w-3 text-zinc-600 ${state.eaConnected ? 'animate-spin-slow' : ''}`} />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px] w-full">
                  {state.positions.length === 0 ? (
                    <div className="py-20 text-center px-6">
                      <div className="w-12 h-12 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700/50">
                         <BarChart3 className="h-5 w-5 text-zinc-600" />
                      </div>
                      <p className="text-xs text-zinc-500 font-medium">Scanning for open liquidity...</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800/30">
                      {state.positions.map((p: any) => (
                        <div key={p.ticket} className="p-4 flex items-center justify-between group hover:bg-zinc-800/20 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-1 h-8 rounded-full ${p.type === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black tracking-tighter">{p.symbol}</span>
                                <Badge variant="outline" className={`text-[9px] h-4 font-black ${p.type === 'BUY' ? 'border-emerald-500/20 text-emerald-500 bg-emerald-500/5' : 'border-rose-500/20 text-rose-500 bg-rose-500/5'}`}>
                                  {p.type} {p.volume}
                                </Badge>
                              </div>
                              <p className="text-[10px] text-zinc-600 font-mono mt-0.5">#{p.ticket} • {p.openPrice.toFixed(5)}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-4">
                            <div className="flex flex-col items-end">
                              <p className={`text-sm font-black font-mono tracking-tighter ${p.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {p.profit >= 0 ? '+' : ''}${p.profit.toFixed(2)}
                              </p>
                              <div className="flex items-center gap-1">
                                {p.profit >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-600" /> : <TrendingDown className="h-3 w-3 text-rose-600" />}
                                <span className="text-[9px] text-zinc-600 font-bold">{((p.profit / state.balance) * 100).toFixed(2)}%</span>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-all text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10"
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
                <div className="p-5 border-t border-zinc-800 bg-zinc-950/50 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-tight">Total Unbalanced</span>
                    <span className="text-[9px] text-zinc-600 font-bold uppercase">Exposure Risk: {(state.positions.reduce((acc: any, p: any) => acc + p.volume, 0) * 100000 / state.balance).toFixed(1)}x</span>
                  </div>
                  <span className={`text-2xl font-black font-mono tracking-tighter ${state.equity >= state.balance ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {state.equity >= state.balance ? '+' : ''}${(state.equity - state.balance).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* RIGHT PANEL: AI Analysis & Controls */}
        <section className="lg:col-span-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap gap-4 items-center bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800 backdrop-blur-md shadow-2xl shadow-blue-900/5"
          >
             <div className="flex flex-col gap-1.5 min-w-[140px]">
               <Label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] ml-1">Asset Target</Label>
               <Select value={state.selectedSymbol} onValueChange={(v) => updateSettings('symbol', v)}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700/50 h-10 text-xs font-black rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                    {SYMBOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
               </Select>
             </div>
             <div className="flex flex-col gap-1.5 min-w-[100px]">
               <Label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] ml-1">Temporal Scope</Label>
               <Select value={state.selectedTimeframe} onValueChange={(v) => updateSettings('timeframe', v)}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700/50 h-10 text-xs font-black rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                    {TIMEFRAMES.map(tf => <SelectItem key={tf} value={tf}>{tf}</SelectItem>)}
                  </SelectContent>
               </Select>
             </div>
             <div className="flex flex-col gap-1.5 min-w-[80px]">
               <Label className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] ml-1">Risk Unit %</Label>
               <Input 
                 type="number" 
                 step="0.1"
                 value={state.riskPercent} 
                 onChange={(e) => updateSettings('riskPercent', e.target.value)}
                 className="bg-zinc-950 border-zinc-700/50 h-10 text-xs font-mono font-black rounded-xl" 
               />
             </div>
             <div className="flex-1" />
             <Button 
               onClick={runAnalysis} 
               disabled={isAnalyzing || !state.eaConnected}
               className="bg-zinc-100 hover:bg-white text-black font-black h-11 px-8 rounded-2xl transition-all active:scale-95 shadow-xl shadow-zinc-400/5 gap-2 group"
              >
               {isAnalyzing ? (
                 <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce" />
                   <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.1s]" />
                   <div className="w-1.5 h-1.5 bg-black rounded-full animate-bounce [animation-delay:-0.2s]" />
                 </div>
               ) : (
                 <>
                  <Brain className="h-4 w-4 transition-transform group-hover:rotate-12" />
                  INITIATE AI SCAN
                 </>
               )}
             </Button>
          </motion.div>

          {/* MARKET CHART SECTION */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden shadow-2xl h-[350px] relative">
              <div className="absolute top-4 left-6 z-10 flex items-center gap-3">
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950/80 rounded-xl border border-zinc-800/50 backdrop-blur-md">
                    <Globe className="h-3 w-3 text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{state.selectedSymbol} Market Pulse</span>
                 </div>
              </div>
              <CardContent className="p-0 h-full w-full pt-16">
                 {state.bars && state.bars.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={state.bars}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#18181b" />
                        <XAxis 
                           dataKey="time" 
                           hide
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          orientation="right" 
                          tick={{ fontSize: 9, fill: '#52525b', fontWeight: 'bold' }} 
                          axisLine={false}
                          tickLine={false}
                          width={60}
                        />
                        <Tooltip 
                           contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px' }}
                           itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                           labelStyle={{ display: 'none' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="close" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          fillOpacity={1} 
                          fill="url(#colorPrice)" 
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-4">
                       <RefreshCw className="h-8 w-8 text-zinc-800 animate-spin-slow" />
                       <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Synching Real-Time Data Stream</p>
                    </div>
                 )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800 relative overflow-hidden shadow-2xl">
              <div className={`absolute top-0 left-0 w-1.5 h-full ${state.lastAnalysisSignal === 'BUY' ? 'bg-emerald-500' : state.lastAnalysisSignal === 'SELL' ? 'bg-rose-500' : 'bg-zinc-700'}`} />
              <CardHeader className="flex flex-row items-center justify-between pb-6 border-b border-zinc-800/30">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner border ${
                    state.lastAnalysisSignal === 'BUY' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                    state.lastAnalysisSignal === 'SELL' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                    'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'
                  }`}>
                    {state.lastAnalysisSignal || '...'}
                  </div>
                  <div>
                    <h2 className="font-black text-xl tracking-tight">Intelligence Consensus</h2>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Cpu className="h-3 w-3 text-zinc-600" />
                        <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">{state.selectedSymbol} ANALYTICS</span>
                      </div>
                      <span className="text-[10px] text-zinc-600 font-bold">• STAMP: {state.lastAnalysisTime ? new Date(state.lastAnalysisTime).toLocaleTimeString() : 'PENDING'}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Signal Confidence</p>
                  <p className="text-3xl font-black text-blue-500 drop-shadow-lg shadow-blue-500/20">{state.lastAnalysisConfidence}<span className="text-sm ml-1">%</span></p>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="p-6 bg-zinc-950/80 rounded-3xl border border-zinc-800/50 shadow-inner group">
                  <p className="text-[13px] leading-relaxed text-zinc-400 font-medium group-hover:text-zinc-200 transition-colors">
                    <span className="text-blue-500 font-black mr-2">ANALYSIS:</span>
                    {state.lastAnalysis}
                  </p>
                </div>

                <AnimatePresence>
                  {state.autoTradeEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl overflow-hidden shadow-lg shadow-blue-900/5"
                    >
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                        <ShieldCheck className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[11px] text-blue-400 font-black uppercase tracking-widest">Autonomous Protocol Engaged</p>
                        <p className="text-[10px] text-blue-400/70 font-medium">The system is monitoring for confidence thresholds exceeding 75% for auto-execution.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 bg-zinc-950 rounded-3xl border border-zinc-800/80 group hover:border-emerald-500/30 transition-all">
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                       <Zap className="h-3 w-3 text-emerald-500" />
                       Direct Liquidity BUY
                    </p>
                    <div className="flex gap-3">
                      <Input 
                        type="number" 
                        step="0.01"
                        value={manualVolume} 
                        onChange={(e) => setManualVolume(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 h-11 font-black font-mono text-sm rounded-xl focus-visible:ring-emerald-500/50" 
                      />
                      <Button 
                        onClick={() => placeManualTrade('buy')} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black h-11 px-8 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                      >
                        LONG
                      </Button>
                    </div>
                  </div>
                  <div className="p-5 bg-zinc-950 rounded-3xl border border-zinc-800/80 group hover:border-rose-500/30 transition-all">
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-4 flex items-center gap-2">
                       <Zap className="h-3 w-3 text-rose-500" />
                       Direct Liquidity SELL
                    </p>
                    <div className="flex gap-3">
                      <Input 
                        type="number" 
                        step="0.01"
                        value={manualVolume} 
                        onChange={(e) => setManualVolume(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 h-11 font-black font-mono text-sm rounded-xl focus-visible:ring-rose-500/50" 
                      />
                      <Button 
                        onClick={() => placeManualTrade('sell')} 
                        className="bg-rose-600 hover:bg-rose-500 text-white font-black h-11 px-8 rounded-xl shadow-lg shadow-rose-900/20 active:scale-95 transition-all"
                      >
                        SHORT
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>
      </main>

      <Toaster position="bottom-right" theme="dark" richColors closeButton />
    </div>
  );
}
