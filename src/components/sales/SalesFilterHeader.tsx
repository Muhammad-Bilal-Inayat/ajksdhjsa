import React, { useState, useRef, useEffect } from 'react';
import { 
  Calendar, Search, Filter, X, ChevronDown, Check, 
  RotateCcw, BarChart2, FileSpreadsheet, Printer, Tag, Users
} from 'lucide-react';

export type DatePreset = 
  | 'Today' 
  | 'Yesterday' 
  | 'This Week' 
  | 'Last 7 Days' 
  | 'This Month' 
  | 'Previous Month' 
  | 'This Quarter' 
  | 'This Fiscal Year' 
  | 'All Time' 
  | 'Custom';

export interface DateRangeState {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  preset: DatePreset;
}

export interface PartyOption {
  id: string;
  name: string;
  phone?: string;
  type?: string;
  count?: number;
}

export interface StatusOption {
  id: string;
  label: string;
}

export interface SalesFilterHeaderProps {
  // Date Range
  dateRange: DateRangeState;
  onDateRangeChange: (range: DateRangeState) => void;
  showDateFilter?: boolean;

  // Parties Filter
  selectedParty?: string;
  partyOptions?: PartyOption[];
  onPartyChange?: (partyId: string) => void;
  partyPlaceholder?: string;

  // Categories Filter
  selectedCategory?: string;
  categoryOptions?: string[];
  onCategoryChange?: (category: string) => void;

  // Status Filter
  selectedStatus?: string;
  statusOptions?: (string | StatusOption)[];
  onStatusChange?: (status: string) => void;

  // Search
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;

  // Actions
  onToggleGraph?: () => void;
  showGraph?: boolean;
  onExportExcel?: () => void;
  onPrint?: () => void;
  onResetAllFilters?: () => void;

  // Additional action buttons / components
  children?: React.ReactNode;
  className?: string;
}

export function getDateRangeFromPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const todayStr = format(now);

  switch (preset) {
    case 'Today':
      return { startDate: todayStr, endDate: todayStr };

    case 'Yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = format(y);
      return { startDate: yStr, endDate: yStr };
    }

    case 'This Week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(now.setDate(diff));
      return { startDate: format(mon), endDate: todayStr };
    }

    case 'Last 7 Days': {
      const last7 = new Date(now);
      last7.setDate(last7.getDate() - 6);
      return { startDate: format(last7), endDate: todayStr };
    }

    case 'This Month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: format(firstDay), endDate: format(lastDay) };
    }

    case 'Previous Month': {
      const prevMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevMonthLast = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: format(prevMonthFirst), endDate: format(prevMonthLast) };
    }

    case 'This Quarter': {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = new Date(now.getFullYear(), quarterMonth, 1);
      const qEnd = new Date(now.getFullYear(), quarterMonth + 3, 0);
      return { startDate: format(qStart), endDate: format(qEnd) };
    }

    case 'This Fiscal Year': {
      const fiscalYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStart = new Date(fiscalYear, 6, 1);
      const fyEnd = new Date(fiscalYear + 1, 5, 30);
      return { startDate: format(fyStart), endDate: format(fyEnd) };
    }

    case 'All Time':
      return { startDate: '2020-01-01', endDate: '2030-12-31' };

    case 'Custom':
    default:
      return { startDate: todayStr, endDate: todayStr };
  }
}

