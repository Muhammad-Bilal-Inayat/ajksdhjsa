import React, { useState } from 'react';
import { 
  X, SlidersHorizontal, RotateCcw, Search, 
  Sparkles, ArrowUp, ArrowDown, LayoutGrid,
  Check, Lock, Layers, Eye, EyeOff, GripVertical,
  ShieldCheck, Zap, BarChart3, Package, Users, DollarSign
} from 'lucide-react';
import { 
  DASHBOARD_WIDGETS_CONFIG, 
  PRESET_LAYOUTS, 
  DashboardWidgetConfig, 
  PlanTier,
  PLAN_WIDGET_LIMITS,
  isWidgetAllowedInPlan
} from '../../config/dashboardWidgetsConfig';

interface CustomizeLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  visibility: Record<string, boolean>;
  onToggleWidget: (widgetId: string, visible: boolean) => void;
  onApplyPreset: (presetKey: keyof typeof PRESET_LAYOUTS) => void;
  onResetDefaults: () => void;
  mainOrder: string[];
  sidebarOrder: string[];
  onChangeOrder: (newMainOrder: string[], newSidebarOrder: string[]) => void;
  userPlan?: string;
}

export const CustomizeLayoutModal: React.FC<CustomizeLayoutModalProps> = ({
  isOpen,
  onClose,
  visibility,
  onToggleWidget,
  onApplyPreset,
  onResetDefaults,
  mainOrder,
  sidebarOrder,
  onChangeOrder,
  userPlan = 'platinum',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'main' | 'sidebar'>('all');

  if (!isOpen) return null;

  const currentPlan = (userPlan || 'platinum').toLowerCase() as PlanTier;

  const filteredWidgets = DASHBOARD_WIDGETS_CONFIG.filter((widget) => {
    const matchesSearch = 
      widget.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;
    const matchesZone = activeTab === 'all' || widget.zone === activeTab;
    return matchesSearch && matchesCategory && matchesZone;
  });

  const handleMoveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const isMain = mainOrder.includes(widgetId);
    const targetList = isMain ? [...mainOrder] : [...sidebarOrder];
    const index = targetList.indexOf(widgetId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const temp = targetList[index - 1];
      targetList[index - 1] = targetList[index];
      targetList[index] = temp;
    } else if (direction === 'down' && index < targetList.length - 1) {
      const temp = targetList[index + 1];
      targetList[index + 1] = targetList[index];
      targetList[index] = temp;
    }

    if (isMain) {
      onChangeOrder(targetList, sidebarOrder);
    } else {
      onChangeOrder(mainOrder, targetList);
    }
  };

  const handleSwitchZone = (widgetId: string) => {
    const isMain = mainOrder.includes(widgetId);
    if (isMain) {
      const newMain = mainOrder.filter(id => id !== widgetId);
      const newSidebar = [...sidebarOrder, widgetId];
      onChangeOrder(newMain, newSidebar);
    } else {
      const newSidebar = sidebarOrder.filter(id => id !== widgetId);
      const newMain = [...mainOrder, widgetId];
      onChangeOrder(newMain, newSidebar);
    }
  };

  const enabledCount = DASHBOARD_WIDGETS_CONFIG.filter(w => visibility[w.id] !== false && isWidgetAllowedInPlan(w, currentPlan)).length;
  const maxLimit = PLAN_WIDGET_LIMITS[currentPlan] || 24;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs font-bold">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Dashboard Layout &amp; Widget Customizer</span>
                <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full capitalize">
                  {currentPlan} Plan ({enabledCount}/{maxLimit} Active)
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize your 22-widget command center, reorder sections, or apply 1-click layouts
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Quick Preset Layout Buttons */}
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
            Instant 1-Click Preset Layouts
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(PRESET_LAYOUTS) as (keyof typeof PRESET_LAYOUTS)[]).map((key) => {
              const preset = PRESET_LAYOUTS[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onApplyPreset(key)}
                  className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-left transition-all group cursor-pointer shadow-2xs active:scale-95"
                >
                  <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {preset.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 22 widgets by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              All Zones ({DASHBOARD_WIDGETS_CONFIG.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('main')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'main'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Main Zone
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sidebar')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'sidebar'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Sidebar Zone
            </button>
          </div>
        </div>

        {/* Scrollable Widget Cards List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {filteredWidgets.map((widget) => {
            const isAllowed = isWidgetAllowedInPlan(widget, currentPlan);
            const isVisible = visibility[widget.id] !== false && isAllowed;
            const isMainZone = mainOrder.includes(widget.id);

            return (
              <div
                key={widget.id}
                className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  !isAllowed
                    ? 'opacity-50 bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                    : isVisible
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-blue-400'
                    : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    isVisible
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    {widget.category === 'kpi' && <BarChart3 className="w-4 h-4" />}
                    {widget.category === 'sales' && <Zap className="w-4 h-4" />}
                    {widget.category === 'inventory' && <Package className="w-4 h-4" />}
                    {widget.category === 'finance' && <DollarSign className="w-4 h-4" />}
                    {widget.category === 'security' && <ShieldCheck className="w-4 h-4" />}
                    {widget.category === 'operations' && <Users className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {widget.title}
                      </h4>
                      {widget.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {widget.badge}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                        widget.minPlan === 'silver'
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                          : widget.minPlan === 'gold'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          : 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300'
                      }`}>
                        {widget.minPlan}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {widget.description}
                    </p>
                  </div>
                </div>

                {/* Right Action Tools */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {isAllowed ? (
                    <>
                      {/* Zone Switcher Button */}
                      <button
                        type="button"
                        onClick={() => handleSwitchZone(widget.id)}
                        className="px-2 py-1 text-[10px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                        title="Move between Main Zone and Sidebar Zone"
                      >
                        {isMainZone ? 'Main' : 'Sidebar'}
                      </button>

                      {/* Reorder Up/Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveWidget(widget.id, 'up')}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveWidget(widget.id, 'down')}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Visibility Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => onToggleWidget(widget.id, !isVisible)}
                        className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer shrink-0 ${
                          isVisible ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title={isVisible ? 'Hide Widget' : 'Show Widget'}
                      >
                        <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transition-transform duration-150 ${
                          isVisible ? 'translate-x-5' : 'translate-x-0'
                        }`} />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Upgrade Plan</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onResetDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl transition-all cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Apply &amp; Save Layout
          </button>
        </div>

      </div>
    </div>
  );
};

export default CustomizeLayoutModal;
