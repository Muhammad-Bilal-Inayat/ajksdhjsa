import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

export interface DateRangeSelection {
  preset: string;
  startDate: Date;
  endDate: Date;
  label: string;
}

const PRESET_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_7_days', label: 'Last 7 days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_30_days', label: 'Last 30 days' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_3_months', label: 'Last 3 Month' },
  { id: 'last_6_months', label: 'Last 6 Month' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getPresetRange(presetId: string): { start: Date; end: Date; label: string } {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (presetId) {
    case 'today':
      return { start: todayStart, end: todayEnd, label: `Today, ${formatDateBrief(now)}` };

    case 'this_week': {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      const start = new Date(todayStart);
      start.setDate(start.getDate() - diffToMonday);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59);
      return { start, end, label: 'This Week' };
    }

    case 'last_7_days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 6);
      return { start, end: todayEnd, label: 'Last 7 days' };
    }

    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start, end, label: 'This Month' };
    }

    case 'last_30_days': {
      const start = new Date(todayStart);
      start.setDate(start.getDate() - 29);
      return { start, end: todayEnd, label: 'Last 30 days' };
    }

    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      return { start, end, label: 'Last Month' };
    }

    case 'last_3_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start, end, label: 'Last 3 Months' };
    }

    case 'last_6_months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { start, end, label: 'Last 6 Months' };
    }

    default:
      return { start: todayStart, end: todayEnd, label: `Today, ${formatDateBrief(now)}` };
  }
}

