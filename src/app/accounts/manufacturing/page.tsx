'use client';

import React, { useState } from 'react';
import {
  Hammer,
  Scale,
  Sparkles,
  Calculator,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  ChevronRight,
  ShieldCheck,
  Layers,
  Award,
  ArrowRight,
  Coins,
} from 'lucide-react';
import { RUHVI_GST_CONFIG } from '@/lib/accounts/gst-engine';

interface JobCard {
  id: string;
  code: string;
  designName: string;
  category: string;
  metalPurity: string;
  issuedWeightGrams: number;
  expectedNetWeight: number;
  receivedWeightGrams?: number;
  allowedWastagePct: number;
  actualWastagePct?: number;
  karigarName: string;
  workshopLocation: string;
  status: 'ISSUED' | 'CASTING' | 'STONE_SETTING' | 'HALLMARKING' | 'COMPLETED';
  startDate: string;
  targetDate: string;
  estimatedCost: number;
}

const INITIAL_JOB_CARDS: JobCard[] = [
  {
    id: 'jc-1',
    code: 'JC-2026-104',
    designName: 'Royal Bengal Peacock Meenakari Choker',
    category: 'Bridal Necklace',
    metalPurity: '22K (916 Hallmarked)',
    issuedWeightGrams: 42.5,
    expectedNetWeight: 41.2,
    receivedWeightGrams: 41.35,
    allowedWastagePct: 2.5,
    actualWastagePct: 2.7,
    karigarName: 'Rameshwar Karmakar',
    workshopLocation: 'Bowbazar Artisan Guild, Kolkata',
    status: 'STONE_SETTING',
    startDate: '2026-03-24',
    targetDate: '2026-04-02',
    estimatedCost: 318000,
  },
  {
    id: 'jc-2',
    code: 'JC-2026-105',
    designName: 'Solitaire Cushion Diamond Engagement Ring',
    category: 'Rings',
    metalPurity: '18K (750 Rose Gold)',
    issuedWeightGrams: 5.8,
    expectedNetWeight: 5.5,
    allowedWastagePct: 2.0,
    karigarName: 'Subhashish Pal',
    workshopLocation: 'Salt Lake Tech & CAD Studio',
    status: 'HALLMARKING',
    startDate: '2026-03-26',
    targetDate: '2026-03-31',
    estimatedCost: 145000,
  },
  {
    id: 'jc-3',
    code: 'JC-2026-106',
    designName: 'Temple Craft Jhumka with Basra Pearls',
    category: 'Earrings',
    metalPurity: '22K (916 Hallmarked)',
    issuedWeightGrams: 24.0,
    expectedNetWeight: 23.4,
    allowedWastagePct: 2.5,
    karigarName: 'Gopal Chandra Sen',
    workshopLocation: 'Metiabruz Master Goldsmiths',
    status: 'CASTING',
    startDate: '2026-03-28',
    targetDate: '2026-04-05',
    estimatedCost: 182000,
  },
  {
    id: 'jc-4',
    code: 'JC-2026-103',
    designName: '925 Silver Filigree Floral Kada',
    category: 'Bangles',
    metalPurity: '925 Sterling Silver',
    issuedWeightGrams: 55.0,
    expectedNetWeight: 54.0,
    receivedWeightGrams: 53.9,
    allowedWastagePct: 1.8,
    actualWastagePct: 2.0,
    karigarName: 'Tapan Das (Cuttack Guild)',
    workshopLocation: 'Ruhvi Silver Atelier',
    status: 'COMPLETED',
    startDate: '2026-03-18',
    targetDate: '2026-03-25',
    estimatedCost: 16500,
  },
];

