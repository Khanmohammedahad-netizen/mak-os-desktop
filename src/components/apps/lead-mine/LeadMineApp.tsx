import React, { useEffect, useState } from 'react';
import { Search, MapPin, Building2, Upload, Plus, MoreVertical, Star, ExternalLink, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeadMineStore, Lead } from '@/stores/leadMineStore';

export const LeadMineApp = () => {
  const { fetchLeads } = useLeadMineStore();

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return (
    <div className="flex h-full w-full bg-bg-primary text-text-primary overflow-hidden">
      <LeftPanel />
      <RightPanel />
    </div>
  );
};

const LeftPanel = () => {
  const { runApifyScrape, runCompaniesHouseScrape, isScraping, scrapeProgress } = useLeadMineStore();
  const [apifyQuery, setApifyQuery] = useState('');
  const [apifyLimit, setApifyLimit] = useState(200);

  const [chQuery, setChQuery] = useState('');
  const [chDate, setChDate] = useState('');

  return (
    <div className="w-80 border-r border-gold/10 bg-bg-surface/30 p-4 flex flex-col gap-4 overflow-y-auto">
      <h2 className="text-xl font-display text-gold px-2">Lead Sources</h2>

      {/* Apify Card */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-white font-medium">
          <MapPin className="w-4 h-4 text-gold" />
          Apify Google Maps
        </div>
        <input 
          type="text" 
          placeholder="e.g. restaurants Dubai"
          className="bg-black border border-[#333] rounded-lg px-3 py-2 text-sm focus:border-gold/50 outline-none"
          value={apifyQuery}
          onChange={e => setApifyQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-text-secondary w-full">Max Results</label>
          <input 
            type="number" 
            className="bg-black border border-[#333] rounded-lg px-3 py-1.5 text-sm w-24 outline-none"
            value={apifyLimit}
            onChange={e => setApifyLimit(Number(e.target.value))}
          />
        </div>
        <button 
          onClick={() => runApifyScrape(apifyQuery, apifyLimit)}
          disabled={isScraping || !apifyQuery}
          className="w-full bg-gold text-black font-medium py-2 rounded-lg text-sm hover:bg-gold/90 disabled:opacity-50"
        >
          {isScraping ? 'Scraping...' : 'Start Scrape'}
        </button>
      </div>

      {/* Companies House Card */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-white font-medium">
          <Building2 className="w-4 h-4 text-gold" />
          UK Companies House
        </div>
        <input 
          type="text" 
          placeholder="e.g. software company London"
          className="bg-black border border-[#333] rounded-lg px-3 py-2 text-sm focus:border-gold/50 outline-none"
          value={chQuery}
          onChange={e => setChQuery(e.target.value)}
        />
        <input 
          type="date" 
          className="bg-black border border-[#333] rounded-lg px-3 py-2 text-sm focus:border-gold/50 outline-none text-text-secondary"
          value={chDate}
          onChange={e => setChDate(e.target.value)}
        />
        <button 
          onClick={() => runCompaniesHouseScrape(chQuery, chDate)}
          disabled={isScraping || !chQuery}
          className="w-full bg-gold text-black font-medium py-2 rounded-lg text-sm hover:bg-gold/90 disabled:opacity-50"
        >
          {isScraping ? 'Searching...' : 'Search Companies'}
        </button>
      </div>

      {/* Manual Add Card */}
      <div className="bg-[#111] border border-[#222] rounded-xl p-4 flex items-center justify-center cursor-pointer hover:border-gold/30 transition-colors group">
        <div className="flex items-center gap-2 text-text-secondary group-hover:text-white">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-medium">Add Manual Lead</span>
        </div>
      </div>

      {/* CSV Import Card */}
      <div className="bg-[#111] border border-[#222] border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gold/50 transition-colors">
        <Upload className="w-6 h-6 text-text-secondary" />
        <span className="text-sm text-text-secondary font-medium">Drop CSV to import</span>
      </div>

      {isScraping && (
        <div className="text-xs text-amber-400 text-center animate-pulse mt-2">
          {scrapeProgress}
        </div>
      )}
    </div>
  );
};

const RightPanel = () => {
  const { leads, isLoading, selectedLeads, toggleSelection, selectAll, clearSelection } = useLeadMineStore();

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-black border border-white/10 rounded-full flex items-center px-3 py-1.5">
            <Search className="w-4 h-4 text-text-secondary mr-2" />
            <input 
              type="text" 
              placeholder="Search leads..." 
              className="bg-transparent border-none outline-none text-sm w-48 text-white"
            />
          </div>
          <span className="text-xs text-text-secondary ml-2">{leads.length} leads</span>
        </div>
        
        <div className="flex items-center gap-2">
          <FilterPill label="All" active />
          <FilterPill label="New" />
          <FilterPill label="Audited" />
          <FilterPill label="Contacted" />
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-text-secondary">Loading leads...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs text-text-secondary uppercase tracking-wider">
                <th className="p-3 w-8"><input type="checkbox" onChange={selectAll} checked={selectedLeads.length > 0 && selectedLeads.length === leads.length} className="rounded border-white/20 bg-black" /></th>
                <th className="p-3">Business</th>
                <th className="p-3">Location</th>
                <th className="p-3">Rating</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Website</th>
                <th className="p-3 text-center">Score</th>
                <th className="p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} selected={selectedLeads.includes(lead.id)} onToggle={() => toggleSelection(lead.id)} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const LeadRow = ({ lead, selected, onToggle }: { lead: Lead, selected: boolean, onToggle: () => void }) => {
  return (
    <tr className={cn("border-b border-white/5 hover:bg-white/5 transition-colors", selected && "bg-white/5")}>
      <td className="p-3"><input type="checkbox" checked={selected} onChange={onToggle} className="rounded border-white/20 bg-black" /></td>
      <td className="p-3">
        <div className="font-medium text-white text-sm truncate max-w-[200px]">{lead.business_name}</div>
        <div className="text-xs text-gold/80 mt-0.5">{lead.category || lead.niche}</div>
      </td>
      <td className="p-3">
        <div className="text-sm text-white">{lead.city}</div>
        <div className="text-xs text-text-secondary">{lead.country}</div>
      </td>
      <td className="p-3">
        {lead.google_rating ? (
          <div className="flex items-center gap-1 text-sm text-white">
            <Star className="w-3.5 h-3.5 fill-gold text-gold" />
            {lead.google_rating} <span className="text-xs text-text-secondary">({lead.google_reviews_count})</span>
          </div>
        ) : <span className="text-xs text-text-secondary">-</span>}
      </td>
      <td className="p-3">
        {lead.phone_normalized ? (
          <div className="flex items-center gap-1.5 text-sm text-white">
            <div className={cn("w-1.5 h-1.5 rounded-full", lead.whatsapp_registered ? "bg-green-500" : "bg-gray-500")} />
            {lead.phone_normalized}
          </div>
        ) : <span className="text-xs text-text-secondary">-</span>}
      </td>
      <td className="p-3">
        {lead.website ? (
          <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:underline max-w-[150px] truncate">
            {lead.website.replace(/^https?:\/\//, '')} <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-400 rounded-md">No Website</span>
        )}
      </td>
      <td className="p-3 text-center">
        <span className={cn(
          "text-sm font-bold",
          lead.lead_score >= 61 ? "text-green-400" : lead.lead_score >= 31 ? "text-amber-400" : lead.lead_score > 0 ? "text-red-400" : "text-text-secondary"
        )}>{lead.lead_score}</span>
      </td>
      <td className="p-3">
        <span className="text-xs px-2 py-1 bg-white/10 text-white rounded-full capitalize">{lead.status}</span>
      </td>
      <td className="p-3 text-right">
        <button className="text-text-secondary hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};

const FilterPill = ({ label, active }: { label: string, active?: boolean }) => (
  <button className={cn(
    "text-xs px-3 py-1.5 rounded-full font-medium transition-colors border",
    active ? "bg-gold/20 border-gold/30 text-gold" : "bg-transparent border-white/10 text-text-secondary hover:text-white hover:border-white/20"
  )}>
    {label}
  </button>
);
