import React, { useState, useEffect } from 'react';
import { Bot, Key, Power, ShieldCheck, CheckCircle2, AlertTriangle, PhoneCall, MessageSquare, Trash2, Plus, ExternalLink, RefreshCw, Sparkles, Filter, Activity, Zap, Play } from 'lucide-react';

interface KeyHealthMetric {
  key: string;
  maskedKey: string;
  status: 'Healthy' | 'Rate-Limited' | 'Error' | 'Unverified';
  requestsCount: number;
  errorCount: number;
  lastUsed: string;
  lastError?: string;
}

interface AiConfigStatus {
  isAiEnabledGlobally: boolean;
  allowedPlans: {
    basic: boolean;
    business: boolean;
    enterprise: boolean;
  };
  homePageEnabled: boolean;
  keyCount: number;
  activeKeyIndex: number;
  keyHealthMetrics: KeyHealthMetric[];
}

interface SupportLead {
  id: string;
  businessName: string;
  userEmail: string;
  phone: string;
  question: string;
  plan: string;
  createdAt: string;
  status: 'pending' | 'contacted' | 'resolved';
  notes?: string;
}

export function AiAssistantControlTab() {
  const [status, setStatus] = useState<AiConfigStatus | null>(null);
  const [leads, setLeads] = useState<SupportLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);

  // Form states
  const [isGlobalOn, setIsGlobalOn] = useState(true);
  const [homeOn, setHomeOn] = useState(true);
  const [plans, setPlans] = useState({ basic: false, business: true, enterprise: true });
  const [keys, setKeys] = useState<string[]>([
    'AQ.Ab8RN6J41zAkRs-AxOHStQ3XEF5x8SRnRZ-kdc74FPc0jeT9xA',
    'AQ.Ab8RN6L0k5gS_ygV9Vr4N0gNbSw99uvgMqZoYJp4_DYX-dMbWQ',
    'AQ.Ab8RN6IhctgzNIM2bMcMuF6jbSgye6yXsS9VAW5aJMCJJcOSqw'
  ]);
  const [newKeyInput, setNewKeyInput] = useState('');
  const [activeTab, setActiveTab] = useState<'config' | 'leads'>('config');

  useEffect(() => {
    fetchAiData();
  }, []);

  const fetchAiData = async () => {
    setLoading(true);
    try {
      const [resSettings, resLeads] = await Promise.all([
        fetch('/api/ai/settings'),
        fetch('/api/ai/leads')
      ]);

      const dataSettings = await resSettings.json();
      const dataLeads = await resLeads.json();

      if (dataSettings.success && dataSettings.status) {
        setStatus(dataSettings.status);
        setIsGlobalOn(dataSettings.status.isAiEnabledGlobally);
        setHomeOn(dataSettings.status.homePageEnabled);
        setPlans(dataSettings.status.allowedPlans);
      }

      if (dataLeads.success && Array.isArray(dataLeads.leads)) {
        setLeads(dataLeads.leads);
      }
    } catch (err) {
      console.error('Error fetching AI data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isAiEnabledGlobally: isGlobalOn,
          homePageEnabled: homeOn,
          allowedPlans: plans,
          customKeys: keys
        })
      });

      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        alert('AI API Management Dashboard updated successfully!');
      } else {
        alert(data.error || 'Failed to update settings');
      }
    } catch (err) {
      alert('Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const testKeyHealth = async (keyToTest: string) => {
    setTestingKey(keyToTest);
    try {
      const res = await fetch('/api/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyToTest })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Key Health Result: ${data.result.message}`);
        fetchAiData();
      } else {
        alert(`Key Test Error: ${data.error}`);
      }
    } catch (err) {
      alert('Key test failed due to network error.');
    } finally {
      setTestingKey(null);
    }
  };

  const addKey = () => {
    if (!newKeyInput.trim()) return;
    if (keys.includes(newKeyInput.trim())) {
      alert('Key already in pool.');
      return;
    }
    setKeys(prev => [...prev, newKeyInput.trim()]);
    setNewKeyInput('');
  };

  const removeKey = (index: number) => {
    if (keys.length <= 1) {
      alert('Must keep at least 1 API Key in pool.');
      return;
    }
    setKeys(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateLeadStatus = async (id: string, newStatus: 'pending' | 'contacted' | 'resolved') => {
    try {
      const res = await fetch(`/api/ai/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
      }
    } catch (err) {
      alert('Failed to update lead status');
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-sm">
            MBI
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              AI API Management Dashboard
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            </h2>
            <p className="text-xs text-slate-400">
              Manage multiple Gemini API keys, monitor real-time key health, auto-switch rate limits, and view leads.
            </p>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'config' 
                ? 'bg-cyan-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            API Key Pool & Health
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'leads' 
                ? 'bg-cyan-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Support Leads
            {leads.filter(l => l.status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-slate-950 font-black">
                {leads.filter(l => l.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'config' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Health Monitor & Auto-Switch Pool */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> Key Health & Auto-Switch Pool
              </h3>
              <button
                onClick={fetchAiData}
                disabled={loading}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1 border border-slate-700"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
              </button>
            </div>

            <p className="text-xs text-slate-400">
              When an API key hits rate limits (429/quota error), the engine automatically switches to the next healthy key in the pool.
            </p>

            {/* Live Key Metrics List */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {keys.map((k, i) => {
                const metric = status?.keyHealthMetrics?.find(m => m.key === k);
                const statusType = metric?.status || 'Unverified';

                return (
                  <div
                    key={i}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-mono text-cyan-300 truncate max-w-[210px]">
                        <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Key #{i + 1}: {k.substring(0, 10)}...{k.substring(k.length - 6)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            statusType === 'Healthy'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : statusType === 'Rate-Limited'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse'
                              : statusType === 'Error'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {statusType}
                        </span>

                        <button
                          onClick={() => testKeyHealth(k)}
                          disabled={testingKey === k}
                          className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[10px] flex items-center gap-1 border border-slate-700"
                        >
                          <Play className="w-2.5 h-2.5" /> {testingKey === k ? 'Testing...' : 'Test'}
                        </button>

                        <button
                          onClick={() => removeKey(i)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          title="Remove key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                      <span>Requests: <strong className="text-white">{metric?.requestsCount || 0}</strong></span>
                      <span>Errors: <strong className="text-amber-400">{metric?.errorCount || 0}</strong></span>
                      <span>Last Used: <strong className="text-slate-300">{metric?.lastUsed || 'Never'}</strong></span>
                    </div>

                    {metric?.lastError && (
                      <p className="text-[10px] text-red-400 bg-red-950/30 p-1.5 rounded border border-red-900/40 truncate" title={metric.lastError}>
                        Error: {metric.lastError}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add New Key */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300">Add Gemini API Key to Rotation Pool</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste AQ.Ab8... key here"
                  value={newKeyInput}
                  onChange={(e) => setNewKeyInput(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={addKey}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* System Switches & Feature Gating */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-5 shadow-lg">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Power className="w-4 h-4 text-cyan-400" /> Global Switches & Tier Availability
            </h3>

            {/* Master Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-white">Global AI Assistant Engine</h4>
                <p className="text-[11px] text-slate-400">Turn AI Assistant completely ON or OFF across entire system.</p>
              </div>
              <button
                onClick={() => setIsGlobalOn(!isGlobalOn)}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  isGlobalOn ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Home Page Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-950 rounded-xl border border-slate-800">
              <div>
                <h4 className="text-xs font-bold text-white">Home Page Guidance Widget</h4>
                <p className="text-[11px] text-slate-400">Enable AI guide widget on landing page for prospective clients.</p>
              </div>
              <button
                onClick={() => setHomeOn(!homeOn)}
                className={`w-12 h-6 rounded-full transition-colors p-1 flex items-center ${
                  homeOn ? 'bg-cyan-500 justify-end' : 'bg-slate-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>

            {/* Plan Access */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-300">Subscription Plan Feature Availability</h4>
              <div className="space-y-2">
                {[
                  { key: 'basic', label: 'Basic Plan', desc: 'Standard local POS' },
                  { key: 'business', label: 'Business Plan', desc: 'Full Offline + AI Assistant' },
                  { key: 'enterprise', label: 'Enterprise Plan', desc: 'Unlimited Fleet + AI Assistant' }
                ].map((p) => (
                  <label
                    key={p.key}
                    className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700"
                  >
                    <div>
                      <span className="text-xs font-bold text-white">{p.label}</span>
                      <p className="text-[10px] text-slate-400">{p.desc}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={(plans as any)[p.key]}
                      onChange={(e) => setPlans({ ...plans, [p.key]: e.target.checked })}
                      className="w-4 h-4 accent-cyan-500 rounded"
                    />
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all"
            >
              {saving ? 'Saving System Configuration...' : 'Save AI Configuration & Keys'}
            </button>
          </div>
        </div>
      ) : (
        /* Support Leads Table */
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-amber-400" /> AI Support Inquiries & Human Call Leads
            </h3>
            <button
              onClick={fetchAiData}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No support call leads submitted yet. When users ask to talk to human/team, inquiries will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Business / User</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Question / Topic</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {lead.businessName}
                        <span className="block text-[10px] text-slate-400 font-normal">{lead.userEmail}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-300">{lead.phone}</td>
                      <td className="py-3 px-3 max-w-[280px] truncate" title={lead.question}>
                        {lead.question}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            lead.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : lead.status === 'contacted'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {lead.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right space-x-2">
                        {lead.phone && lead.phone !== 'Not Provided' && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold"
                          >
                            WhatsApp <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateLeadStatus(lead.id, e.target.value as any)}
                          className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 rounded px-2 py-1"
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