export default function ManufacturingBomPage() {
  const [activeTab, setActiveTab] = useState<'CALCULATOR' | 'JOB_CARDS'>(
    'CALCULATOR'
  );
  const [jobCards, setJobCards] = useState<JobCard[]>(INITIAL_JOB_CARDS);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // BOM Calculator State
  const [metalType, setMetalType] = useState('22K');
  const [metalRatePerGram, setMetalRatePerGram] = useState<number>(7250);
  const [netMetalWeight, setNetMetalWeight] = useState<number>(14.5);
  const [wastagePct, setWastagePct] = useState<number>(2.5); // Casting/polishing loss %
  const [makingRatePerGram, setMakingRatePerGram] = useState<number>(650);
  const [gemstoneCarats, setGemstoneCarats] = useState<number>(1.25);
  const [gemstoneRatePerCarat, setGemstoneRatePerCarat] =
    useState<number>(24000);
  const [hallmarkFee, setHallmarkFee] = useState<number>(45);
  const [packagingCost, setPackagingCost] = useState<number>(450);
  const [marginPct, setMarginPct] = useState<number>(25);

  // New Job Card Modal State
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newDesignName, setNewDesignName] = useState('');
  const [newKarigar, setNewKarigar] = useState('');
  const [newIssuedWeight, setNewIssuedWeight] = useState(15);
  const [newWorkshop, setNewWorkshop] = useState(
    'Bowbazar Artisan Guild, Kolkata'
  );
  const [newPurity, setNewPurity] = useState('22K (916)');

  // Dynamic BOM Calculation
  const metalCost = netMetalWeight * metalRatePerGram;
  const wastageWeight = (netMetalWeight * wastagePct) / 100;
  const wastageCost = wastageWeight * metalRatePerGram;
  const makingCharges = netMetalWeight * makingRatePerGram;
  const gemstoneCost = gemstoneCarats * gemstoneRatePerCarat;
  const totalBaseProductionCost =
    metalCost +
    wastageCost +
    makingCharges +
    gemstoneCost +
    hallmarkFee +
    packagingCost;

  const wholesaleMarkup = (totalBaseProductionCost * marginPct) / 100;
  const wholesaleNetPrice = totalBaseProductionCost + wholesaleMarkup;
  const suggestedRetailMrp = Math.round(wholesaleNetPrice * 1.15); // Suggested showroom retail
  const gstAmount = Math.round(
    (wholesaleNetPrice * RUHVI_GST_CONFIG.defaultJewelryGstRate) / 100
  );
  const finalWholesaleWithGst = Math.round(wholesaleNetPrice + gstAmount);

  // Status Badge Helper
  const getStatusBadge = (status: JobCard['status']) => {
    switch (status) {
      case 'ISSUED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
            Issued to Karigar
          </span>
        );
      case 'CASTING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
            Casting & Die
          </span>
        );
      case 'STONE_SETTING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-400">
            Jadau / Stone Setting
          </span>
        );
      case 'HALLMARKING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
            BIS Hallmarking Queue
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
            Vault Ready / Completed
          </span>
        );
    }
  };

  const handleCreateJobCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesignName) return;

    const newCard: JobCard = {
      id: `jc-${Date.now()}`,
      code: `JC-2026-${Math.floor(100 + Math.random() * 900)}`,
      designName: newDesignName,
      category: 'Custom Atelier Piece',
      metalPurity: newPurity,
      issuedWeightGrams: Number(newIssuedWeight),
      expectedNetWeight: Number((newIssuedWeight * 0.975).toFixed(2)),
      allowedWastagePct: 2.5,
      karigarName: newKarigar || 'Senior Master Goldsmith',
      workshopLocation: newWorkshop,
      status: 'ISSUED',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .split('T')[0],
      estimatedCost: Math.round(newIssuedWeight * 7500),
    };

    setJobCards([newCard, ...jobCards]);
    setShowNewJobModal(false);
    setNewDesignName('');
  };

  const filteredCards = jobCards.filter((card) => {
    const matchesFilter =
      filterStatus === 'ALL' || card.status === filterStatus;
    const matchesSearch =
      card.designName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.karigarName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-400">
              <Hammer className="h-3 w-3" /> Workshop & Atelier Costing
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Jewellery Manufacturing & Costing (BOM)
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Bill of Materials formulation, Karigar metal loss reconciliation,
            and BIS hallmark costing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 transition-all hover:bg-slate-700"
          >
            <Printer className="h-4 w-4" />
            <span>Print BOM Sheet</span>
          </button>
          <button
            onClick={() => setShowNewJobModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            <span>Issue New Job Card</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              WIP Production Batches
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {jobCards.filter((c) => c.status !== 'COMPLETED').length} Active
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Across 3 Goldsmith Workshops
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Gold in Karigar Custody
            </span>
            <div className="rounded-lg bg-yellow-500/10 p-2 text-yellow-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {jobCards
              .reduce(
                (acc, c) =>
                  acc + (c.status !== 'COMPLETED' ? c.issuedWeightGrams : 0),
                0
              )
              .toFixed(1)}{' '}
            g
          </p>
          <p className="mt-1 text-xs text-yellow-500">
            Pure bullion issued for casting
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Average Workshop Wastage
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Scale className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-emerald-400">2.35%</p>
          <p className="mt-1 text-xs text-slate-500">
            Target tolerance: &le; 2.50%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Estimated WIP Valuation
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Calculator className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            ₹
            {jobCards
              .reduce((acc, c) => acc + c.estimatedCost, 0)
              .toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Raw metal + stones + making
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('CALCULATOR')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'CALCULATOR'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calculator className="h-4 w-4" />
          <span>BOM & Unit Costing Calculator</span>
        </button>

        <button
          onClick={() => setActiveTab('JOB_CARDS')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === 'JOB_CARDS'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Workshop Job Cards & Metal Tracking ({jobCards.length})</span>
        </button>
      </div>

      {/* TAB 1: BOM CALCULATOR */}
      {activeTab === 'CALCULATOR' && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Inputs Section */}
          <div className="space-y-6 lg:col-span-7">
            <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
                <Coins className="h-4 w-4" /> 1. Precious Metal Parameters
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">
                    Metal Purity
                  </label>
                  <select
                    value={metalType}
                    onChange={(e) => {
                      setMetalType(e.target.value);
                      if (e.target.value === '24K') setMetalRatePerGram(7900);
                      else if (e.target.value === '22K')
                        setMetalRatePerGram(7250);
                      else if (e.target.value === '18K')
                        setMetalRatePerGram(5930);
                      else if (e.target.value === '14K')
                        setMetalRatePerGram(4610);
                      else if (e.target.value === '925_SILVER')
                        setMetalRatePerGram(96);
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="24K">24K Pure Gold (999)</option>
                    <option value="22K">22K Standard Gold (916)</option>
                    <option value="18K">18K Luxury Gold (750)</option>
                    <option value="14K">14K Everyday Gold (585)</option>
                    <option value="925_SILVER">925 Sterling Silver</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">
                    Net Weight (Grams)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={netMetalWeight}
                    onChange={(e) => setNetMetalWeight(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">
                    Bullion Rate (₹/Gram)
                  </label>
                  <input
                    type="number"
                    value={metalRatePerGram}
                    onChange={(e) =>
                      setMetalRatePerGram(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-slate-800/80 pt-2 sm:grid-cols-2">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400">
                      Karigar Wastage / Melting Loss
                    </label>
                    <span className="text-xs font-bold text-amber-400">
                      {wastagePct}% ({wastageWeight.toFixed(2)} g)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="0.1"
                    value={wastagePct}
                    onChange={(e) => setWastagePct(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Standard Bowbazar casting loss allowance: 1.5% - 3.0%
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">
                    Artisan Making Charges (₹/g)
                  </label>
                  <input
                    type="number"
                    value={makingRatePerGram}
                    onChange={(e) =>
                      setMakingRatePerGram(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Total Labour: ₹
                    {(netMetalWeight * makingRatePerGram).toLocaleString(
                      'en-IN'
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Gemstones & Add-ons */}
            <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-sm">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-400">
                <Sparkles className="h-4 w-4" /> 2. Diamonds, Gemstones &
                Hallmarking
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">
                    Total Stone Weight (Carats)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={gemstoneCarats}
                    onChange={(e) => setGemstoneCarats(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">
                    Gemstone / Diamond Rate (₹/Carat)
                  </label>
                  <input
                    type="number"
                    value={gemstoneRatePerCarat}
                    onChange={(e) =>
                      setGemstoneRatePerCarat(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 border-t border-slate-800/80 pt-2 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">
                    BIS Hallmarking Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={hallmarkFee}
                    onChange={(e) => setHallmarkFee(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Official BIS Govt fee: ₹45/pc
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">
                    Luxury Velvet Box & Pouch (₹)
                  </label>
                  <input
                    type="number"
                    value={packagingCost}
                    onChange={(e) => setPackagingCost(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-400">
                    Target Margin %
                  </label>
                  <input
                    type="number"
                    value={marginPct}
                    onChange={(e) => setMarginPct(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Wholesale mark-up: {marginPct}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* BOM Costing Sheet Card */}
          <div className="lg:col-span-5">
            <div className="sticky top-6 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-2xl shadow-amber-500/5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Ruhvi Atelier BOM Sheet
                  </span>
                  <h4 className="text-lg font-bold text-white">
                    Production Cost Breakdown
                  </h4>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-400">
                  <Award className="h-5 w-5" />
                </div>
              </div>

              {/* Breakdown Rows */}
              <div className="space-y-3 py-4 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    Pure Metal Cost ({netMetalWeight}g @ ₹{metalRatePerGram}/g):
                  </span>
                  <span className="font-mono font-medium text-white">
                    ₹{Math.round(metalCost).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    Karigar Casting Wastage ({wastagePct}% ={' '}
                    {wastageWeight.toFixed(2)}g):
                  </span>
                  <span className="font-mono font-medium text-amber-400">
                    ₹{Math.round(wastageCost).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Artisan Making Charges:</span>
                  <span className="font-mono font-medium text-white">
                    ₹{Math.round(makingCharges).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Gemstones / Diamonds ({gemstoneCarats} cts):</span>
                  <span className="font-mono font-medium text-white">
                    ₹{Math.round(gemstoneCost).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>BIS Hallmarking & Laser Inscription:</span>
                  <span className="font-mono font-medium text-white">
                    ₹{hallmarkFee}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>Luxury Box & Packaging:</span>
                  <span className="font-mono font-medium text-white">
                    ₹{packagingCost}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-dashed border-slate-800 pt-3 font-bold text-slate-400">
                  <span>Base Production Cost:</span>
                  <span className="font-mono text-sm text-white">
                    ₹
                    {Math.round(totalBaseProductionCost).toLocaleString(
                      'en-IN'
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between font-semibold text-emerald-400">
                  <span>Wholesale Profit Margin ({marginPct}%):</span>
                  <span className="font-mono">
                    +₹{Math.round(wholesaleMarkup).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span>
                    GST ({RUHVI_GST_CONFIG.defaultJewelryGstRate}% under HSN{' '}
                    {RUHVI_GST_CONFIG.defaultJewelryHsn}):
                  </span>
                  <span className="font-mono text-slate-300">
                    ₹{gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Total Final Pricing Card */}
              <div className="mt-2 space-y-2 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Wholesale Price (Incl. GST):
                  </span>
                  <span className="font-mono text-xl font-bold text-amber-400">
                    ₹{finalWholesaleWithGst.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-800 pt-2">
                  <span className="text-xs font-semibold uppercase text-slate-400">
                    Suggested Retail MRP:
                  </span>
                  <span className="font-mono text-base font-bold text-white">
                    ₹{suggestedRetailMrp.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 space-y-2">
                <button
                  onClick={() => setShowNewJobModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-xs font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-all hover:bg-amber-400"
                >
                  <Hammer className="h-4 w-4" />
                  <span>Convert BOM into Live Job Card</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: JOB CARDS & METAL LOSS RECONCILIATION */}
      {activeTab === 'JOB_CARDS' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Job Card #, design or Karigar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
              >
                <option value="ALL">All Stages</option>
                <option value="ISSUED">Issued to Karigar</option>
                <option value="CASTING">Casting & Die</option>
                <option value="STONE_SETTING">Stone Setting (Jadau)</option>
                <option value="HALLMARKING">BIS Hallmarking</option>
                <option value="COMPLETED">Completed / Ready</option>
              </select>
            </div>
          </div>

          {/* Job Cards Table */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800 bg-slate-950/70 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Job Code & Design</th>
                    <th className="px-4 py-4">Purity & Karigar</th>
                    <th className="px-4 py-4">Workshop Location</th>
                    <th className="px-4 py-4 text-right">Issued Metal (g)</th>
                    <th className="px-4 py-4 text-right">
                      Expected / Actual (g)
                    </th>
                    <th className="px-4 py-4 text-center">
                      Metal Loss / Wastage
                    </th>
                    <th className="px-4 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCards.map((card) => {
                    const actualLossGrams = card.receivedWeightGrams
                      ? Number(
                          (
                            card.issuedWeightGrams - card.receivedWeightGrams
                          ).toFixed(2)
                        )
                      : null;
                    const isOverWastage =
                      card.actualWastagePct &&
                      card.actualWastagePct > card.allowedWastagePct;

                    return (
                      <tr
                        key={card.id}
                        className="transition-colors hover:bg-slate-800/30"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-amber-400">
                            {card.code}
                          </div>
                          <div className="mt-0.5 font-semibold text-white">
                            {card.designName}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {card.category}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-200">
                            {card.metalPurity}
                          </div>
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <span>Karigar:</span>{' '}
                            <span className="font-medium text-white">
                              {card.karigarName}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-400">
                          {card.workshopLocation}
                          <div className="mt-0.5 text-[10px] text-slate-500">
                            Target: {card.targetDate}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right font-mono font-bold text-white">
                          {card.issuedWeightGrams.toFixed(2)} g
                        </td>

                        <td className="px-4 py-4 text-right font-mono">
                          {card.receivedWeightGrams ? (
                            <span className="font-bold text-emerald-400">
                              {card.receivedWeightGrams.toFixed(2)} g
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Exp: {card.expectedNetWeight.toFixed(2)} g
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center font-mono">
                          {card.actualWastagePct ? (
                            <div className="inline-block">
                              <span
                                className={`text-xs font-bold ${
                                  isOverWastage
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {card.actualWastagePct.toFixed(1)}% loss
                              </span>
                              <div className="text-[10px] text-slate-500">
                                {actualLossGrams}g ({card.allowedWastagePct}%
                                allowed)
                              </div>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Allowed: &le;{card.allowedWastagePct}%
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-center">
                          {getStatusBadge(card.status)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => {
                              const stages: JobCard['status'][] = [
                                'ISSUED',
                                'CASTING',
                                'STONE_SETTING',
                                'HALLMARKING',
                                'COMPLETED',
                              ];
                              const currentIndex = stages.indexOf(card.status);
                              if (currentIndex < stages.length - 1) {
                                const nextStage = stages[currentIndex + 1];
                                setJobCards(
                                  jobCards.map((c) =>
                                    c.id === card.id
                                      ? {
                                          ...c,
                                          status: nextStage,
                                          receivedWeightGrams:
                                            nextStage === 'COMPLETED'
                                              ? c.expectedNetWeight
                                              : c.receivedWeightGrams,
                                        }
                                      : c
                                  )
                                );
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-700 hover:text-white"
                          >
                            <span>Progress Stage</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Job Card Modal */}
      {showNewJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Hammer className="h-5 w-5 text-amber-400" />
                <span>Issue Job Card to Goldsmith Workshop</span>
              </h3>
              <button
                onClick={() => setShowNewJobModal(false)}
                className="text-lg text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={handleCreateJobCard}
              className="space-y-4 pt-4 text-xs"
            >
              <div>
                <label className="mb-1 block font-semibold text-slate-300">
                  Design / Article Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 22K Navratna Royal Kada"
                  value={newDesignName}
                  onChange={(e) => setNewDesignName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Metal Purity
                  </label>
                  <select
                    value={newPurity}
                    onChange={(e) => setNewPurity(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="22K (916)">22K (916 BIS)</option>
                    <option value="18K (750)">18K (750 BIS)</option>
                    <option value="14K (585)">14K (585 BIS)</option>
                    <option value="925 Silver">925 Sterling Silver</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-slate-300">
                    Raw Metal Issued (Grams)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newIssuedWeight}
                    onChange={(e) => setNewIssuedWeight(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-300">
                  Karigar Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rameshwar Karmakar"
                  value={newKarigar}
                  onChange={(e) => setNewKarigar(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-300">
                  Workshop Centre
                </label>
                <select
                  value={newWorkshop}
                  onChange={(e) => setNewWorkshop(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="Bowbazar Artisan Guild, Kolkata">
                    Bowbazar Artisan Guild, Kolkata
                  </option>
                  <option value="Salt Lake Tech & CAD Studio">
                    Salt Lake Tech & CAD Studio
                  </option>
                  <option value="Metiabruz Master Goldsmiths">
                    Metiabruz Master Goldsmiths
                  </option>
                  <option value="Ruhvi Silver Atelier">
                    Ruhvi Silver Atelier
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 px-5 py-2 font-bold text-slate-950 hover:bg-amber-400"
                >
                  Create & Print Job Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
