'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Globe, RefreshCw, Save, Star, Pencil, X, Check } from 'lucide-react';

interface BrandTool {
  id: string;
  name: string;
  path: string;
  category: string;
  keywords: string[];
  description: string | null;
  priority: number;
  isAutoDetected: boolean;
}

interface BrandProfile {
  id: string;
  name: string;
  domain: string;
  sitemapUrl: string | null;
  description: string | null;
  isDefault: boolean;
  tools: BrandTool[];
  _count?: { tools: number; blogs: number };
}

interface DiscoveredTool {
  path: string;
  name: string;
  category: string;
  keywords: string[];
  url: string;
}

export default function SettingsPage() {
  const [profiles, setProfiles] = useState<BrandProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [crawling, setCrawling] = useState(false);
  const [crawlResults, setCrawlResults] = useState<DiscoveredTool[] | null>(null);
  const [selectedCrawlTools, setSelectedCrawlTools] = useState<Set<string>>(new Set());
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [showAddTool, setShowAddTool] = useState(false);
  const [editingTool, setEditingTool] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New profile form
  const [newProfile, setNewProfile] = useState({
    name: '',
    domain: '',
    sitemapUrl: '',
    description: '',
    isDefault: true,
  });

  // New tool form
  const [newTool, setNewTool] = useState({
    name: '',
    path: '',
    category: 'specialized',
    keywords: '',
    description: '',
    priority: 5,
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/brand-profile');
      const data = await res.json();
      if (data.success) {
        setProfiles(data.data);
        if (data.data.length > 0 && !activeProfile) {
          // Load full profile with tools
          const defaultProfile = data.data.find((p: BrandProfile) => p.isDefault) || data.data[0];
          await loadProfile(defaultProfile.id);
        }
      }
    } catch {
      showMessage('error', 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = async (id: string) => {
    try {
      const res = await fetch(`/api/brand-profile/${id}`);
      const data = await res.json();
      if (data.success) {
        setActiveProfile(data.data);
      }
    } catch {
      showMessage('error', 'Failed to load profile');
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleCreateProfile = async () => {
    if (!newProfile.name || !newProfile.domain) return;
    setSaving(true);
    try {
      const res = await fetch('/api/brand-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProfile,
          sitemapUrl: newProfile.sitemapUrl || null,
          description: newProfile.description || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveProfile(data.data);
        setShowNewProfile(false);
        setNewProfile({ name: '', domain: '', sitemapUrl: '', description: '', isDefault: true });
        showMessage('success', 'Brand profile created');
        await fetchProfiles();
      } else {
        showMessage('error', data.error?.message || 'Failed to create profile');
      }
    } catch {
      showMessage('error', 'Failed to create profile');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProfile = async (updates: Partial<BrandProfile>) => {
    if (!activeProfile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/brand-profile/${activeProfile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        setActiveProfile(data.data);
        showMessage('success', 'Profile updated');
        await fetchProfiles();
      }
    } catch {
      showMessage('error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!activeProfile) return;
    if (!confirm('Delete this brand profile and all its tools?')) return;
    try {
      await fetch(`/api/brand-profile/${activeProfile.id}`, { method: 'DELETE' });
      setActiveProfile(null);
      showMessage('success', 'Profile deleted');
      await fetchProfiles();
    } catch {
      showMessage('error', 'Failed to delete profile');
    }
  };

  const handleCrawlSitemap = async () => {
    if (!activeProfile) return;
    setCrawling(true);
    setCrawlResults(null);
    try {
      const res = await fetch(`/api/brand-profile/${activeProfile.id}/crawl`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setCrawlResults(data.data.discovered);
        setSelectedCrawlTools(new Set(data.data.discovered.map((t: DiscoveredTool) => t.path)));
        showMessage('success', `Found ${data.data.discovered.length} new pages (${data.data.totalEntries} total)`);
      } else {
        showMessage('error', data.error?.message || data.error || 'Crawl failed');
      }
    } catch {
      showMessage('error', 'Sitemap crawl failed');
    } finally {
      setCrawling(false);
    }
  };

  const handleImportCrawled = async () => {
    if (!activeProfile || !crawlResults) return;
    const selected = crawlResults.filter(t => selectedCrawlTools.has(t.path));
    if (!selected.length) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/brand-profile/${activeProfile.id}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tools: selected.map(t => ({
            name: t.name,
            path: t.path,
            category: t.category,
            keywords: t.keywords,
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', `Imported ${selected.length} tools`);
        setCrawlResults(null);
        await loadProfile(activeProfile.id);
      }
    } catch {
      showMessage('error', 'Failed to import tools');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTool = async () => {
    if (!activeProfile || !newTool.name || !newTool.path) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/brand-profile/${activeProfile.id}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTool,
          keywords: newTool.keywords.split(',').map(k => k.trim()).filter(Boolean),
          description: newTool.description || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage('success', 'Tool added');
        setShowAddTool(false);
        setNewTool({ name: '', path: '', category: 'specialized', keywords: '', description: '', priority: 5 });
        await loadProfile(activeProfile.id);
      }
    } catch {
      showMessage('error', 'Failed to add tool');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTool = async (toolId: string, updates: Partial<BrandTool>) => {
    if (!activeProfile) return;
    try {
      const res = await fetch(`/api/brand-profile/${activeProfile.id}/tools/${toolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        setEditingTool(null);
        await loadProfile(activeProfile.id);
      }
    } catch {
      showMessage('error', 'Failed to update tool');
    }
  };

  const handleDeleteTool = async (toolId: string) => {
    if (!activeProfile) return;
    try {
      await fetch(`/api/brand-profile/${activeProfile.id}/tools/${toolId}`, { method: 'DELETE' });
      await loadProfile(activeProfile.id);
    } catch {
      showMessage('error', 'Failed to delete tool');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <span className="text-lg font-semibold text-gray-900">Settings</span>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Message */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Profile Selector */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Brand Profiles</h2>
              <p className="text-sm text-gray-500 mt-1">Configure your brand identity for blog generation</p>
            </div>
            <button
              onClick={() => setShowNewProfile(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Profile
            </button>
          </div>

          {/* Profile tabs */}
          {profiles.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {profiles.map(p => (
                <button
                  key={p.id}
                  onClick={() => loadProfile(p.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeProfile?.id === p.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {p.isDefault && <Star className="w-3.5 h-3.5 inline mr-1.5" />}
                  {p.name}
                  <span className="ml-2 text-xs opacity-70">{p._count?.tools || 0} tools</span>
                </button>
              ))}
            </div>
          )}

          {/* New Profile Form */}
          {showNewProfile && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">New Brand Profile</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={newProfile.name}
                    onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. ChromaStudio"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain URL *</label>
                  <input
                    type="url"
                    value={newProfile.domain}
                    onChange={e => setNewProfile(p => ({ ...p, domain: e.target.value }))}
                    placeholder="https://www.example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sitemap URL</label>
                  <input
                    type="url"
                    value={newProfile.sitemapUrl}
                    onChange={e => setNewProfile(p => ({ ...p, sitemapUrl: e.target.value }))}
                    placeholder="https://www.example.com/sitemap.xml"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProfile.isDefault}
                      onChange={e => setNewProfile(p => ({ ...p, isDefault: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Set as default profile</span>
                  </label>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newProfile.description}
                    onChange={e => setNewProfile(p => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description for LLM context (e.g. AI-powered creative platform)"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCreateProfile}
                  disabled={saving || !newProfile.name || !newProfile.domain}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creating...' : 'Create Profile'}
                </button>
                <button
                  onClick={() => setShowNewProfile(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Active Profile Details */}
          {activeProfile && (
            <>
              {/* Profile Info Card */}
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    {activeProfile.name}
                    {activeProfile.isDefault && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">Default</span>
                    )}
                  </h3>
                  <div className="flex gap-2">
                    {!activeProfile.isDefault && (
                      <button
                        onClick={() => handleUpdateProfile({ isDefault: true })}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={handleDeleteProfile}
                      className="text-xs text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Domain:</span>{' '}
                    <span className="text-gray-900 font-medium">{activeProfile.domain}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Sitemap:</span>{' '}
                    <span className="text-gray-900 font-medium">{activeProfile.sitemapUrl || 'Not configured'}</span>
                  </div>
                  {activeProfile.description && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Description:</span>{' '}
                      <span className="text-gray-900">{activeProfile.description}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tools Section */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Tools & Pages</h3>
                    <p className="text-sm text-gray-500">{activeProfile.tools?.length || 0} tools configured</p>
                  </div>
                  <div className="flex gap-2">
                    {activeProfile.sitemapUrl && (
                      <button
                        onClick={handleCrawlSitemap}
                        disabled={crawling}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 ${crawling ? 'animate-spin' : ''}`} />
                        {crawling ? 'Crawling...' : 'Crawl Sitemap'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowAddTool(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Tool
                    </button>
                  </div>
                </div>

                {/* Add Tool Form */}
                {showAddTool && (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-6 gap-3">
                      <input
                        type="text"
                        value={newTool.name}
                        onChange={e => setNewTool(t => ({ ...t, name: e.target.value }))}
                        placeholder="Tool name"
                        className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <input
                        type="text"
                        value={newTool.path}
                        onChange={e => setNewTool(t => ({ ...t, path: e.target.value }))}
                        placeholder="/path"
                        className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <select
                        value={newTool.category}
                        onChange={e => setNewTool(t => ({ ...t, category: e.target.value }))}
                        className="col-span-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="core-tool">Core Tool</option>
                        <option value="model">Model</option>
                        <option value="effect">Effect</option>
                        <option value="specialized">Specialized</option>
                      </select>
                      <input
                        type="text"
                        value={newTool.keywords}
                        onChange={e => setNewTool(t => ({ ...t, keywords: e.target.value }))}
                        placeholder="keyword1, keyword2"
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddTool}
                          disabled={saving || !newTool.name || !newTool.path}
                          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowAddTool(false)} className="px-3 py-2 text-gray-500 hover:text-gray-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Crawl Results */}
                {crawlResults && crawlResults.length > 0 && (
                  <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-blue-900">
                        Discovered {crawlResults.length} new pages from sitemap
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedCrawlTools(new Set(crawlResults.map(t => t.path)))}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => setSelectedCrawlTools(new Set())}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Deselect All
                        </button>
                        <button
                          onClick={handleImportCrawled}
                          disabled={saving || selectedCrawlTools.size === 0}
                          className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Import {selectedCrawlTools.size} Selected
                        </button>
                        <button
                          onClick={() => setCrawlResults(null)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {crawlResults.slice(0, 100).map((tool, idx) => (
                        <label key={`${tool.path}-${idx}`} className="flex items-center gap-2 py-1 text-sm cursor-pointer hover:bg-blue-100 px-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedCrawlTools.has(tool.path)}
                            onChange={e => {
                              const next = new Set(selectedCrawlTools);
                              if (e.target.checked) next.add(tool.path);
                              else next.delete(tool.path);
                              setSelectedCrawlTools(next);
                            }}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300"
                          />
                          <span className="text-blue-900 font-medium">{tool.name}</span>
                          <span className="text-blue-600">{tool.path}</span>
                          <span className="text-xs text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded">{tool.category}</span>
                        </label>
                      ))}
                      {crawlResults.length > 100 && (
                        <p className="text-xs text-blue-600 px-2">...and {crawlResults.length - 100} more</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Tools Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 text-left">Name</th>
                        <th className="px-6 py-3 text-left">Path</th>
                        <th className="px-6 py-3 text-left">Category</th>
                        <th className="px-6 py-3 text-left">Keywords</th>
                        <th className="px-6 py-3 text-center">Priority</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(activeProfile.tools || []).map(tool => (
                        <ToolRow
                          key={tool.id}
                          tool={tool}
                          isEditing={editingTool === tool.id}
                          onEdit={() => setEditingTool(tool.id)}
                          onCancelEdit={() => setEditingTool(null)}
                          onSave={(updates) => handleUpdateTool(tool.id, updates)}
                          onDelete={() => handleDeleteTool(tool.id)}
                        />
                      ))}
                      {(!activeProfile.tools || activeProfile.tools.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                            No tools configured. Add tools manually or crawl your sitemap.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {profiles.length === 0 && !showNewProfile && (
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Brand Profiles</h3>
              <p className="text-sm text-gray-500 mb-6">Create a brand profile to start integrating your platform into generated blogs.</p>
              <button
                onClick={() => setShowNewProfile(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Create Your First Profile
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ToolRow({
  tool,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  tool: BrandTool;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<BrandTool>) => void;
  onDelete: () => void;
}) {
  const [editData, setEditData] = useState({
    name: tool.name,
    path: tool.path,
    category: tool.category,
    keywords: tool.keywords.join(', '),
    priority: tool.priority,
  });

  if (isEditing) {
    return (
      <tr className="bg-yellow-50">
        <td className="px-6 py-2">
          <input
            type="text"
            value={editData.name}
            onChange={e => setEditData(d => ({ ...d, name: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </td>
        <td className="px-6 py-2">
          <input
            type="text"
            value={editData.path}
            onChange={e => setEditData(d => ({ ...d, path: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </td>
        <td className="px-6 py-2">
          <select
            value={editData.category}
            onChange={e => setEditData(d => ({ ...d, category: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="core-tool">Core Tool</option>
            <option value="model">Model</option>
            <option value="effect">Effect</option>
            <option value="specialized">Specialized</option>
          </select>
        </td>
        <td className="px-6 py-2">
          <input
            type="text"
            value={editData.keywords}
            onChange={e => setEditData(d => ({ ...d, keywords: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </td>
        <td className="px-6 py-2 text-center">
          <input
            type="number"
            min={1}
            max={10}
            value={editData.priority}
            onChange={e => setEditData(d => ({ ...d, priority: parseInt(e.target.value) || 5 }))}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
          />
        </td>
        <td className="px-6 py-2 text-right">
          <div className="flex justify-end gap-1">
            <button
              onClick={() =>
                onSave({
                  name: editData.name,
                  path: editData.path,
                  category: editData.category,
                  keywords: editData.keywords.split(',').map(k => k.trim()).filter(Boolean),
                  priority: editData.priority,
                })
              }
              className="p-1 text-green-600 hover:text-green-800"
            >
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onCancelEdit} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  const categoryColors: Record<string, string> = {
    'core-tool': 'bg-blue-50 text-blue-700',
    model: 'bg-purple-50 text-purple-700',
    effect: 'bg-green-50 text-green-700',
    specialized: 'bg-gray-100 text-gray-700',
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-3 text-sm font-medium text-gray-900">{tool.name}</td>
      <td className="px-6 py-3 text-sm text-gray-600 font-mono">{tool.path}</td>
      <td className="px-6 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[tool.category] || categoryColors.specialized}`}>
          {tool.category}
        </span>
      </td>
      <td className="px-6 py-3 text-sm text-gray-600 max-w-xs truncate">{tool.keywords.join(', ')}</td>
      <td className="px-6 py-3 text-sm text-gray-600 text-center">{tool.priority}</td>
      <td className="px-6 py-3 text-right">
        <div className="flex justify-end gap-1">
          <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-600">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