function formatDateBrief(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateRangeString(start: Date, end: Date): string {
  const sStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const eStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${sStr} - ${eStr}`;
}

export const HeaderDateRangePicker: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Active applied state
  const [selectedPreset, setSelectedPreset] = useState<string>('today');
  const [appliedRange, setAppliedRange] = useState<{ start: Date; end: Date; label: string }>(() => getPresetRange('today'));

  // Interactive pending state inside dropdown
  const [pendingPreset, setPendingPreset] = useState<string>('today');
  const [startDate, setStartDate] = useState<Date>(() => getPresetRange('today').start);
  const [endDate, setEndDate] = useState<Date>(() => getPresetRange('today').end);
  const [selectingEnd, setSelectingEnd] = useState(false);

  // Month navigation
  const [navYear, setNavYear] = useState<number>(() => new Date().getFullYear());
  const [navMonth, setNavMonth] = useState<number>(() => new Date().getMonth());

  // Close on outside click
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // When dropdown opens, sync pending state to applied state
  useEffect(() => {
    if (isOpen) {
      setPendingPreset(selectedPreset);
      setStartDate(new Date(appliedRange.start));
      setEndDate(new Date(appliedRange.end));
      setNavYear(appliedRange.start.getFullYear());
      setNavMonth(appliedRange.start.getMonth());
      setSelectingEnd(false);
    }
  }, [isOpen]);

  const handleSelectPreset = (presetId: string) => {
    setPendingPreset(presetId);
    const range = getPresetRange(presetId);
    setStartDate(range.start);
    setEndDate(range.end);
    setNavYear(range.start.getFullYear());
    setNavMonth(range.start.getMonth());
    setSelectingEnd(false);
  };

  const handlePrevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(prev => prev - 1);
    } else {
      setNavMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(prev => prev + 1);
    } else {
      setNavMonth(prev => prev + 1);
    }
  };

  const handleYearChange = (year: number) => {
    setNavYear(year);
  };

  // Calendar cells generation for navYear/navMonth
  const calendarDays = useMemo(() => {
    const firstDay = new Date(navYear, navMonth, 1);
    const lastDay = new Date(navYear, navMonth + 1, 0);

    // Monday as index 0 (JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dayNumber: number;
    }> = [];

    // Prev month padding
    const prevMonthLastDay = new Date(navYear, navMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(navYear, navMonth - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        dayNumber: prevMonthLastDay - i,
      });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({
        date: new Date(navYear, navMonth, d),
        isCurrentMonth: true,
        dayNumber: d,
      });
    }

    // Next month padding to fill up grid (multiple of 7)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        date: new Date(navYear, navMonth + 1, d),
        isCurrentMonth: false,
        dayNumber: d,
      });
    }

    return days;
  }, [navYear, navMonth]);

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const isBetweenDates = (date: Date, start: Date, end: Date) => {
    const t = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return t > s && t < e;
  };

  const handleDayClick = (cellDate: Date) => {
    setPendingPreset('custom');
    if (!selectingEnd) {
      setStartDate(new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate(), 0, 0, 0));
      setEndDate(new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate(), 23, 59, 59));
      setSelectingEnd(true);
    } else {
      if (cellDate.getTime() < startDate.getTime()) {
        setStartDate(new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate(), 0, 0, 0));
        setEndDate(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59));
      } else {
        setEndDate(new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate(), 23, 59, 59));
      }
      setSelectingEnd(false);
    }
  };

  const handleApply = () => {
    let finalLabel = '';
    if (pendingPreset !== 'custom') {
      const match = PRESET_OPTIONS.find(p => p.id === pendingPreset);
      if (pendingPreset === 'today') {
        finalLabel = `Today, ${formatDateBrief(startDate)}`;
      } else {
        finalLabel = match?.label || formatDateBrief(startDate);
      }
    } else {
      if (isSameDay(startDate, endDate)) {
        finalLabel = formatDateBrief(startDate);
      } else {
        finalLabel = `${formatDateBrief(startDate)} - ${formatDateBrief(endDate)}`;
      }
    }

    const newSelection = {
      preset: pendingPreset,
      startDate,
      endDate,
      label: finalLabel,
    };

    setSelectedPreset(pendingPreset);
    setAppliedRange({ start: startDate, end: endDate, label: finalLabel });
    setIsOpen(false);

    // Broadcast event for sync/dashboards
    window.dispatchEvent(new CustomEvent('mbi-date-range-changed', { detail: newSelection }));
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    const list: number[] = [];
    for (let y = current - 5; y <= current + 5; y++) {
      list.push(y);
    }
    return list;
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Pill */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap select-none"
        title="Select Date Range Filter"
      >
        <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
        <span className="truncate max-w-[200px]">{appliedRange.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown (Matches Screenshot 2 Exactly) */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-[9999] w-[340px] sm:w-[370px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-4 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150 select-none">
          
          {/* 1. "Select For" Section Header */}
          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2.5">
            Select For
          </div>

          {/* 2. 8 Quick Preset Filter Pills Grid */}
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {PRESET_OPTIONS.map((preset) => {
              const isSelected = pendingPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-1.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all text-center cursor-pointer truncate border ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 font-bold shadow-2xs'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                  }`}
                  title={preset.label}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* 3. Month / Year Header Navigation Bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
            {/* Month with Prev/Next buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-bold text-sm text-slate-900 dark:text-white px-1">
                {MONTH_NAMES[navMonth]}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Year Dropdown Pill */}
            <div className="relative">
              <select
                value={navYear}
                onChange={(e) => handleYearChange(Number(e.target.value))}
                className="appearance-none bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-1 pl-2.5 pr-6 rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>

          {/* 4. Weekdays Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAY_NAMES.map((w, idx) => (
              <div key={idx} className="text-[11px] font-bold text-slate-400 py-0.5">
                {w}
              </div>
            ))}
          </div>

          {/* 5. Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1 text-center mb-3">
            {calendarDays.map((cell, idx) => {
              const isStart = isSameDay(cell.date, startDate);
              const isEnd = isSameDay(cell.date, endDate);
              const inRange = isBetweenDates(cell.date, startDate, endDate);
              const isToday = isSameDay(cell.date, new Date());

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(cell.date)}
                  className={`h-8 w-full rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer relative ${
                    isStart || isEnd
                      ? 'bg-blue-600 text-white font-black shadow-md scale-105 z-10'
                      : inRange
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 font-bold rounded-lg'
                      : cell.isCurrentMonth
                      ? 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                      : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span>{cell.dayNumber}</span>
                  {isToday && !isStart && !isEnd && (
                    <span className="w-1 h-1 rounded-full bg-blue-600 absolute bottom-1"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 6. Bottom Footer with Range Label, Cancel & Apply */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[170px]">
              Range: <span className="font-bold text-slate-800 dark:text-slate-200">{formatDateRangeString(startDate, endDate)}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
