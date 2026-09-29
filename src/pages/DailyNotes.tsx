import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileText, Plus, Search, Calendar, Tag, AlertCircle, 
  Pin, CheckCircle2, Trash2, Edit3, Filter, Printer, 
  Download, Sparkles, Clock, Check, X, RefreshCw, Eye, EyeOff
} from 'lucide-react';
import { NoteRecord } from '../types';
import { dbNotes } from '../lib/db';
import { useSettings } from '../contexts/SettingsContext';

const NOTE_CATEGORIES = [
  'General',
  'Order / Demand',
  'Staff / Shift Handover',
  'Supplier & Stock',
  'Customer Request',
  'Payment / Cash Note',
  'Urgent Reminder'
];

export const DailyNotes: React.FC = () => {
  const { userPreferences } = useSettings();
  const [notes, setNotes] = useState<NoteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Completed' | 'Pinned'>('All');
  
  // Date Filters
  const [dateFilterType, setDateFilterType] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'General',
    priority: 'Normal' as 'Normal' | 'High' | 'Urgent',
    isPinned: false,
    date: new Date().toISOString().split('T')[0],
  });

  // Load Notes
  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const allNotes = await dbNotes.getAll();
      setNotes(allNotes || []);
    } catch (err) {
      console.error('Failed to load notes:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();

    const handleSync = () => loadNotes();
    window.addEventListener('mbi-notes-updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('mbi-notes-updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadNotes]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingNote(null);
    setFormData({
      title: '',
      content: '',
      category: 'General',
      priority: 'Normal',
      isPinned: false,
      date: new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (note: NoteRecord) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category || 'General',
      priority: note.priority || 'Normal',
      isPinned: !!note.isPinned,
      date: note.date ? note.date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setIsModalOpen(true);
  };

  // Save Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() && !formData.content.trim()) return;

    try {
      const now = new Date().toISOString();
      const noteToSave: NoteRecord = {
        id: editingNote ? editingNote.id : `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: formData.title.trim() || 'Untitled Note',
        content: formData.content.trim(),
        category: formData.category,
        priority: formData.priority,
        isPinned: formData.isPinned,
        isCompleted: editingNote ? editingNote.isCompleted : false,
        date: formData.date || now.split('T')[0],
        createdAt: editingNote ? editingNote.createdAt : now,
        updatedAt: now,
      };

      await dbNotes.save(noteToSave);
      window.dispatchEvent(new CustomEvent('mbi-notes-updated'));
      setIsModalOpen(false);
      loadNotes();
    } catch (err) {
      console.error('Error saving note:', err);
    }
  };

  // Delete Note
  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    try {
      await dbNotes.delete(id);
      window.dispatchEvent(new CustomEvent('mbi-notes-updated'));
      loadNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  // Toggle Pin
  const handleTogglePin = async (note: NoteRecord) => {
    try {
      const updated = { ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() };
      await dbNotes.save(updated);
      window.dispatchEvent(new CustomEvent('mbi-notes-updated'));
      loadNotes();
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  // Toggle Complete
  const handleToggleComplete = async (note: NoteRecord) => {
    try {
      const updated = { ...note, isCompleted: !note.isCompleted, updatedAt: new Date().toISOString() };
      await dbNotes.save(updated);
      window.dispatchEvent(new CustomEvent('mbi-notes-updated'));
      loadNotes();
    } catch (err) {
      console.error('Error toggling complete:', err);
    }
  };

  // Filter Notes by Date, Category, Status, and Search
  const filteredNotes = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Yesterday string
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    const yesterdayStr = yDate.toISOString().split('T')[0];

    // Start of week (7 days ago)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];

    // Start of current month
    const startOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    return notes.filter(note => {
      const noteDate = (note.date || note.createdAt || '').split('T')[0];

      // 1. Date Filter
      if (dateFilterType === 'TODAY' && noteDate !== todayStr) return false;
      if (dateFilterType === 'YESTERDAY' && noteDate !== yesterdayStr) return false;
      if (dateFilterType === 'THIS_WEEK' && (noteDate < weekAgoStr || noteDate > todayStr)) return false;
      if (dateFilterType === 'THIS_MONTH' && (noteDate < startOfMonthStr || noteDate > todayStr)) return false;
      if (dateFilterType === 'CUSTOM') {
        if (customStartDate && noteDate < customStartDate) return false;
        if (customEndDate && noteDate > customEndDate) return false;
      }

      // 2. Category Filter
      if (categoryFilter !== 'All' && note.category !== categoryFilter) return false;

      // 3. Status Filter
      if (statusFilter === 'Pinned' && !note.isPinned) return false;
      if (statusFilter === 'Active' && note.isCompleted) return false;
      if (statusFilter === 'Completed' && !note.isCompleted) return false;

      // 4. Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = note.title.toLowerCase().includes(q);
        const matchContent = note.content.toLowerCase().includes(q);
        const matchCat = (note.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchCat) return false;
      }

      return true;
    }).sort((a, b) => {
      // Pinned first, then newest date/time
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime();
    });
  }, [notes, dateFilterType, customStartDate, customEndDate, categoryFilter, statusFilter, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Daily Notes & Scratchpad Register
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {filteredNotes.length} {filteredNotes.length === 1 ? 'Note' : 'Notes'}
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Record fast daily memos, handover tasks, shortage notices, and general reminders with date filters.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Notes</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add New Note</span>
            </button>
          </div>
        </div>

        {/* Filters & Date Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          
          {/* Row 1: Date Filter Quick Buttons */}
          <div className="flex items-center gap-2 flex-wrap border-b border-slate-100 dark:border-slate-700/60 pb-3.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Date Range:
            </span>

            {[
              { id: 'ALL', label: 'All Dates' },
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'THIS_WEEK', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'CUSTOM', label: 'Custom Range' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateFilterType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dateFilterType === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}

            {/* Custom Date Inputs */}
            {dateFilterType === 'CUSTOM' && (
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={e => setCustomStartDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  placeholder="Start Date"
                />
                <span className="text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={e => setCustomEndDate(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                  placeholder="End Date"
                />
              </div>
            )}
          </div>

          {/* Row 2: Search, Category & Status Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative md:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search notes by keyword or title..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="All">All Categories</option>
                {NOTE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Status Dropdown */}
            <div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="All">All Statuses</option>
                <option value="Pinned">Pinned Only</option>
                <option value="Active">Active (Incomplete)</option>
                <option value="Completed">Completed / Done</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading daily notes register...</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">No Notes Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              There are no notes matching your selected date or category filters. Click below to add a quick note.
            </p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Note</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map(note => {
              const isUrgent = note.priority === 'Urgent';
              const isHigh = note.priority === 'High';

              return (
                <div
                  key={note.id}
                  className={`relative rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between group ${
                    note.isCompleted
                      ? 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75'
                      : note.isPinned
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 shadow-xs'
                      : isUrgent
                      ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60 shadow-xs'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Category Badge */}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                          {note.category || 'General'}
                        </span>

                        {/* Priority Badge */}
                        {isUrgent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                            Urgent
                          </span>
                        )}
                        {isHigh && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                            High Priority
                          </span>
                        )}
                      </div>

                      {/* Pin Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePin(note)}
                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                          note.isPinned 
                            ? 'text-amber-600 bg-amber-100 dark:bg-amber-900/40' 
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                        title={note.isPinned ? 'Unpin Note' : 'Pin Note to Top'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Note Title */}
                    <h3 className={`text-sm sm:text-base font-bold mb-1.5 ${
                      note.isCompleted 
                        ? 'line-through text-slate-400 dark:text-slate-500' 
                        : 'text-slate-900 dark:text-white'
                    }`}>
                      {note.title}
                    </h3>

                    {/* Note Content */}
                    <p className={`text-xs whitespace-pre-wrap leading-relaxed ${
                      note.isCompleted 
                        ? 'text-slate-400 dark:text-slate-500' 
                        : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {note.content}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{note.date || note.createdAt.split('T')[0]}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Toggle Complete */}
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(note)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          note.isCompleted
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={note.isCompleted ? 'Mark as Incomplete' : 'Mark as Done'}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${note.isCompleted ? 'fill-current' : ''}`} />
                      </button>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(note)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Edit Note"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        title="Delete Note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Note Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                {editingNote ? 'Edit Note' : 'Add Quick Note'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4">
              {/* Note Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Note Title / Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Call supplier for Panadol stock, Handover 5000 Cash..."
                  className="w-full px-3.5 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Note Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Text / Note
                </label>
                <textarea
                  rows={4}
                  value={formData.content}
                  onChange={e => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write note details here..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Grid: Date & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {NOTE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority & Pin Controls */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Priority:
                  </label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.isPinned}
                    onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span>Pin to top</span>
                </label>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  {editingNote ? 'Save Changes' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyNotes;
