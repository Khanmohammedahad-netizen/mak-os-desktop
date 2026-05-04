import React, { useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Mail, Phone, MessageSquare, Calendar } from 'lucide-react';
import { useCommandCenterStore } from '@/stores/commandCenterStore';

export const CommandCenterApp = () => {
  const { metrics, fetchMetrics, isLoading } = useCommandCenterStore();

  useEffect(() => {
    fetchMetrics(30);
  }, [fetchMetrics]);

  const totals = useMemo(() => {
    return metrics.reduce((acc, curr) => ({
      leads_scraped: acc.leads_scraped + curr.leads_scraped,
      leads_audited: acc.leads_audited + curr.leads_audited,
      outreach_sent: acc.outreach_sent + curr.emails_sent + curr.whatsapp_sent + curr.calls_made,
      replies: acc.replies + curr.replies_received,
      meetings: acc.meetings + curr.meetings_booked,
    }), {
      leads_scraped: 0,
      leads_audited: 0,
      outreach_sent: 0,
      replies: 0,
      meetings: 0,
    });
  }, [metrics]);

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary text-text-primary overflow-y-auto p-8 gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-display text-gold flex items-center gap-3">
            <BarChart3 className="w-8 h-8" />
            Command Center
          </h1>
          <p className="text-text-secondary mt-2">Your 30-day client acquisition performance</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-text-secondary py-12">Loading metrics...</div>
      ) : (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-5 gap-6">
            <KpiCard icon={<Users />} label="Leads Scraped" value={totals.leads_scraped} />
            <KpiCard icon={<TrendingUp />} label="Leads Audited" value={totals.leads_audited} />
            <KpiCard icon={<Mail />} label="Outreach Sent" value={totals.outreach_sent} />
            <KpiCard icon={<MessageSquare />} label="Replies" value={totals.replies} color="text-amber-400" />
            <KpiCard icon={<Calendar />} label="Meetings Booked" value={totals.meetings} color="text-green-400" />
          </div>

          {/* Simple Chart / History Table */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-6">
            <h3 className="text-lg font-medium text-white mb-4">Daily Activity Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="border-b border-[#333] text-xs text-text-secondary uppercase tracking-wider">
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Scraped</th>
                    <th className="p-3 text-right">Audited</th>
                    <th className="p-3 text-right">Emails</th>
                    <th className="p-3 text-right">WhatsApp</th>
                    <th className="p-3 text-right">Calls</th>
                    <th className="p-3 text-right">Replies</th>
                    <th className="p-3 text-right">Meetings</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.length === 0 ? (
                    <tr><td colSpan={8} className="p-6 text-center text-text-secondary text-sm">No data available for the selected period.</td></tr>
                  ) : (
                    metrics.slice().reverse().map(row => (
                      <tr key={row.id} className="border-b border-[#222] hover:bg-white/5 transition-colors">
                        <td className="p-3 font-mono text-sm text-white">{row.date}</td>
                        <td className="p-3 text-right text-sm text-text-secondary">{row.leads_scraped}</td>
                        <td className="p-3 text-right text-sm text-text-secondary">{row.leads_audited}</td>
                        <td className="p-3 text-right text-sm text-text-secondary">{row.emails_sent}</td>
                        <td className="p-3 text-right text-sm text-text-secondary">{row.whatsapp_sent}</td>
                        <td className="p-3 text-right text-sm text-text-secondary">{row.calls_made}</td>
                        <td className="p-3 text-right text-sm text-amber-400/80">{row.replies_received}</td>
                        <td className="p-3 text-right text-sm text-green-400/80 font-bold">{row.meetings_booked}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const KpiCard = ({ icon, label, value, color = "text-white" }: { icon: React.ReactNode, label: string, value: number, color?: string }) => (
  <div className="bg-[#111] border border-[#222] rounded-xl p-6 flex flex-col gap-4">
    <div className="flex items-center gap-3 text-text-secondary">
      {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
      <span className="text-sm font-medium">{label}</span>
    </div>
    <div className={`text-4xl font-display font-bold ${color}`}>
      {value}
    </div>
  </div>
);