export const SalesFilterHeader: React.FC<SalesFilterHeaderProps> = ({
  dateRange,
  onDateRangeChange,
  showDateFilter = true,
  selectedParty = 'ALL',
  partyOptions = [],
  onPartyChange,
  partyPlaceholder = 'All Parties',
  selectedCategory = 'ALL',
  categoryOptions = [],
  onCategoryChange,
  selectedStatus = 'ALL',
  statusOptions = ['ALL', 'Paid', 'Unpaid', 'Pending'],
  onStatusChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search sale invoices by invoice #, customer name, medicine, or barcode...',
  onToggleGraph,
  showGraph = false,
  onExportExcel,
  onPrint,
  onResetAllFilters,
  children,
  className = ''
}) => {
  const [openDropdown, setOpenDropdown] = useState<'date' | 'party' | 'category' | 'status' | null>(null);
  const [partySearchText, setPartySearchText] = useState('');
  const [categorySearchText, setCategorySearchText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keydown for "/" focus search shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const presets: DatePreset[] = [
    'Today', 'Yesterday', 'This Week', 'Last 7 Days',
    'This Month', 'Previous Month', 'This Quarter',
    'This Fiscal Year', 'All Time'
  ];

  const handlePresetSelect = (preset: DatePreset) => {
    const range = getDateRangeFromPreset(preset);
    onDateRangeChange({
      startDate: range.startDate,
      endDate: range.endDate,
      preset
    });
    setOpenDropdown(null);
  };

  const filteredParties = partyOptions.filter(p => 
    p.name.toLowerCase().includes(partySearchText.toLowerCase()) ||
    (p.phone && p.phone.includes(partySearchText))
  );

  const filteredCategories = categoryOptions.filter(c => 
    c.toLowerCase().includes(categorySearchText.toLowerCase())
  );

  const currentPartyName = partyOptions.find(p => p.id === selectedParty || p.name === selectedParty)?.name || 'All Parties';

  const hasActiveFilters = (
    (dateRange.preset !== 'This Month' && dateRange.preset !== 'All Time') ||
    (selectedParty && selectedParty !== 'ALL') ||
    (selectedCategory && selectedCategory !== 'ALL') ||
    (selectedStatus && selectedStatus !== 'ALL') ||
    Boolean(searchQuery && searchQuery.trim().length > 0)
  );

  return (
    <div ref={containerRef} className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm flex flex-col gap-3.5 mb-4 ${className}`}>
      
      {/* Row 1: Dropdown Filters */}
      <div className="flex flex-wrap items-center gap-2.5">
        
        {/* 1. Date Range Filter */}
        {showDateFilter && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'date' ? null : 'date')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                openDropdown === 'date' || (dateRange.preset !== 'This Month' && dateRange.preset !== 'All Time')
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[160px] sm:max-w-[200px]">
                {dateRange.preset === 'Custom' 
                  ? `${dateRange.startDate} → ${dateRange.endDate}` 
                  : dateRange.preset}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {/* Date Presets Popover */}
            {openDropdown === 'date' && (
              <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-24 sm:top-full sm:left-0 mt-1.5 z-50 w-auto sm:w-72 max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-1 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2 font-bold text-slate-800 dark:text-white">
                  <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Calendar className="w-4 h-4" /> Date Filter Presets
                  </span>
                  <button 
                    type="button"
                    onClick={() => setOpenDropdown(null)} 
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1 mb-3">
                  {presets.map((preset) => {
                    const isSelected = dateRange.preset === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-2xs font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300'
                        }`}
                      >
                        <span>{preset}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Pickers */}
                <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>Custom Range:</span>
                    {dateRange.preset === 'Custom' && (
                      <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">Active</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">Start Date</label>
                      <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => {
                          onDateRangeChange({
                            startDate: e.target.value,
                            endDate: dateRange.endDate,
                            preset: 'Custom'
                          });
                        }}
                        className="w-full text-xs font-mono font-medium px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mb-0.5">End Date</label>
                      <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => {
                          onDateRangeChange({
                            startDate: dateRange.startDate,
                            endDate: e.target.value,
                            preset: 'Custom'
                          });
                        }}
                        className="w-full text-xs font-mono font-medium px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. Parties Filter */}
        {onPartyChange && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(openDropdown === 'party' ? null : 'party');
                setPartySearchText('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                openDropdown === 'party' || (selectedParty && selectedParty !== 'ALL')
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[140px]">
                {selectedParty && selectedParty !== 'ALL' ? currentPartyName : partyPlaceholder}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {openDropdown === 'party' && (
              <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-24 sm:top-full sm:left-0 mt-1.5 z-50 w-auto sm:w-72 max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-1 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                  <span className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Filter by Party
                  </span>
                  <button 
                    type="button"
                    onClick={() => setOpenDropdown(null)} 
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search customer / party..."
                    value={partySearchText}
                    onChange={(e) => setPartySearchText(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => {
                      onPartyChange('ALL');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      !selectedParty || selectedParty === 'ALL'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>All Parties</span>
                    {(!selectedParty || selectedParty === 'ALL') && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {filteredParties.map((p) => {
                    const isSelected = selectedParty === p.id || selectedParty === p.name;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onPartyChange(p.id || p.name);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="font-semibold truncate">{p.name}</div>
                          {p.phone && <div className="text-[10px] opacity-75">{p.phone}</div>}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Categories Filter */}
        {onCategoryChange && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(openDropdown === 'category' ? null : 'category');
                setCategorySearchText('');
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                openDropdown === 'category' || (selectedCategory && selectedCategory !== 'ALL')
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[130px]">
                {selectedCategory && selectedCategory !== 'ALL' ? selectedCategory : 'All Categories'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {openDropdown === 'category' && (
              <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-24 sm:top-full sm:left-0 mt-1.5 z-50 w-auto sm:w-64 max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3 animate-in fade-in slide-in-from-top-1 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                  <span className="font-bold text-slate-800 dark:text-white text-xs flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Filter by Category
                  </span>
                  <button 
                    type="button"
                    onClick={() => setOpenDropdown(null)} 
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {categoryOptions.length > 5 && (
                  <div className="relative mb-2">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={categorySearchText}
                      onChange={(e) => setCategorySearchText(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>
                )}

                <div className="max-h-56 overflow-y-auto space-y-1 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => {
                      onCategoryChange('ALL');
                      setOpenDropdown(null);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      !selectedCategory || selectedCategory === 'ALL'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>All Categories</span>
                    {(!selectedCategory || selectedCategory === 'ALL') && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {filteredCategories.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          onCategoryChange(cat);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{cat}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Status Filter */}
        {onStatusChange && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                openDropdown === 'status' || (selectedStatus && selectedStatus !== 'ALL')
                  ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Filter className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate max-w-[120px]">
                {selectedStatus && selectedStatus !== 'ALL' ? selectedStatus : 'All Statuses'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
            </button>

            {openDropdown === 'status' && (
              <div className="fixed inset-x-3 sm:inset-x-auto sm:absolute top-24 sm:top-full sm:left-0 mt-1.5 z-50 w-auto sm:w-52 max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-1 text-xs">
                <div className="space-y-1">
                  {statusOptions.map((opt) => {
                    const optId = typeof opt === 'string' ? opt : opt.id;
                    const optLabel = typeof opt === 'string' ? (opt === 'ALL' ? 'All Statuses' : opt) : opt.label;
                    const isSelected = selectedStatus === optId;
                    return (
                      <button
                        key={optId}
                        type="button"
                        onClick={() => {
                          onStatusChange(optId);
                          setOpenDropdown(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{optLabel}</span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reset Filters Shortcut Button */}
        {hasActiveFilters && onResetAllFilters && (
          <button
            type="button"
            onClick={onResetAllFilters}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="Reset all filters to default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}

      </div>

      {/* Row 2: Full-Width Search Input (Left) + Export Actions (Right) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
        
        {/* Full Width Expanded Search Box */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-12 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-400 font-medium"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded select-none pointer-events-none">
              /
            </kbd>
          )}
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {onToggleGraph && (
            <button 
              type="button" 
              onClick={onToggleGraph}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                showGraph
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Graph
            </button>
          )}

          {onExportExcel && (
            <button 
              type="button" 
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl hover:bg-emerald-100 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </button>
          )}

          {onPrint && (
            <button 
              type="button" 
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-200 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          )}

          {children}
        </div>

      </div>

    </div>
  );
};

export default SalesFilterHeader;
