import {
  Activity, AlertTriangle, Ban,
  CheckCircle, ChevronDown, ChevronLeft,
  ChevronRight, ChevronUp, Download, ExternalLink, Eye, FileText, Flag, Globe,
  Image, LogOut, Megaphone, Menu, RefreshCw, Search,
  Shield, Trash2,
  TrendingUp, UserCheck, Users, Wifi, X, XCircle, Zap
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { AdminCommunity, AdminEvent, AdminPost, AdminReport, AdminStory, AdminUser } from '../types';

function timeAgo(ts: number | Date | null | undefined): string {
  if (!ts) return '-';
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString();
}

const Avatar = React.memo(function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return src ? (
    <img src={src} alt={name} loading="lazy" className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
});

const StatCard = React.memo(function StatCard({ icon, label, value, sub, color, onClick }: { icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:border-slate-600 hover:bg-slate-800/60 active:scale-[0.98] transition-all' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-extrabold text-white">{value}</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
});

const FilterPill = React.memo(function FilterPill({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${active ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
      {label}
      {count !== undefined && count > 0 && <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? 'bg-violet-500' : 'bg-slate-700 text-slate-300'}`}>{count}</span>}
    </button>
  );
});

// ── SVG Chart Components ─────────────────────────────────────────────────────
type ChartRow = { date: string; signups: number; posts: number; reports: number; communities: number; stories: number };

/** Sparkline used inside KPI cards */
const Sparkline = React.memo(function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 80; const H = 28;
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const scaleX = (i: number) => (i / (values.length - 1 || 1)) * W;
  const scaleY = (v: number) => H - 2 - ((v / max) * (H - 4));
  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`).join(' ');
  const area = `${d} L${W},${H} L0,${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
});

/** Smooth area chart — primary trend view */
const AreaLineChart = React.memo(function AreaLineChart({ data, keys }: {
  data: ChartRow[];
  keys: { key: keyof ChartRow; color: string; label: string }[];
}) {
  const W = 600; const H = 180; const PAD = { t: 16, r: 16, b: 32, l: 36 };
  const iW = W - PAD.l - PAD.r; const iH = H - PAD.t - PAD.b;
  const allVals = data.flatMap(d => keys.map(k => d[k.key] as number));
  const max = Math.max(...allVals, 1);
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((i / 4) * max));
  const scaleY = (v: number) => PAD.t + iH - (v / max) * iH;
  const scaleX = (i: number) => PAD.l + (i / (data.length - 1 || 1)) * iW;

  const smooth = (key: keyof ChartRow) => {
    if (data.length < 2) return '';
    return data.map((d, i) => {
      if (i === 0) return `M${scaleX(0).toFixed(1)},${scaleY(d[key] as number).toFixed(1)}`;
      const x0 = scaleX(i - 1); const y0 = scaleY(data[i - 1]![key] as number);
      const x1 = scaleX(i);     const y1 = scaleY(d[key] as number);
      const cpx = (x0 + x1) / 2;
      return `C${cpx.toFixed(1)},${y0.toFixed(1)} ${cpx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
    }).join(' ');
  };

  const area = (key: keyof ChartRow, _color: string) => {
    const bottom = PAD.t + iH;
    return `${smooth(key)} L${scaleX(data.length - 1).toFixed(1)},${bottom} L${PAD.l},${bottom} Z`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        {keys.map(k => (
          <linearGradient key={k.key as string} id={`ag-${k.key as string}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={k.color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={k.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>
      {/* grid */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={PAD.l} y1={scaleY(v)} x2={W - PAD.r} y2={scaleY(v)} stroke="#1e293b" strokeWidth="1" />
          <text x={PAD.l - 6} y={scaleY(v) + 4} textAnchor="end" fontSize="9" fill="#475569">{v}</text>
        </g>
      ))}
      {/* areas */}
      {keys.map(k => (
        <path key={`area-${k.key as string}`} d={area(k.key, k.color)} fill={`url(#ag-${k.key as string})`} />
      ))}
      {/* lines */}
      {keys.map(k => (
        <path key={`line-${k.key as string}`} d={smooth(k.key)} fill="none" stroke={k.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {/* dots + tooltips on every 5th */}
      {data.map((d, i) => (
        <g key={i}>
          {i % 5 === 0 && (
            <text x={scaleX(i)} y={H - 6} textAnchor="middle" fontSize="8" fill="#475569">{d.date.slice(5)}</text>
          )}
          {keys.map(k => (
            <circle key={k.key as string} cx={scaleX(i)} cy={scaleY(d[k.key] as number)} r="3" fill={k.color} stroke="#0f172a" strokeWidth="1.5">
              <title>{d.date} · {k.label}: {d[k.key]}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
});

/** Rounded bar chart */
const BarChart = React.memo(function BarChart({ data, valueKey, color }: { data: ChartRow[]; valueKey: keyof ChartRow; color: string }) {
  const W = 600; const H = 110; const PAD = { t: 8, r: 8, b: 26, l: 32 };
  const iW = W - PAD.l - PAD.r; const iH = H - PAD.t - PAD.b;
  const values = data.map(d => d[valueKey] as number);
  const max = Math.max(...values, 1);
  const barW = Math.max(4, iW / values.length - 2);
  const yTicks = [0, Math.round(max * 0.5), max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {yTicks.map((v, i) => {
        const y = PAD.t + iH - (v / max) * iH;
        return (
          <g key={i}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#1e293b" strokeWidth="1" />
            <text x={PAD.l - 4} y={y + 3} textAnchor="end" fontSize="8.5" fill="#475569">{v}</text>
          </g>
        );
      })}
      {values.map((v, i) => {
        const h = Math.max((v / max) * iH, 2);
        const x = PAD.l + i * (iW / values.length) + 1;
        const y = PAD.t + iH - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx="2.5" fill={color} opacity={v === 0 ? 0.2 : 0.85} />
            {i % 5 === 0 && (
              <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize="7.5" fill="#475569">{data[i]?.date.slice(5)}</text>
            )}
            <title>{data[i]?.date}: {v}</title>
          </g>
        );
      })}
    </svg>
  );
});

/** Donut chart with legend */
const DonutChart = React.memo(function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 42; const cx = 64; const cy = 64;
  let angle = -Math.PI / 2;
  const arcs = segments.map(seg => {
    const a = Math.max((seg.value / total) * 2 * Math.PI, 0.02);
    const x1 = cx + R * Math.cos(angle);
    const y1 = cy + R * Math.sin(angle);
    angle += a;
    const x2 = cx + R * Math.cos(angle);
    const y2 = cy + R * Math.sin(angle);
    const large = a > Math.PI ? 1 : 0;
    return { ...seg, d: `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R},0,${large},1,${x2.toFixed(2)},${y2.toFixed(2)} Z`, pct: Math.round((seg.value / total) * 100) };
  });
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 128 128" className="w-28 h-28 flex-shrink-0">
        <circle cx={cx} cy={cy} r={R + 2} fill="#1e293b" />
        {arcs.map((arc, i) => (
          <path key={i} d={arc.d} fill={arc.color}>
            <title>{arc.label}: {arc.value} ({arc.pct}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={R * 0.58} fill="#0f172a" />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">{total.toLocaleString()}</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill="#64748b">TOTAL</text>
      </svg>
      <div className="space-y-2.5 flex-1">
        {arcs.map((arc, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: arc.color }} />
            <span className="text-slate-300 text-xs flex-1">{arc.label}</span>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 rounded-full" style={{ width: `${Math.max(arc.pct, 4)}px`, background: arc.color, opacity: 0.7 }} />
              <span className="text-white font-bold text-xs w-8 text-right">{arc.value.toLocaleString()}</span>
              <span className="text-slate-600 text-xs w-7">{arc.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});


// ── Modals ────────────────────────────────────────────────────────────────────
const DeleteUserModal = React.memo(function DeleteUserModal({ user, onConfirm, onCancel }: { user: AdminUser; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-950 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
          <div><h3 className="text-white font-bold text-base">Permanently Delete User</h3><p className="text-slate-400 text-xs">This cannot be undone</p></div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 mb-5 flex items-center gap-3">
          <Avatar src={user.photoURL} name={user.displayName} size={40} />
          <div><p className="text-white font-semibold text-sm">{user.displayName}</p><p className="text-slate-400 text-xs">{user.email}</p></div>
        </div>
        <p className="text-slate-300 text-sm mb-5 leading-relaxed">This will permanently delete the account and <span className="text-red-400 font-semibold">all</span> associated data: <span className="text-slate-200">{user.postCount} posts, {user.storyCount} stories, all messages, notifications, and friend connections.</span></p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete Forever</button>
        </div>
      </div>
    </div>
  );
});

const DeleteCommunityModal = React.memo(function DeleteCommunityModal({ community, onConfirm, onCancel }: { community: AdminCommunity; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-950 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
          <div><h3 className="text-white font-bold text-base">Delete Community</h3><p className="text-slate-400 text-xs">Cannot be undone</p></div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 mb-5">
          <p className="text-white font-semibold text-sm">{community.name}</p>
          <p className="text-slate-400 text-xs mt-1">{community.memberCount} members · {community.isPrivate ? 'Private' : 'Public'}</p>
        </div>
        <p className="text-slate-300 text-sm mb-5">This will permanently remove the community and all its messages.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"><Trash2 className="w-4 h-4" /> Delete Community</button>
        </div>
      </div>
    </div>
  );
});

const BroadcastModal = React.memo(function BroadcastModal({ userCount, onSend, onCancel, sending }: {
  userCount: number; onSend: (title: string, message: string, segment: string) => void; onCancel: () => void; sending: boolean;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [segment, setSegment] = useState('all');
  const segmentLabels: Record<string, string> = { all: `All ${userCount.toLocaleString()} users`, new: 'New users (last 7 days)', flagged: 'Flagged users', suspended: 'Suspended users' };
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-950 flex items-center justify-center"><Megaphone className="w-5 h-5 text-violet-400" /></div>
            <div><h3 className="text-white font-bold text-base">Broadcast Announcement</h3><p className="text-slate-400 text-xs">Target: {segmentLabels[segment]}</p></div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Audience</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(segmentLabels).map(([k, v]) => (
                <button key={k} onClick={() => setSegment(k)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${segment === k ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{v}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Title (optional)</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Orbyt" maxLength={80} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder-slate-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Message <span className="text-red-400">*</span></label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your announcement here..." maxLength={500} rows={4} className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder-slate-500 resize-none" />
            <p className="text-slate-600 text-xs mt-1 text-right">{message.length}/500</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
          <button onClick={() => onSend(title, message, segment)} disabled={!message.trim() || sending} className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Megaphone className="w-4 h-4" />} Send
          </button>
        </div>
      </div>
    </div>
  );
});

const ReportDetailModal = React.memo(function ReportDetailModal({ report, users, onResolve, onDismiss, onDeleteTarget, onDeleteReporter, onViewProfile, onClose }: {
  report: AdminReport;
  users: AdminUser[];
  onResolve: () => void;
  onDismiss: () => void;
  onDeleteTarget: () => void;
  onDeleteReporter: () => void;
  onViewProfile: (uid: string) => void;
  onClose: () => void;
}) {
  const reporterUser = users.find(u => u.uid === report.reporterUid);
  const targetUser = users.find(u => u.uid === report.targetUid);

  const TYPE_COLORS: Record<string, string> = {
    user:      'bg-violet-950 text-violet-400 border-violet-900',
    post:      'bg-blue-950 text-blue-400 border-blue-900',
    story:     'bg-cyan-950 text-cyan-400 border-cyan-900',
    meetup:    'bg-orange-950 text-orange-400 border-orange-900',
    community: 'bg-emerald-950 text-emerald-400 border-emerald-900',
  };
  const reportType = report.type || 'post';
  const typeColor = TYPE_COLORS[reportType] ?? 'bg-slate-800 text-slate-400 border-slate-700';

  const hasContent = !!(
    report.postContent || report.postImageURL ||
    report.storyImageURL || report.storyCaption ||
    report.communityName
  );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-red-950 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-red-400" /></div>
            <div>
              <h3 className="text-white font-bold">Report Detail</h3>
              <p className="text-slate-500 text-xs">{timeAgo(report.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${typeColor}`}>{reportType.toUpperCase()}</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
              report.status === 'pending' ? 'bg-red-950 text-red-400 border-red-900' :
              report.status === 'resolved' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>{report.status.toUpperCase()}</span>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 ml-2"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Reason banner */}
          <div className="bg-red-950/50 border border-red-900 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-red-400 font-semibold uppercase tracking-wider">Reason for Report</p>
              <p className="text-white font-bold text-sm mt-0.5">{report.reason}</p>
            </div>
          </div>

          {/* Two-column profile cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reporter */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Reporter (filed this report)</p>
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={report.reporterPhoto ?? undefined} name={report.reporterName} size={44} />
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{report.reporterName}</p>
                  <p className="text-slate-500 text-xs font-mono truncate">{report.reporterUid.slice(0, 16)}…</p>
                </div>
              </div>
              {reporterUser && (
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                  <span>{reporterUser.postCount} posts</span>
                  <span>·</span>
                  <span>{reporterUser.reportCount} reports made</span>
                  <span>·</span>
                  <span className={reporterUser.isSuspended ? 'text-orange-400 font-semibold' : 'text-emerald-400 font-semibold'}>{reporterUser.isSuspended ? 'Suspended' : 'Active'}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => onViewProfile(report.reporterUid)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-2 rounded-xl transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Profile
                </button>
                {report.status === 'pending' && (
                  <button
                    onClick={onDeleteReporter}
                    className="flex items-center justify-center gap-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-800 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Target */}
            <div className="bg-slate-800 border border-red-900/40 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-500/70 uppercase tracking-wider mb-3">
                {reportType === 'community' ? 'Reported Room' : reportType === 'user' ? 'Reported User' : 'Content Owner'}
              </p>
              {reportType === 'community' && report.communityName ? (
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-900/40 border border-emerald-700/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 text-lg font-bold">#</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{report.communityName}</p>
                    {report.communityDescription && <p className="text-slate-500 text-xs truncate">{report.communityDescription}</p>}
                    <p className="text-slate-600 text-xs font-mono truncate">{report.communityId?.slice(0, 16)}…</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar src={report.targetPhoto ?? undefined} name={report.targetName} size={44} />
                    <div className="min-w-0">
                      <p className="text-white font-bold text-sm truncate">{report.targetName}</p>
                      <p className="text-slate-500 text-xs font-mono truncate">{(report.targetUid ?? '').slice(0, 16)}…</p>
                    </div>
                  </div>
                  {targetUser && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                      <span>{targetUser.postCount} posts</span>
                      <span>·</span>
                      <span className={targetUser.reportCount >= 3 ? 'text-red-400 font-bold' : targetUser.reportCount > 0 ? 'text-amber-400' : 'text-slate-500'}>{targetUser.reportCount} report{targetUser.reportCount !== 1 ? 's' : ''} against them</span>
                      <span>·</span>
                      <span className={targetUser.isSuspended ? 'text-orange-400 font-semibold' : 'text-emerald-400 font-semibold'}>{targetUser.isSuspended ? 'Suspended' : 'Active'}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {report.targetUid && (
                      <button
                        onClick={() => onViewProfile(report.targetUid!)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold py-2 rounded-xl transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> View Profile
                      </button>
                    )}
                    {report.status === 'pending' && report.targetUid && (
                      <button
                        onClick={onDeleteTarget}
                        className="flex items-center justify-center gap-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-800 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Reported Content — type-specific */}
          {reportType === 'user' && (
            <div className="bg-violet-950/30 border border-violet-900/40 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-violet-400/70 uppercase tracking-wider mb-1">Report Type</p>
              <p className="text-slate-300 text-sm">Profile / account report — no specific content attached.</p>
            </div>
          )}

          {(reportType === 'post' || reportType === 'meetup') && (report.postContent || report.postImageURL) && (
            <div className="bg-slate-800 border border-amber-900/40 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-3">
                {reportType === 'meetup' ? 'Reported Meetup' : 'Reported Post'}
              </p>
              {report.postImageURL && (
                <img src={report.postImageURL} alt="Reported post" className="w-full max-h-64 object-cover rounded-xl mb-3 border border-slate-700" />
              )}
              {report.postContent && <p className="text-slate-300 text-sm leading-relaxed">{report.postContent}</p>}
            </div>
          )}

          {reportType === 'story' && (
            <div className="bg-slate-800 border border-cyan-900/40 rounded-xl p-4">
              <p className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider mb-3">Reported Story</p>
              {report.storyImageURL && (
                <img src={report.storyImageURL} alt="Reported story" className="w-full max-h-64 object-cover rounded-xl mb-3 border border-slate-700" />
              )}
              {report.storyCaption && <p className="text-slate-300 text-sm leading-relaxed">{report.storyCaption}</p>}
              {!report.storyImageURL && !report.storyCaption && (
                <p className="text-slate-500 text-sm italic">Story content unavailable (may have expired)</p>
              )}
            </div>
          )}

          {reportType === 'community' && (
            <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-emerald-400/70 uppercase tracking-wider mb-1">Reported Room</p>
              <p className="text-white font-semibold">{report.communityName ?? 'Unknown room'}</p>
              {report.communityDescription && <p className="text-slate-400 text-sm mt-1">{report.communityDescription}</p>}
            </div>
          )}

          {/* Fallback for legacy reports with no type */}
          {!hasContent && reportType !== 'user' && reportType !== 'community' && reportType !== 'story' && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
              <p className="text-slate-500 text-sm italic">No content preview available for this report.</p>
            </div>
          )}

          {/* Actions */}
          {report.status === 'pending' && (
            <div className="border-t border-slate-800 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Actions</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={onResolve} className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors">
                  <CheckCircle className="w-4 h-4" /> Resolve — No Action
                </button>
                <button onClick={onDismiss} className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold py-2.5 rounded-xl transition-colors">
                  <XCircle className="w-4 h-4" /> Dismiss
                </button>
              </div>
            </div>
          )}
          {report.status !== 'pending' && (
            <p className="text-center text-slate-600 text-xs pt-2">This report was {report.status} and is now closed.</p>
          )}
        </div>
      </div>
    </div>
  );
});

type PeekMessage = { _id: string; uid: string; senderName: string; senderPhoto: string | null; text: string; mediaType: string | null; mediaUrl: string | null; createdAt: number };
type PeekMember = { uid: string; displayName: string; photoURL: string; jobRole: string; isSuspended: boolean };
type PeekData = { community: AdminCommunity & { messageCount: number; ownerUid: string }; messages: PeekMessage[]; members: PeekMember[] };

function CommunityPeekModal({ communityId, token, onClose, onViewMember }: {
  communityId: string; token: string; onClose: () => void; onViewMember: (uid: string) => void;
}) {
  const [peekData, setPeekData] = useState<PeekData | null>(null);
  const [peekLoading, setPeekLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'members' | 'overview'>('messages');

  useEffect(() => {
    setPeekLoading(true);
    api.admin.peekCommunity(token, communityId)
      .then(d => setPeekData(d as PeekData))
      .catch(() => {})
      .finally(() => setPeekLoading(false));
  }, [communityId, token]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${peekData?.community.isFlagged ? 'bg-amber-950' : 'bg-emerald-950'}`}>
              {peekData?.community.isFlagged ? <Flag className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
            </div>
            <div>
              <h3 className="text-white font-bold">{peekData?.community.name ?? 'Community'}</h3>
              <p className="text-slate-500 text-xs flex items-center gap-1"><Eye className="w-3 h-3" /> Admin read-only peek</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        {/* Tab bar */}
        <div className="flex gap-2 px-6 py-3 border-b border-slate-800 flex-shrink-0">
          {(['messages', 'members', 'overview'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeTab === t ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {t}{t === 'messages' && peekData ? ` (${peekData.messages.length})` : ''}{t === 'members' && peekData ? ` (${peekData.members.length})` : ''}
            </button>
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {peekLoading ? (
            <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div>
          ) : !peekData ? (
            <div className="text-center text-slate-500 py-16">Failed to load community data</div>
          ) : activeTab === 'messages' ? (
            peekData.messages.length === 0 ? <div className="text-center text-slate-500 py-16">No messages yet</div> : (
              <div className="space-y-3">
                {peekData.messages.map(msg => (
                  <div key={msg._id} className="flex items-start gap-3">
                    <Avatar src={msg.senderPhoto ?? undefined} name={msg.senderName} size={32} />
                    <div className="flex-1 min-w-0 bg-slate-800/50 rounded-xl px-3 py-2">
                      <div className="flex items-baseline gap-2 mb-1">
                        <button onClick={() => onViewMember(msg.uid)} className="text-white font-semibold text-sm hover:text-violet-400 transition-colors">{msg.senderName}</button>
                        <span className="text-slate-600 text-xs">{timeAgo(msg.createdAt)}</span>
                      </div>
                      {msg.text && <p className="text-slate-300 text-sm leading-relaxed">{msg.text}</p>}
                      {msg.mediaUrl && (
                        /\.(jpg|jpeg|png|gif|webp)/i.test(msg.mediaUrl) || msg.mediaType === 'image'
                          ? <img src={msg.mediaUrl} alt="" className="mt-2 max-h-48 rounded-xl border border-slate-700 object-cover" />
                          : <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="mt-1 text-violet-400 text-xs underline inline-block">View attachment</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'members' ? (
            peekData.members.length === 0 ? <div className="text-center text-slate-500 py-16">No members</div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {peekData.members.map(m => (
                  <button key={m.uid} onClick={() => onViewMember(m.uid)}
                    className="flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-4 py-3 transition-colors text-left group">
                    <Avatar src={m.photoURL} name={m.displayName} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-semibold text-sm truncate group-hover:text-violet-300 transition-colors">{m.displayName}</p>
                      {m.jobRole && <p className="text-slate-500 text-xs truncate">{m.jobRole}</p>}
                      {m.isSuspended && <span className="text-xs text-orange-400 font-medium">Suspended</span>}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )
          ) : (
            // Overview tab
            <div className="space-y-4">
              {peekData.community.description && (
                <div className="bg-slate-800 rounded-xl p-4"><p className="text-slate-300 text-sm">{peekData.community.description}</p></div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Members', value: peekData.community.memberCount, color: 'text-white' },
                  { label: 'Messages', value: peekData.community.messageCount, color: 'text-blue-400' },
                  { label: 'Reports', value: peekData.community.reportCount, color: peekData.community.reportCount > 0 ? 'text-red-400' : 'text-slate-500' },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs mb-1">Type</p><p className="text-white font-medium text-sm">{peekData.community.isPrivate ? 'Private' : 'Public'}</p></div>
                <div className="bg-slate-800 rounded-xl p-4"><p className="text-slate-400 text-xs mb-1">Created</p><p className="text-white font-medium text-sm">{timeAgo(peekData.community.createdAt)}</p></div>
              </div>
              {peekData.community.tags.length > 0 && (
                <div className="bg-slate-800 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1.5">{peekData.community.tags.map(tag => <span key={tag} className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">{tag}</span>)}</div>
                </div>
              )}
              {peekData.community.reportCount > 0 && (
                <div className="bg-red-950 border border-red-900 rounded-xl p-4 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div>
                    <p className="text-red-400 font-bold text-sm">{peekData.community.reportCount} pending report{peekData.community.reportCount !== 1 ? 's' : ''}</p>
                    <p className="text-red-600 text-xs mt-0.5">This community has been reported by users</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const UserDrawer = React.memo(function UserDrawer({ user, onClose, onSuspend, onDelete, suspending }: {
  user: AdminUser; onClose: () => void; onSuspend: (u: AdminUser) => void; onDelete: (u: AdminUser) => void; suspending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-900 border-l border-slate-800 w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-white font-bold text-base">User Details</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-6 border-b border-slate-800">
          <div className="flex items-center gap-4 mb-4">
            <Avatar src={user.photoURL} name={user.displayName} size={64} />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-lg leading-tight">{user.displayName}</p>
                <a href={`/app/profile/${user.uid}`} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-violet-400 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></a>
              </div>
              <p className="text-slate-400 text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${user.authType === 'google' ? 'border-blue-700 text-blue-400 bg-blue-950' : 'border-slate-700 text-slate-400 bg-slate-800'}`}>{user.authType === 'google' ? 'Google' : 'Email'}</span>
                {user.isSuspended && <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-orange-800 text-orange-400 bg-orange-950">Suspended</span>}
              </div>
            </div>
          </div>
          {user.bio && <p className="text-slate-300 text-sm leading-relaxed mb-3">{user.bio}</p>}
          {user.jobRole && <p className="text-slate-500 text-xs"><span className="text-slate-400 font-medium">Role:</span> {user.jobRole}</p>}
          <p className="text-slate-700 text-xs font-mono mt-2 break-all">UID: {user.uid}</p>
        </div>
        <div className="px-6 py-5 border-b border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Activity</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Posts', value: user.postCount, color: 'text-blue-400' },
              { label: 'Stories', value: user.storyCount, color: 'text-cyan-400' },
              { label: 'Friends', value: user.friendCount, color: 'text-emerald-400' },
              { label: 'Reports', value: user.reportCount, color: user.reportCount >= 3 ? 'text-red-400' : user.reportCount > 0 ? 'text-amber-400' : 'text-slate-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800 rounded-xl p-3">
                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-5 border-b border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Account Info</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Joined</dt><dd className="text-slate-300">{user.createdAt ? new Date(user.createdAt as number).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Account Age</dt><dd className="text-slate-300">{timeAgo(user.createdAt as number)}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className={user.isSuspended ? 'text-orange-400 font-semibold' : 'text-emerald-400 font-semibold'}>{user.isSuspended ? 'Suspended' : 'Active'}</dd></div>
          </dl>
        </div>
        <div className="px-6 py-5 mt-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Actions</p>
          <div className="space-y-2">
            <button onClick={() => onSuspend(user)} disabled={suspending} className={`w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl transition-colors text-sm ${user.isSuspended ? 'bg-emerald-900/50 hover:bg-emerald-900 text-emerald-400 border border-emerald-800' : 'bg-orange-900/50 hover:bg-orange-900 text-orange-400 border border-orange-800'}`}>
              {user.isSuspended ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              {user.isSuspended ? 'Unsuspend User' : 'Suspend User'}
            </button>
            <button onClick={() => onDelete(user)} className="w-full flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-800 font-semibold py-2.5 rounded-xl transition-colors text-sm"><Trash2 className="w-4 h-4" /> Permanently Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
});

type Tab = 'users' | 'posts' | 'stories' | 'events' | 'reports' | 'communities' | 'analytics' | 'audit' | 'settings';
type SortField = 'createdAt' | 'reportCount' | 'postCount' | 'displayName';
type UserFilter = 'all' | 'flagged' | 'suspended';
type ReportFilter = 'all' | 'pending' | 'resolved' | 'dismissed';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('admin_token') || '';

  const [tab, setTab] = useState<Tab>('users');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [communities, setCommunities] = useState<AdminCommunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('reportCount');
  const [sortAsc, setSortAsc] = useState(false);
  const [userFilter, setUserFilter] = useState<UserFilter>('all');
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(25);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [reportFilter, setReportFilter] = useState<ReportFilter>('pending');
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);

  const [deleteComTarget, setDeleteComTarget] = useState<AdminCommunity | null>(null);
  const [deletingCom, setDeletingCom] = useState(false);
  const [comSearch, setComSearch] = useState('');
  const [comFilter, setComFilter] = useState<'all' | 'flagged'>('all');
  const [peekTarget, setPeekTarget] = useState<AdminCommunity | null>(null);
  const [flaggingCom, setFlaggingCom] = useState<string | null>(null);

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPages, setPostsPages] = useState(1);
  const [postsFilter, setPostsFilter] = useState<'all' | 'flagged'>('all');
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkThreshold, setBulkThreshold] = useState(3);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  // Stories
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesPage, setStoriesPage] = useState(1);
  const [storiesTotal, setStoriesTotal] = useState(0);
  const [storiesPages, setStoriesPages] = useState(1);
  const [storiesSearch, setStoriesSearch] = useState('');
  const [deletingStory, setDeletingStory] = useState<string | null>(null);
  const [showDeleteAllStories, setShowDeleteAllStories] = useState(false);
  const [deletingAllStories, setDeletingAllStories] = useState(false);

  // Events
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsPages, setEventsPages] = useState(1);
  const [eventsSearch, setEventsSearch] = useState('');
  const [deletingEvent, setDeletingEvent] = useState<string | null>(null);
  const [bulkDeletingEvents, setBulkDeletingEvents] = useState(false);
  const [bulkEventsThreshold, setBulkEventsThreshold] = useState(3);
  const [showBulkEventsConfirm, setShowBulkEventsConfirm] = useState(false);

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Audit log
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditSearch, setAuditSearch] = useState('');

  // Settings
  const [autoSuspendThreshold, setAutoSuspendThreshold] = useState(0);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { if (!token) navigate('/admin', { replace: true }); }, [token, navigate]);

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError(null);
    try {
      const [statsData, usersData, reportsData, comData] = await Promise.all([
        api.admin.getStats(token),
        api.admin.getUsers(token),
        api.admin.getReports(token),
        api.admin.getCommunities(token),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setReports(reportsData.reports);
      setCommunities(comData.communities);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
      if (e?.message?.includes('Forbidden')) { sessionStorage.removeItem('admin_token'); navigate('/admin', { replace: true }); }
    } finally { setLoading(false); }
  }, [token, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchPosts = useCallback(async (page = 1, flagged = false, _search = '') => {
    if (!token) return;
    setPostsLoading(true);
    try {
      const data = await api.admin.getPosts(token, page, flagged);
      setPosts(data.posts); setPostsTotal(data.total); setPostsPages(data.pages); setPostsPage(page);
    } catch (e: any) { showToast(e?.message || 'Failed to load posts', 'error'); }
    finally { setPostsLoading(false); }
  }, [token, showToast]);

  const fetchStories = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setStoriesLoading(true);
    try {
      const data = await api.admin.getStories(token, page, search);
      setStories(data.stories); setStoriesTotal(data.total); setStoriesPages(data.pages); setStoriesPage(page);
    } catch (e: any) { showToast(e?.message || 'Failed to load stories', 'error'); }
    finally { setStoriesLoading(false); }
  }, [token, showToast]);

  const fetchEvents = useCallback(async (page = 1, search = '') => {
    if (!token) return;
    setEventsLoading(true);
    try {
      const data = await api.admin.getEvents(token, page, search);
      setEvents(data.events); setEventsTotal(data.total); setEventsPages(data.pages); setEventsPage(page);
    } catch (e: any) { showToast(e?.message || 'Failed to load events', 'error'); }
    finally { setEventsLoading(false); }
  }, [token, showToast]);

  useEffect(() => { if (tab === 'posts') fetchPosts(1, postsFilter === 'flagged'); }, [tab, postsFilter, fetchPosts]);
  useEffect(() => { if (tab === 'stories') fetchStories(1, ''); }, [tab, fetchStories]);
  useEffect(() => { if (tab === 'events') fetchEvents(1, ''); }, [tab, fetchEvents]);

  useEffect(() => {
    if (tab !== 'analytics' || analytics) return;
    setAnalyticsLoading(true);
    api.admin.getAnalytics(token).then(d => setAnalytics(d)).catch(e => showToast(e?.message || 'Failed', 'error')).finally(() => setAnalyticsLoading(false));
  }, [tab, token, analytics, showToast]);

  useEffect(() => {
    if (tab !== 'audit') return;
    setAuditLoading(true);
    api.admin.getAuditLogs(token, 300).then(d => setAuditLogs(d.logs)).catch(e => showToast(e?.message || 'Failed', 'error')).finally(() => setAuditLoading(false));
  }, [tab, token, showToast]);

  useEffect(() => {
    if (tab !== 'settings') return;
    setSettingsLoading(true);
    api.admin.getSettings(token).then(d => setAutoSuspendThreshold(d.autoSuspendThreshold)).catch(() => {}).finally(() => setSettingsLoading(false));
  }, [tab, token]);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.admin.deleteUser(token, deleteTarget.uid);
      setUsers(prev => prev.filter(u => u.uid !== deleteTarget.uid));
      setStats((prev: any) => prev ? { ...prev, users: prev.users - 1 } : prev);
      showToast(`${deleteTarget.displayName} deleted permanently.`, 'success');
      setSelectedUser(null);
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const toggleSuspend = async (user: AdminUser) => {
    setSuspending(user.uid);
    try {
      const res = await api.admin.suspendUser(token, user.uid);
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, isSuspended: res.isSuspended } : u));
      if (selectedUser?.uid === user.uid) setSelectedUser(prev => prev ? { ...prev, isSuspended: res.isSuspended } : null);
      showToast(res.isSuspended ? `${user.displayName} suspended.` : `${user.displayName} unsuspended.`, 'success');
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setSuspending(null); }
  };

  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      await api.admin.resolveReport(token, id, status);
      setReports(prev => prev.map(r => r._id === id ? { ...r, status } : r));
      setSelectedReport(prev => prev?._id === id ? { ...prev, status } : prev);
      showToast(`Report ${status}.`, 'success');
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
  };

  const confirmDeleteCommunity = async () => {
    if (!deleteComTarget) return;
    setDeletingCom(true);
    try {
      await api.admin.deleteCommunity(token, deleteComTarget.id);
      setCommunities(prev => prev.filter(c => c.id !== deleteComTarget.id));
      setStats((prev: any) => prev ? { ...prev, communities: prev.communities - 1 } : prev);
      showToast(`"${deleteComTarget.name}" deleted.`, 'success');
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setDeletingCom(false); setDeleteComTarget(null); }
  };

  const handleFlagCommunity = async (community: AdminCommunity) => {
    setFlaggingCom(community.id);
    try {
      const res = await api.admin.flagCommunity(token, community.id);
      setCommunities(prev => prev.map(c => c.id === community.id ? { ...c, isFlagged: res.isFlagged } : c));
      showToast(res.isFlagged ? `“${community.name}” flagged.` : `“${community.name}” unflagged.`, 'success');
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setFlaggingCom(null); }
  };

  const handleDeletePost = async (postId: string) => {
    setDeletingPost(postId);
    try {
      await api.admin.deletePost(token, postId);
      setPosts(prev => prev.filter(p => p._id !== postId));
      setPostsTotal(t => t - 1);
      setStats((prev: any) => prev ? { ...prev, posts: prev.posts - 1 } : prev);
      showToast('Post deleted.', 'success');
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setDeletingPost(null); }
  };

  const handleDeleteStory = async (storyId: string) => {
    setDeletingStory(storyId);
    try {
      await api.admin.deleteStory(token, storyId);
      setStories(prev => prev.filter(s => s._id !== storyId));
      setStoriesTotal(t => t - 1);
      showToast('Story deleted.', 'success');
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setDeletingStory(null); }
  };

  const handleDeleteAllStories = async () => {
    setDeletingAllStories(true);
    try {
      const res = await api.admin.deleteAllStories(token);
      showToast(`Deleted ${res.deleted} stories.`, 'success');
      setStories([]);
      setStoriesTotal(0);
      setStoriesPages(1);
      setShowDeleteAllStories(false);
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setDeletingAllStories(false); }
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingEvent(eventId);
    try {
      await api.admin.deleteEvent(token, eventId);
      setEvents(prev => prev.filter(e => e._id !== eventId));
      setEventsTotal(t => t - 1);
      showToast('Event deleted.', 'success');
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setDeletingEvent(null); }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const res = await api.admin.bulkDeleteFlagged(token, bulkThreshold);
      showToast(`Bulk deleted ${res.deleted} flagged posts.`, 'success');
      fetchPosts(1, postsFilter === 'flagged');
      setShowBulkConfirm(false);
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setBulkDeleting(false); }
  };

  const handleBulkDeleteEvents = async () => {
    setBulkDeletingEvents(true);
    try {
      const res = await api.admin.bulkDeleteFlaggedEvents(token, bulkEventsThreshold);
      showToast(`Bulk deleted ${res.deleted} flagged events.`, 'success');
      fetchEvents(1, eventsSearch);
      setShowBulkEventsConfirm(false);
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setBulkDeletingEvents(false); }
  };

  const handleBroadcast = async (title: string, message: string, segment: string) => {
    setBroadcasting(true);
    try {
      const res = await api.admin.broadcast(token, title, message, segment);
      showToast(`Announcement sent to ${res.sent.toLocaleString()} users.`, 'success');
      setShowBroadcast(false);
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setBroadcasting(false); }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await api.admin.saveSettings(token, autoSuspendThreshold);
      showToast('Settings saved.', 'success');
    } catch (e: any) { showToast(e?.message || 'Failed', 'error'); }
    finally { setSavingSettings(false); }
  };

  const exportCSV = () => {
    const headers = ['UID', 'Display Name', 'Email', 'Auth Type', 'Posts', 'Stories', 'Friends', 'Reports', 'Suspended', 'Joined'];
    const rows = allFilteredUsers.map(u => [u.uid, u.displayName, u.email, u.authType, u.postCount, u.storyCount, u.friendCount, u.reportCount, u.isSuspended ? 'Yes' : 'No', u.createdAt ? new Date(u.createdAt as number).toLocaleDateString() : '']);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `orbyt-users-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const allFilteredUsers = useMemo(() => users
    .filter(u => {
      const q = search.toLowerCase();
      const ms = !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.uid.includes(q);
      const mf = userFilter === 'all' ? true : userFilter === 'flagged' ? u.reportCount > 0 : u.isSuspended;
      return ms && mf;
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortField === 'displayName') diff = (a.displayName || '').localeCompare(b.displayName || '');
      else if (sortField === 'createdAt') diff = new Date(a.createdAt as number).getTime() - new Date(b.createdAt as number).getTime();
      else diff = (a[sortField] as number) - (b[sortField] as number);
      return sortAsc ? diff : -diff;
    }), [users, search, userFilter, sortField, sortAsc]);

  const usersPageCount = useMemo(() => Math.max(1, Math.ceil(allFilteredUsers.length / usersPerPage)), [allFilteredUsers.length, usersPerPage]);
  const filteredUsers = useMemo(() => allFilteredUsers.slice((usersPage - 1) * usersPerPage, usersPage * usersPerPage), [allFilteredUsers, usersPage, usersPerPage]);

  const filteredReports = useMemo(() => reports.filter(r => reportFilter === 'all' || r.status === reportFilter), [reports, reportFilter]);

  const filteredCommunities = useMemo(() => communities
    .filter(c => {
      if (comFilter === 'flagged' && !(c.reportCount > 0 || c.isFlagged)) return false;
      if (comSearch) { const q = comSearch.toLowerCase(); return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q); }
      return true;
    })
    .sort((a, b) => {
      const ra = a.reportCount || 0, rb = b.reportCount || 0;
      if (ra !== rb) return rb - ra;
      return b.memberCount - a.memberCount;
    }), [communities, comFilter, comSearch]);

  const filteredAuditLogs = useMemo(() => auditSearch
    ? auditLogs.filter(l => l.path?.includes(auditSearch) || l.uid?.includes(auditSearch) || String(l.statusCode).includes(auditSearch))
    : auditLogs, [auditLogs, auditSearch]);

  const toggleSort = useCallback((field: SortField) => { if (sortField === field) setSortAsc(v => !v); else { setSortField(field); setSortAsc(false); } }, [sortField]);
  const SortIcon = ({ field }: { field: SortField }) => sortField === field ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />) : null;

  const logout = useCallback(() => { sessionStorage.removeItem('admin_token'); navigate('/admin', { replace: true }); }, [navigate]);

  const pendingCount = useMemo(() => reports.filter(r => r.status === 'pending').length, [reports]);
  const suspendedCount = useMemo(() => users.filter(u => u.isSuspended).length, [users]);
  const flaggedCount = useMemo(() => users.filter(u => u.reportCount > 0).length, [users]);

  const tabs = useMemo<{ id: Tab; label: string; icon: React.ComponentType<any>; badge?: number }[]>(() => [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'posts', label: 'Posts', icon: FileText },
    { id: 'stories', label: 'Stories', icon: Image },
    { id: 'events', label: 'Events', icon: Activity },
    { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: pendingCount },
    { id: 'communities', label: 'Communities', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'audit', label: 'Audit Log', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Shield },
  ], [pendingCount]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
      {toast && (
        <div className={`fixed top-5 right-5 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}{toast.msg}
        </div>
      )}

      {/* Backdrop for mobile menu drawer */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-50 transition-transform duration-300 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        {/* Brand Info */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">Orbyt Admin</span>
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider block">Super Admin</span>
            </div>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="text-slate-500 hover:text-slate-300 md:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {tabs.map(t => {
            const IconComponent = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive 
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/10' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{t.label}</span>
                </div>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex-shrink-0">
          {stats?.onlineUsers > 0 && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 border border-emerald-950 bg-emerald-950/40 rounded-xl px-3 py-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span>{stats.onlineUsers} online users</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold font-mono">SA</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold truncate">Super Admin</p>
              <p className="text-slate-500 text-[10px] truncate">Admin Console</p>
            </div>
            <button 
              onClick={logout} 
              className="p-2 text-slate-400 hover:text-red-400 rounded-xl hover:bg-slate-800/80 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 min-w-0 md:pl-64 flex flex-col">
        {/* Top Navbar */}
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              className="p-2 -ml-2 text-slate-400 hover:text-white md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-white font-extrabold text-lg capitalize tracking-tight flex items-center gap-2">
              <span>{tab === 'audit' ? 'Audit Log' : tab}</span>
              {tab === 'reports' && pendingCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">{pendingCount} pending</span>
              )}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowBroadcast(true)} 
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Broadcast</span>
            </button>
            <button 
              onClick={fetchAll} 
              disabled={loading} 
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 px-4 sm:px-6 py-6 overflow-y-auto">
          {error && (
            <div className="bg-red-950 border border-red-800 text-red-400 rounded-xl px-5 py-4 mb-6 text-sm flex items-center gap-3">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── USERS TAB ── */}
          {tab === 'users' && (
            <>
              {/* Section specific stats */}
              {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  <StatCard icon={<Users className="w-5 h-5 text-violet-300" />} label="Total Users" value={stats.users} sub={`+${stats.newUsers7d} this week`} color="bg-violet-900/50" />
                  <StatCard icon={<Ban className="w-5 h-5 text-orange-300" />} label="Suspended" value={suspendedCount} color="bg-orange-900/50" onClick={() => setUserFilter('suspended')} />
                  <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-300" />} label="Flagged Users" value={flaggedCount} color="bg-red-900/50" onClick={() => setUserFilter('flagged')} />
                  <StatCard icon={<Wifi className="w-5 h-5 text-teal-300" />} label="Online Now" value={stats.onlineUsers || 0} color="bg-teal-900/50" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or UID..."
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder-slate-500"
                  />
                  {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>}
                </div>
                <div className="flex items-center gap-2">
                  <FilterPill label="All" active={userFilter === 'all'} onClick={() => setUserFilter('all')} count={users.length} />
                  <FilterPill label="Flagged" active={userFilter === 'flagged'} onClick={() => setUserFilter('flagged')} count={flaggedCount} />
                  <FilterPill label="Suspended" active={userFilter === 'suspended'} onClick={() => setUserFilter('suspended')} count={suspendedCount} />
                </div>
                <button onClick={exportCSV} className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors ml-auto">
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
              <p className="text-slate-600 text-xs mb-3">{allFilteredUsers.length} of {users.length} users — click a row to view details</p>
              {/* per-page selector */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-slate-500 text-xs">Show per page:</span>
                {[25, 50, 100].map(n => (
                  <button key={n} onClick={() => setUsersPerPage(n)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${usersPerPage === n ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{n}</button>
                ))}
              </div>
              {loading ? <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div> : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="text-left px-5 py-4 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('displayName')}>User <SortIcon field="displayName" /></th>
                          <th className="text-left px-4 py-4 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('reportCount')}>Reports <SortIcon field="reportCount" /></th>
                          <th className="text-left px-4 py-4 font-semibold cursor-pointer hover:text-white" onClick={() => toggleSort('postCount')}>Posts <SortIcon field="postCount" /></th>
                          <th className="text-left px-4 py-4 font-semibold hidden md:table-cell">Stories</th>
                          <th className="text-left px-4 py-4 font-semibold hidden lg:table-cell">Friends</th>
                          <th className="text-left px-4 py-4 font-semibold cursor-pointer hover:text-white hidden sm:table-cell" onClick={() => toggleSort('createdAt')}>Joined <SortIcon field="createdAt" /></th>
                          <th className="text-left px-4 py-4 font-semibold">Status</th>
                          <th className="px-4 py-4" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredUsers.length === 0 ? <tr><td colSpan={8} className="text-center text-slate-500 py-16">No users found</td></tr> : filteredUsers.map(user => (
                          <tr key={user.uid} onClick={() => setSelectedUser(user)} className={`hover:bg-slate-800/40 transition-colors group cursor-pointer ${user.isSuspended ? 'opacity-60' : ''}`}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar src={user.photoURL} name={user.displayName} size={38} />
                                <div className="min-w-0">
                                  <p className="font-semibold text-white truncate max-w-[160px]">{user.displayName}</p>
                                  <p className="text-slate-500 text-xs truncate max-w-[160px]">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                              {user.reportCount > 0 ? <span className={`font-bold text-sm px-2 py-0.5 rounded-lg ${user.reportCount >= 3 ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>{user.reportCount}</span> : <span className="text-slate-600 text-sm">0</span>}
                            </td>
                            <td className="px-4 py-4 text-slate-300 font-medium">{user.postCount}</td>
                            <td className="px-4 py-4 text-slate-300 hidden md:table-cell">{user.storyCount}</td>
                            <td className="px-4 py-4 text-slate-300 hidden lg:table-cell">{user.friendCount}</td>
                            <td className="px-4 py-4 text-slate-500 hidden sm:table-cell text-xs">{timeAgo(user.createdAt as number)}</td>
                            <td className="px-4 py-4">
                              {user.isSuspended ? <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-orange-800 text-orange-400 bg-orange-950">Suspended</span> : <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-emerald-800 text-emerald-400 bg-emerald-950">Active</span>}
                            </td>
                            <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                                <button onClick={() => toggleSuspend(user)} disabled={suspending === user.uid} className={`p-1.5 rounded-xl transition-colors ${user.isSuspended ? 'text-emerald-400 hover:bg-emerald-950' : 'text-orange-400 hover:bg-orange-950'}`}>
                                  {user.isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                                </button>
                                <button onClick={() => setDeleteTarget(user)} className="p-1.5 text-red-500 hover:bg-red-950 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                <a href={`/app/profile/${user.uid}`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-slate-800 rounded-xl transition-all"><ExternalLink className="w-3.5 h-3.5" /></a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {/* Users pagination footer */}
              {usersPageCount > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button onClick={() => setUsersPage(p => Math.max(1, p - 1))} disabled={usersPage <= 1} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
                  {Array.from({ length: Math.min(usersPageCount, 7) }, (_, i) => {
                    const pg = usersPageCount <= 7 ? i + 1 : i === 0 ? 1 : i === 6 ? usersPageCount : usersPage - 2 + i;
                    return (
                      <button key={i} onClick={() => setUsersPage(pg)}
                        className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${usersPage === pg ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                      >{pg}</button>
                    );
                  })}
                  <button onClick={() => setUsersPage(p => Math.min(usersPageCount, p + 1))} disabled={usersPage >= usersPageCount} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl"><ChevronRight className="w-4 h-4" /></button>
                  <span className="text-slate-500 text-xs ml-2">Page {usersPage} / {usersPageCount} · {allFilteredUsers.length} users</span>
                </div>
              )}
            </>
          )}

          {/* ── POSTS TAB ── */}
          {tab === 'posts' && (
            <>
              {/* Section specific stats */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <StatCard icon={<FileText className="w-5 h-5 text-blue-300" />} label="Total Posts" value={stats.posts} color="bg-blue-900/50" />
                  <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-300" />} label="Pending Reports" value={pendingCount} color="bg-red-900/50" onClick={() => { setTab('reports'); setReportFilter('pending'); }} />
                  <StatCard icon={<Trash2 className="w-5 h-5 text-orange-300" />} label="Bulk Threshold" value={`≥ ${bulkThreshold} reports`} color="bg-orange-900/50" onClick={() => setShowBulkConfirm(true)} />
                </div>
              )}

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <FilterPill label="All Posts" active={postsFilter === 'all'} onClick={() => setPostsFilter('all')} />
                <FilterPill label="Flagged" active={postsFilter === 'flagged'} onClick={() => setPostsFilter('flagged')} />
                <div className="ml-auto flex items-center gap-2">
                  <p className="text-slate-600 text-xs">{postsTotal.toLocaleString()} posts</p>
                  <button onClick={() => setShowBulkConfirm(true)} className="flex items-center gap-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-800 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"><Trash2 className="w-3.5 h-3.5" /> Bulk Delete Flagged</button>
                </div>
              </div>
              {showBulkConfirm && (
                <div className="bg-red-950 border border-red-800 rounded-2xl p-5 mb-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1">
                    <p className="text-red-300 font-semibold text-sm">Delete all posts with ≥</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" min={1} max={20} value={bulkThreshold} onChange={e => setBulkThreshold(Number(e.target.value))} className="w-16 bg-slate-900 border border-red-800 text-white rounded-lg px-2 py-1 text-sm text-center" />
                      <span className="text-red-400 text-sm">reports (pending)</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowBulkConfirm(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl">Cancel</button>
                    <button onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2">
                      {bulkDeleting ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-3 h-3" />} Confirm Delete
                    </button>
                  </div>
                </div>
              )}
              {postsLoading ? <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div> : posts.length === 0 ? <div className="text-center text-slate-500 py-16">No posts found</div> : (
                <>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="px-5 py-4 font-semibold">Author</th>
                            <th className="px-4 py-4 font-semibold">Content</th>
                            <th className="px-4 py-4 font-semibold">Engagement</th>
                            <th className="px-4 py-4 font-semibold">Reports</th>
                            <th className="px-4 py-4 font-semibold">Published</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {posts.map(post => (
                            <tr key={post._id} className={`hover:bg-slate-800/40 transition-colors group ${post.reportCount > 0 ? 'bg-red-950/10' : ''}`}>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <Avatar src={post.authorPhoto} name={post.authorName} size={32} />
                                  <span className="text-white font-semibold text-xs">{post.authorName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 max-w-xs md:max-w-md">
                                <div className="flex flex-col gap-1.5">
                                  {post.content && <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">{post.content}</p>}
                                  {post.imageURL && (
                                    <a href={post.imageURL} target="_blank" rel="noopener noreferrer" className="inline-block self-start">
                                      <img src={post.imageURL} alt="Post Attachment" className="rounded-lg h-10 w-16 object-cover border border-slate-800 hover:scale-105 transition-transform" />
                                    </a>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-400">
                                <span className="font-semibold text-slate-300">{post.likeCount}</span> likes · <span className="font-semibold text-slate-300">{post.commentCount}</span> comments
                              </td>
                              <td className="px-4 py-4">
                                {post.reportCount > 0 ? (
                                  <span className={`font-bold text-xs px-2.5 py-0.5 rounded-full border ${post.reportCount >= 3 ? 'bg-red-950 text-red-400 border-red-900' : 'bg-amber-950 text-amber-400 border-amber-900'}`}>{post.reportCount} report{post.reportCount > 1 ? 's' : ''}</span>
                                ) : (
                                  <span className="text-slate-600 text-xs">0</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-500 text-xs">{timeAgo(post.createdAt)}</td>
                              <td className="px-5 py-4 text-right">
                                <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end transition-all">
                                  <button 
                                    onClick={() => handleDeletePost(post._id)} 
                                    disabled={deletingPost === post._id} 
                                    className="flex items-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-950 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                    title="Delete Post"
                                  >
                                    {deletingPost === post._id ? (
                                      <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {postsPages > 1 && (
                    <div className="flex items-center justify-center gap-3 mt-6">
                      <button onClick={() => fetchPosts(postsPage - 1, postsFilter === 'flagged')} disabled={postsPage <= 1} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-slate-400 text-sm">Page {postsPage} of {postsPages}</span>
                      <button onClick={() => fetchPosts(postsPage + 1, postsFilter === 'flagged')} disabled={postsPage >= postsPages} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── STORIES TAB ── */}
          {tab === 'stories' && (
            <>
              {/* Section specific stats */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <StatCard icon={<Image className="w-5 h-5 text-cyan-300" />} label="Active Stories" value={stats.stories} color="bg-cyan-900/50" />
                  <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-300" />} label="Story Reports (Pending)" value={reports.filter(r => r.type === 'story' && r.status === 'pending').length} color="bg-red-900/50" onClick={() => { setTab('reports'); setReportFilter('pending'); }} />
                  <StatCard icon={<Trash2 className="w-5 h-5 text-orange-300" />} label="Moderate All" value="Delete All Stories" color="bg-orange-900/50" onClick={() => setShowDeleteAllStories(true)} />
                </div>
              )}

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text" value={storiesSearch}
                    onChange={e => setStoriesSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchStories(1, storiesSearch)}
                    placeholder="Search captions… (press Enter)"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder-slate-500"
                  />
                  {storiesSearch && <button onClick={() => { setStoriesSearch(''); fetchStories(1, ''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>}
                </div>
                <p className="text-slate-600 text-xs">{storiesTotal.toLocaleString()} stories total</p>
                <button onClick={() => setShowDeleteAllStories(true)} className="flex items-center gap-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-800 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors ml-auto"><Trash2 className="w-3.5 h-3.5" /> Delete All Stories</button>
              </div>
              {showDeleteAllStories && (
                <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex-1">
                    <p className="text-red-300 font-semibold text-sm">Delete ALL {storiesTotal.toLocaleString()} stories?</p>
                    <p className="text-red-400/70 text-xs mt-0.5">This will permanently remove every story on the platform. This action cannot be undone.</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setShowDeleteAllStories(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl">Cancel</button>
                    <button onClick={handleDeleteAllStories} disabled={deletingAllStories} className="bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5">
                      {deletingAllStories ? <><div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" /> Deleting…</> : <><Trash2 className="w-3.5 h-3.5" /> Confirm Delete All</>}
                    </button>
                  </div>
                </div>
              )}
              {storiesLoading ? (
                <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-cyan-500 rounded-full animate-spin" /></div>
              ) : stories.length === 0 ? (
                <div className="text-center text-slate-500 py-16">No stories found</div>
              ) : (
                <>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="px-5 py-4 font-semibold">Preview</th>
                            <th className="px-4 py-4 font-semibold">Author</th>
                            <th className="px-4 py-4 font-semibold">Caption</th>
                            <th className="px-4 py-4 font-semibold">Reports</th>
                            <th className="px-4 py-4 font-semibold">Published</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {stories.map(story => (
                            <tr key={story._id} className={`hover:bg-slate-800/40 transition-colors group ${story.reportCount > 0 ? 'bg-red-950/10' : ''}`}>
                              <td className="px-5 py-4">
                                <div className="w-12 h-20 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                                  {story.videoURL ? (
                                    <video src={story.videoURL} className="w-full h-full object-cover" muted playsInline />
                                  ) : story.imageURL ? (
                                    <img src={story.imageURL} alt="Story Image" className="w-full h-full object-cover hover:scale-110 transition-transform" />
                                  ) : (
                                    <Image className="w-4 h-4 text-slate-600" />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <Avatar src={story.authorPhoto ?? undefined} name={story.authorName} size={28} />
                                  <span className="text-white font-semibold text-xs">{story.authorName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 max-w-xs">
                                {story.caption ? (
                                  <p className="text-slate-300 text-xs line-clamp-2 leading-relaxed">{story.caption}</p>
                                ) : (
                                  <span className="text-slate-600 text-xs italic">No caption</span>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                {story.reportCount > 0 ? (
                                  <span className="font-bold text-xs px-2.5 py-0.5 rounded-full border bg-red-950 text-red-400 border-red-900">{story.reportCount} report{story.reportCount > 1 ? 's' : ''}</span>
                                ) : (
                                  <span className="text-slate-600 text-xs">0</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-500 text-xs">{timeAgo(story.createdAt)}</td>
                              <td className="px-5 py-4 text-right">
                                <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end transition-all">
                                  <button 
                                    onClick={() => handleDeleteStory(story._id)} 
                                    disabled={deletingStory === story._id} 
                                    className="flex items-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-950 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                    title="Delete Story"
                                  >
                                    {deletingStory === story._id ? (
                                      <div className="w-3.5 h-3.5 border border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {storiesPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button onClick={() => fetchStories(storiesPage - 1, storiesSearch)} disabled={storiesPage <= 1} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
                      {Array.from({ length: Math.min(storiesPages, 7) }, (_, i) => {
                        const p = storiesPages <= 7 ? i + 1 : i === 0 ? 1 : i === 6 ? storiesPages : storiesPage - 2 + i;
                        return (
                          <button key={i} onClick={() => fetchStories(p, storiesSearch)}
                            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${storiesPage === p ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                          >{p}</button>
                        );
                      })}
                      <button onClick={() => fetchStories(storiesPage + 1, storiesSearch)} disabled={storiesPage >= storiesPages} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl"><ChevronRight className="w-4 h-4" /></button>
                      <span className="text-slate-500 text-xs ml-2">Page {storiesPage} / {storiesPages} · {storiesTotal} total</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── EVENTS TAB ── */}
          {tab === 'events' && (
            <>
              {/* Section specific stats */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <StatCard icon={<Activity className="w-5 h-5 text-orange-300" />} label="Total Events" value={eventsTotal} color="bg-orange-900/50" />
                  <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-300" />} label="Event Reports" value={reports.filter(r => r.type === 'meetup' && r.status === 'pending').length} color="bg-red-900/50" onClick={() => { setTab('reports'); setReportFilter('pending'); }} />
                  <StatCard icon={<CheckCircle className="w-5 h-5 text-emerald-300" />} label="Active Events" value={events.filter(e => !e.isPast).length} color="bg-emerald-900/50" />
                </div>
              )}

              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text" value={eventsSearch}
                    onChange={e => setEventsSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fetchEvents(1, eventsSearch)}
                    placeholder="Search event titles… (press Enter)"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder-slate-500"
                  />
                  {eventsSearch && <button onClick={() => { setEventsSearch(''); fetchEvents(1, ''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <p className="text-slate-600 text-xs">{eventsTotal.toLocaleString()} events total</p>
                  <button onClick={() => setShowBulkEventsConfirm(true)} className="flex items-center gap-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-800 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"><Trash2 className="w-3.5 h-3.5" /> Bulk Delete Flagged</button>
                </div>
              </div>
              {showBulkEventsConfirm && (
                <div className="bg-red-950 border border-red-800 rounded-2xl p-5 mb-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1">
                    <p className="text-red-300 font-semibold text-sm">Delete all events with ≥</p>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="number" min={1} max={20} value={bulkEventsThreshold} onChange={e => setBulkEventsThreshold(Number(e.target.value))} className="w-16 bg-slate-900 border border-red-800 text-white rounded-lg px-2 py-1 text-sm text-center" />
                      <span className="text-red-400 text-sm">reports (pending)</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowBulkEventsConfirm(false)} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-3 py-2 rounded-xl">Cancel</button>
                    <button onClick={handleBulkDeleteEvents} disabled={bulkDeletingEvents} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2">
                      {bulkDeletingEvents ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-3 h-3" />} Confirm Delete
                    </button>
                  </div>
                </div>
              )}
              {eventsLoading ? (
                <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-orange-500 rounded-full animate-spin" /></div>
              ) : events.length === 0 ? (
                <div className="text-center text-slate-500 py-16">No events found</div>
              ) : (
                <>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                            <th className="px-5 py-4 font-semibold">Event Title</th>
                            <th className="px-4 py-4 font-semibold">Host</th>
                            <th className="px-4 py-4 font-semibold">Details</th>
                            <th className="px-4 py-4 font-semibold">Attendance</th>
                            <th className="px-4 py-4 font-semibold">Reports</th>
                            <th className="px-5 py-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {events.map(event => (
                            <tr key={event._id} className={`hover:bg-slate-800/40 transition-colors group ${event.reportCount > 0 ? 'bg-red-950/10' : event.isPast ? 'opacity-60 border-slate-800' : ''}`}>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  {event.imageURL ? (
                                    <img src={event.imageURL} alt="Event Cover" className="w-10 h-10 rounded-lg object-cover border border-slate-700 flex-shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-orange-900/20 border border-orange-900/30 flex items-center justify-center flex-shrink-0">
                                      <Activity className="w-4 h-4 text-orange-400" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-white text-xs truncate max-w-[150px]">{event.title}</p>
                                    {event.isPast && <span className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full font-bold">Past</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <Avatar src={event.authorPhoto ?? undefined} name={event.authorName} size={24} />
                                  <span className="text-slate-300 text-xs font-semibold">{event.authorName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-0.5 text-xs text-slate-400">
                                  {event.activity && <span className="truncate">🎯 {event.activity}</span>}
                                  {event.date && <span>📅 {event.date}{event.startTime ? ` @ ${event.startTime}` : ''}</span>}
                                  {event.venueName && <span className="truncate text-slate-500">📍 {event.venueName}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs text-slate-300">
                                <span className="font-bold text-white">{event.attendeeCount}</span> attending
                                {event.maxGuests && <span className="text-slate-500"> / max {event.maxGuests}</span>}
                                {event.pendingCount > 0 && <p className="text-orange-400 text-[10px] mt-0.5">⏳ {event.pendingCount} pending</p>}
                              </td>
                              <td className="px-4 py-4">
                                {event.reportCount > 0 ? (
                                  <span className="font-bold text-xs px-2.5 py-0.5 rounded-full border bg-red-950 text-red-400 border-red-900">{event.reportCount} report{event.reportCount > 1 ? 's' : ''}</span>
                                ) : (
                                  <span className="text-slate-600 text-xs">0</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end transition-all">
                                  <button 
                                    onClick={() => handleDeleteEvent(event._id)} 
                                    disabled={deletingEvent === event._id} 
                                    className="flex items-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-950 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                                    title="Delete Event"
                                  >
                                    {deletingEvent === event._id ? (
                                      <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {eventsPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button onClick={() => fetchEvents(eventsPage - 1, eventsSearch)} disabled={eventsPage <= 1} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl"><ChevronLeft className="w-4 h-4" /></button>
                      {Array.from({ length: Math.min(eventsPages, 7) }, (_, i) => {
                        const p = eventsPages <= 7 ? i + 1 : i === 0 ? 1 : i === 6 ? eventsPages : eventsPage - 2 + i;
                        return (
                          <button key={i} onClick={() => fetchEvents(p, eventsSearch)}
                            className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${eventsPage === p ? 'bg-orange-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                          >{p}</button>
                        );
                      })}
                      <button onClick={() => fetchEvents(eventsPage + 1, eventsSearch)} disabled={eventsPage >= eventsPages} className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl"><ChevronRight className="w-4 h-4" /></button>
                      <span className="text-slate-500 text-xs ml-2">Page {eventsPage} / {eventsPages} · {eventsTotal} total</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── REPORTS TAB ── */}
          {tab === 'reports' && (
            <>
              {/* Section specific stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <StatCard icon={<AlertTriangle className="w-5 h-5 text-red-300" />} label="Pending Action" value={reports.filter(r => r.status === 'pending').length} color="bg-red-900/50" onClick={() => setReportFilter('pending')} />
                <StatCard icon={<CheckCircle className="w-5 h-5 text-emerald-300" />} label="Resolved" value={reports.filter(r => r.status === 'resolved').length} color="bg-emerald-900/50" onClick={() => setReportFilter('resolved')} />
                <StatCard icon={<XCircle className="w-5 h-5 text-slate-400" />} label="Dismissed" value={reports.filter(r => r.status === 'dismissed').length} color="bg-slate-800/50" onClick={() => setReportFilter('dismissed')} />
                <StatCard icon={<Flag className="w-5 h-5 text-violet-300" />} label="Total Submitted" value={reports.length} color="bg-violet-900/50" onClick={() => setReportFilter('all')} />
              </div>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <FilterPill label="All" active={reportFilter === 'all'} onClick={() => setReportFilter('all')} count={reports.length} />
                <FilterPill label="Pending" active={reportFilter === 'pending'} onClick={() => setReportFilter('pending')} count={reports.filter(r => r.status === 'pending').length} />
                <FilterPill label="Resolved" active={reportFilter === 'resolved'} onClick={() => setReportFilter('resolved')} count={reports.filter(r => r.status === 'resolved').length} />
                <FilterPill label="Dismissed" active={reportFilter === 'dismissed'} onClick={() => setReportFilter('dismissed')} count={reports.filter(r => r.status === 'dismissed').length} />
              </div>
              {loading ? <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div> : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="px-5 py-4 font-semibold">Reason</th>
                          <th className="px-4 py-4 font-semibold">Type</th>
                          <th className="px-4 py-4 font-semibold">Reporter</th>
                          <th className="px-4 py-4 font-semibold">Target</th>
                          <th className="px-4 py-4 font-semibold">Created</th>
                          <th className="px-4 py-4 font-semibold">Status</th>
                          <th className="px-5 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredReports.length === 0 ? (
                          <tr><td colSpan={7} className="text-center text-slate-500 py-16">No reports found</td></tr>
                        ) : filteredReports.map(r => {
                          const rType = r.type || 'post';
                          const TYPE_COLORS: Record<string, string> = {
                            user:      'bg-violet-950 text-violet-400 border-violet-900',
                            post:      'bg-blue-950 text-blue-400 border-blue-900',
                            story:     'bg-cyan-950 text-cyan-400 border-cyan-900',
                            meetup:    'bg-orange-950 text-orange-400 border-orange-900',
                            community: 'bg-emerald-950 text-emerald-400 border-emerald-900',
                          };
                          const typeColor = TYPE_COLORS[rType] ?? 'bg-slate-800 text-slate-400 border-slate-700';
                          return (
                            <tr key={r._id} onClick={() => setSelectedReport(r)} className={`hover:bg-slate-800/40 transition-colors group cursor-pointer ${r.status === 'pending' ? 'border-slate-700 font-medium' : 'opacity-60 border-slate-800'}`}>
                              <td className="px-5 py-4 max-w-xs truncate text-white">
                                {r.reason}
                              </td>
                              <td className="px-4 py-4">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColor}`}>{rType.toUpperCase()}</span>
                              </td>
                              <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={e => { e.stopPropagation(); const u = users.find(usr => usr.uid === r.reporterUid); if (u) setSelectedUser(u); }}
                                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2 py-1 transition-colors"
                                >
                                  <Avatar src={r.reporterPhoto ?? undefined} name={r.reporterName} size={18} />
                                  <span className="text-slate-300 text-[10px] font-semibold">{r.reporterName}</span>
                                </button>
                              </td>
                              <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                                {rType === 'community' ? (
                                  <span className="flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-900/50 rounded-lg px-2 py-1">
                                    <span className="text-emerald-300 text-[10px] font-semibold">#{r.communityName ?? 'room'}</span>
                                  </span>
                                ) : (
                                  <button
                                    onClick={e => { e.stopPropagation(); if (r.targetUid) { const u = users.find(usr => usr.uid === r.targetUid); if (u) setSelectedUser(u); } }}
                                    className="flex items-center gap-1.5 bg-red-950/50 hover:bg-red-950 border border-red-900/50 rounded-lg px-2 py-1 transition-colors"
                                  >
                                    <Avatar src={r.targetPhoto ?? undefined} name={r.targetName} size={18} />
                                    <span className="text-red-300 text-[10px] font-semibold">{r.targetName}</span>
                                  </button>
                                )}
                              </td>
                              <td className="px-4 py-4 text-slate-500 text-xs">{timeAgo(r.createdAt)}</td>
                              <td className="px-4 py-4">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${r.status === 'pending' ? 'bg-red-950 text-red-400 border-red-900' : r.status === 'resolved' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>{r.status.toUpperCase()}</span>
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className="text-slate-600 text-xs group-hover:text-slate-300 transition-colors">Review Details →</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── COMMUNITIES TAB ── */}
          {tab === 'communities' && (
            <>
              {/* Section specific stats */}
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                  <StatCard icon={<Globe className="w-5 h-5 text-emerald-300" />} label="Total Communities" value={stats.communities} color="bg-emerald-900/50" />
                  <StatCard icon={<Flag className="w-5 h-5 text-amber-300" />} label="Flagged Communities" value={communities.filter(c => c.reportCount > 0 || c.isFlagged).length} color="bg-amber-900/50" onClick={() => setComFilter('flagged')} />
                  <StatCard icon={<Ban className="w-5 h-5 text-violet-300" />} label="Private Communities" value={communities.filter(c => c.isPrivate).length} color="bg-violet-900/50" />
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3 flex-wrap">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={comSearch} onChange={e => setComSearch(e.target.value)} placeholder="Search communities..."
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder-slate-500"
                  />
                  {comSearch && <button onClick={() => setComSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-4 h-4" /></button>}
                </div>
                <div className="flex items-center gap-2">
                  <FilterPill label="All" active={comFilter === 'all'} onClick={() => setComFilter('all')} count={communities.length} />
                  <FilterPill label="Flagged" active={comFilter === 'flagged'} onClick={() => setComFilter('flagged')} count={communities.filter(c => c.reportCount > 0 || c.isFlagged).length} />
                </div>
              </div>
              <p className="text-slate-600 text-xs mb-3">{filteredCommunities.length} of {communities.length} communities — click Peek to inspect messages</p>
              {loading ? <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div> : filteredCommunities.length === 0 ? <div className="text-center text-slate-500 py-16">No communities found</div> : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                          <th className="text-left px-5 py-4 font-semibold">Community</th>
                          <th className="text-left px-4 py-4 font-semibold">Reports</th>
                          <th className="text-left px-4 py-4 font-semibold">Members</th>
                          <th className="text-left px-4 py-4 font-semibold hidden sm:table-cell">Type</th>
                          <th className="text-left px-4 py-4 font-semibold hidden md:table-cell">Tags</th>
                          <th className="text-left px-4 py-4 font-semibold hidden lg:table-cell">Created</th>
                          <th className="px-4 py-4" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredCommunities.map(c => (
                          <tr key={c.id} className={`hover:bg-slate-800/40 transition-colors group ${(c.reportCount > 0 || c.isFlagged) ? 'bg-red-950/10' : ''}`}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.isFlagged ? 'bg-amber-950' : 'bg-gradient-to-br from-emerald-700 to-teal-700'}`}>
                                  {c.isFlagged ? <Flag className="w-4 h-4 text-amber-400" /> : <Globe className="w-4 h-4 text-white" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-white truncate max-w-[180px]">{c.name}</p>
                                  {c.description && <p className="text-slate-500 text-xs truncate max-w-[180px]">{c.description}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {c.reportCount > 0
                                ? <span className={`font-bold text-sm px-2 py-0.5 rounded-lg ${c.reportCount >= 3 ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>{c.reportCount}</span>
                                : <span className="text-slate-600 text-sm">0</span>}
                            </td>
                            <td className="px-4 py-4 text-white font-bold">{c.memberCount}</td>
                            <td className="px-4 py-4 hidden sm:table-cell"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${c.isPrivate ? 'border-violet-700 text-violet-400 bg-violet-950' : 'border-slate-700 text-slate-400 bg-slate-800'}`}>{c.isPrivate ? 'Private' : 'Public'}</span></td>
                            <td className="px-4 py-4 hidden md:table-cell"><div className="flex flex-wrap gap-1">{c.tags.slice(0, 3).map(tag => <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{tag}</span>)}{c.tags.length > 3 && <span className="text-xs text-slate-600">+{c.tags.length - 3}</span>}</div></td>
                            <td className="px-4 py-4 text-slate-500 text-xs hidden lg:table-cell">{timeAgo(c.createdAt)}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="opacity-0 group-hover:opacity-100 flex items-center justify-end gap-1 transition-all">
                                <button onClick={() => setPeekTarget(c)} className="flex items-center gap-1.5 text-violet-400 hover:bg-violet-950 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                                  <Eye className="w-3.5 h-3.5" /> Peek
                                </button>
                                <button
                                  onClick={() => handleFlagCommunity(c)}
                                  disabled={flaggingCom === c.id}
                                  title={c.isFlagged ? 'Unflag' : 'Flag community'}
                                  className={`p-1.5 rounded-xl transition-colors ${c.isFlagged ? 'text-amber-400 bg-amber-950' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-950'}`}
                                >
                                  <Flag className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setDeleteComTarget(c)} className="p-1.5 text-red-500 hover:bg-red-950 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── ANALYTICS TAB ── */}
          {tab === 'analytics' && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div>
              ) : !analytics ? (
                <div className="text-center text-slate-500 py-16">No analytics data</div>
              ) : (
                <>
                  {/* Section header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-white font-bold text-lg">Platform Analytics</h2>
                      <p className="text-slate-500 text-xs mt-0.5">Last 30 days · All times UTC</p>
                    </div>
                    <button onClick={() => setAnalytics(null)} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs px-3 py-1.5 rounded-xl hover:bg-slate-800 transition-colors border border-slate-800">
                      <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                  </div>

                  {/* KPI cards with sparklines */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {[
                      {
                        label: 'Daily Active',
                        value: analytics.dau,
                        sub: 'users today',
                        color: 'text-violet-400',
                        bg: 'from-violet-500/10 to-transparent',
                        border: 'border-violet-900/40',
                        sparkColor: '#8b5cf6',
                        sparkValues: (analytics.chartData as ChartRow[]).map((d: ChartRow) => d.signups),
                      },
                      {
                        label: 'Weekly Active',
                        value: analytics.wau,
                        sub: 'users this week',
                        color: 'text-blue-400',
                        bg: 'from-blue-500/10 to-transparent',
                        border: 'border-blue-900/40',
                        sparkColor: '#3b82f6',
                        sparkValues: (analytics.chartData as ChartRow[]).slice(-7).map((d: ChartRow) => d.signups),
                      },
                      {
                        label: 'Monthly Active',
                        value: analytics.mau,
                        sub: 'users this month',
                        color: 'text-emerald-400',
                        bg: 'from-emerald-500/10 to-transparent',
                        border: 'border-emerald-900/40',
                        sparkColor: '#10b981',
                        sparkValues: (analytics.chartData as ChartRow[]).map((d: ChartRow) => d.posts),
                      },
                      {
                        label: 'Total Users',
                        value: analytics.totalUsers,
                        sub: `+${analytics.usersLast30} this month`,
                        growth: analytics.userGrowthRate,
                        color: 'text-white',
                        bg: 'from-slate-700/20 to-transparent',
                        border: 'border-slate-700/40',
                        sparkColor: '#94a3b8',
                        sparkValues: (analytics.chartData as ChartRow[]).map((d: ChartRow) => d.signups),
                      },
                      {
                        label: 'Total Posts',
                        value: analytics.totalPosts,
                        sub: `+${analytics.postsLast30} this month`,
                        growth: analytics.postGrowthRate,
                        color: 'text-amber-400',
                        bg: 'from-amber-500/10 to-transparent',
                        border: 'border-amber-900/40',
                        sparkColor: '#f59e0b',
                        sparkValues: (analytics.chartData as ChartRow[]).map((d: ChartRow) => d.posts),
                      },
                      {
                        label: 'Pending Reports',
                        value: analytics.reportStatus?.pending || 0,
                        sub: `${analytics.totalReports} total reports`,
                        color: analytics.reportStatus?.pending > 0 ? 'text-red-400' : 'text-slate-400',
                        bg: analytics.reportStatus?.pending > 0 ? 'from-red-500/10 to-transparent' : 'from-slate-700/20 to-transparent',
                        border: analytics.reportStatus?.pending > 0 ? 'border-red-900/40' : 'border-slate-700/40',
                        sparkColor: '#ef4444',
                        sparkValues: (analytics.chartData as ChartRow[]).map((d: ChartRow) => d.reports),
                      },
                    ].map(k => (
                      <div key={k.label} className={`bg-gradient-to-b ${k.bg} border ${k.border} bg-slate-900 rounded-2xl p-4 flex flex-col gap-1`}>
                        <p className={`text-2xl font-extrabold ${k.color}`}>{(k.value as number).toLocaleString()}</p>
                        <p className="text-xs font-bold text-slate-300">{k.label}</p>
                        <p className="text-xs text-slate-600">{k.sub}</p>
                        {k.growth !== undefined && (
                          <span className={`text-xs font-bold ${k.growth >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {k.growth >= 0 ? '▲' : '▼'} {Math.abs(k.growth)}% vs prev 30d
                          </span>
                        )}
                        <div className="mt-1">
                          <Sparkline values={k.sparkValues} color={k.sparkColor} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Platform health strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Communities', value: analytics.totalCommunities, icon: <Globe className="w-4 h-4" />, color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
                      { label: 'Stories (all time)', value: analytics.totalStories, icon: <Image className="w-4 h-4" />, color: 'text-pink-400', bg: 'bg-pink-900/20' },
                      { label: 'Suspended Users', value: analytics.suspendedCount, icon: <Ban className="w-4 h-4" />, color: analytics.suspendedCount > 0 ? 'text-orange-400' : 'text-slate-500', bg: 'bg-orange-900/20' },
                      { label: 'Resolved Reports', value: analytics.reportStatus?.resolved || 0, icon: <CheckCircle className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
                    ].map(s => (
                      <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg} ${s.color}`}>{s.icon}</div>
                        <div>
                          <p className={`text-xl font-extrabold ${s.color}`}>{(s.value as number).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 30-day trend — main area chart */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-violet-400" />
                        <h3 className="text-white font-bold">30-Day Activity Trend</h3>
                      </div>
                      {/* Legend */}
                      <div className="flex items-center gap-4 text-xs flex-wrap">
                        {[
                          { color: '#8b5cf6', label: 'Signups' },
                          { color: '#3b82f6', label: 'Posts' },
                          { color: '#10b981', label: 'Communities' },
                          { color: '#ef4444', label: 'Reports' },
                        ].map(l => (
                          <span key={l.label} className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: l.color }} />
                            <span className="text-slate-400">{l.label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <AreaLineChart
                      data={analytics.chartData}
                      keys={[
                        { key: 'signups',     color: '#8b5cf6', label: 'Signups' },
                        { key: 'posts',       color: '#3b82f6', label: 'Posts' },
                        { key: 'communities', color: '#10b981', label: 'Communities' },
                        { key: 'reports',     color: '#ef4444', label: 'Reports' },
                      ]}
                    />
                    {/* 30d totals row */}
                    <div className="grid grid-cols-4 gap-3 mt-5">
                      {[
                        { label: 'Signups (30d)',     key: 'signups',     color: 'text-violet-400' },
                        { label: 'Posts (30d)',        key: 'posts',       color: 'text-blue-400' },
                        { label: 'Communities (30d)', key: 'communities', color: 'text-emerald-400' },
                        { label: 'Reports (30d)',      key: 'reports',     color: 'text-red-400' },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
                          <p className={`text-xl font-extrabold ${s.color}`}>
                            {(analytics.chartData as ChartRow[]).reduce((acc: number, d: ChartRow) => acc + (d[s.key as keyof ChartRow] as number), 0)}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Per-metric bar charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                        <Users className="w-4 h-4 text-violet-400" /> Daily New Users
                      </h4>
                      <p className="text-slate-500 text-xs mb-3">User signups per day — last 30 days</p>
                      <BarChart data={analytics.chartData} valueKey="signups" color="#8b5cf6" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" /> Daily Posts Created
                      </h4>
                      <p className="text-slate-500 text-xs mb-3">Posts published per day — last 30 days</p>
                      <BarChart data={analytics.chartData} valueKey="posts" color="#3b82f6" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-emerald-400" /> Daily Rooms Created
                      </h4>
                      <p className="text-slate-500 text-xs mb-3">Community rooms created per day — last 30 days</p>
                      <BarChart data={analytics.chartData} valueKey="communities" color="#10b981" />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400" /> Daily Reports Filed
                      </h4>
                      <p className="text-slate-500 text-xs mb-3">User reports submitted per day — last 30 days</p>
                      <BarChart data={analytics.chartData} valueKey="reports" color="#ef4444" />
                    </div>
                  </div>

                  {/* Donut breakdown row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <h4 className="text-white font-bold text-sm mb-1">Sign-up Method</h4>
                      <p className="text-slate-500 text-xs mb-4">How users created their account</p>
                      <DonutChart segments={[
                        { label: 'Google OAuth', value: analytics.authTypes?.google || 0, color: '#3b82f6' },
                        { label: 'Email / Password', value: analytics.authTypes?.email || 0, color: '#8b5cf6' },
                      ]} />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <h4 className="text-white font-bold text-sm mb-1">Report Status</h4>
                      <p className="text-slate-500 text-xs mb-4">Current state of all submitted reports</p>
                      <DonutChart segments={[
                        { label: 'Pending Action', value: analytics.reportStatus?.pending || 0,   color: '#ef4444' },
                        { label: 'Resolved',       value: analytics.reportStatus?.resolved || 0,  color: '#10b981' },
                        { label: 'Dismissed',      value: analytics.reportStatus?.dismissed || 0, color: '#475569' },
                      ]} />
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                      <h4 className="text-white font-bold text-sm mb-1">Report Types</h4>
                      <p className="text-slate-500 text-xs mb-4">What content is being reported</p>
                      <DonutChart segments={[
                        { label: 'User Profile', value: analytics.reportTypes?.user      || 0, color: '#8b5cf6' },
                        { label: 'Post',         value: analytics.reportTypes?.post      || 0, color: '#3b82f6' },
                        { label: 'Story',        value: analytics.reportTypes?.story     || 0, color: '#06b6d4' },
                        { label: 'Meetup',       value: analytics.reportTypes?.meetup    || 0, color: '#f97316' },
                        { label: 'Community',    value: analytics.reportTypes?.community || 0, color: '#10b981' },
                      ]} />
                    </div>
                  </div>

                  {/* Content breakdown donut */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <h4 className="text-white font-bold text-sm mb-1">Content Breakdown</h4>
                    <p className="text-slate-500 text-xs mb-4">All-time content types on the platform</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(analytics.contentBreakdown as { label: string; value: number }[]).map((item, i) => {
                        const colors = ['#8b5cf6', '#f97316', '#06b6d4', '#10b981'];
                        const total = (analytics.contentBreakdown as { value: number }[]).reduce((s, x) => s + x.value, 0) || 1;
                        const pct = Math.round((item.value / total) * 100);
                        return (
                          <div key={i} className="bg-slate-800/60 rounded-xl p-4">
                            <p className="text-2xl font-extrabold" style={{ color: colors[i] }}>{item.value.toLocaleString()}</p>
                            <p className="text-xs text-slate-400 font-semibold mt-0.5">{item.label}</p>
                            <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[i] }} />
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{pct}% of content</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rankings row as tables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.topReported?.length > 0 && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" /> Most Reported Users
                        </h4>
                        <p className="text-slate-500 text-xs mb-4">Users with most pending reports against them</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="border-b border-slate-850 text-slate-500 uppercase font-mono">
                                <th className="py-2">User</th>
                                <th className="py-2">Reports</th>
                                <th className="py-2">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(analytics.topReported as { displayName: string; count: number; isSuspended: boolean; photoURL: string | null }[]).map((u, index) => (
                                <tr key={index} className="border-b border-slate-800/40 text-slate-300">
                                  <td className="py-2.5 flex items-center gap-2">
                                    <Avatar src={u.photoURL ?? undefined} name={u.displayName} size={24} />
                                    <span className="font-semibold text-white">{u.displayName}</span>
                                  </td>
                                  <td className="py-2.5 font-bold text-red-400">{u.count}</td>
                                  <td className="py-2.5">
                                    {u.isSuspended ? (
                                      <span className="text-[10px] text-orange-400 bg-orange-950/40 border border-orange-900/30 px-2 py-0.5 rounded-full font-bold">Suspended</span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-full font-bold">Active</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    {analytics.topPosters?.length > 0 && (
                      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                        <h4 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" /> Most Active Posters
                        </h4>
                        <p className="text-slate-500 text-xs mb-4">Users with most posts in the last 30 days</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className="border-b border-slate-855 text-slate-500 uppercase font-mono">
                                <th className="py-2">User</th>
                                <th className="py-2">Posts (30d)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(analytics.topPosters as { displayName: string; count: number; photoURL: string | null }[]).map((u, index) => (
                                <tr key={index} className="border-b border-slate-800/40 text-slate-300">
                                  <td className="py-2.5 flex items-center gap-2">
                                    <Avatar src={u.photoURL ?? undefined} name={u.displayName} size={24} />
                                    <span className="font-semibold text-white">{u.displayName}</span>
                                  </td>
                                  <td className="py-2.5 font-bold text-amber-400">{u.count}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── AUDIT LOG TAB ── */}
          {tab === 'audit' && (
            <>
              {/* Section specific stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-900/50 text-violet-300">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-white">{filteredAuditLogs.length}</p>
                    <p className="text-xs text-slate-500">Filtered Log Entries</p>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-900/50 text-blue-300">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">{auditSearch || 'Showing All logs'}</p>
                    <p className="text-xs text-slate-500">Current Search Filter</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input type="text" value={auditSearch} onChange={e => setAuditSearch(e.target.value)} placeholder="Filter by path, UID, status code..."
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-all placeholder-slate-500"
                  />
                </div>
                <p className="text-slate-600 text-xs ml-auto">{filteredAuditLogs.length} entries</p>
              </div>
              {auditLoading ? <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div> : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                          <th className="text-left px-4 py-3">Time</th>
                          <th className="text-left px-4 py-3">Method</th>
                          <th className="text-left px-4 py-3">Path</th>
                          <th className="text-left px-4 py-3">Status</th>
                          <th className="text-left px-4 py-3">Duration</th>
                          <th className="text-left px-4 py-3 hidden md:table-cell">UID</th>
                          <th className="text-left px-4 py-3 hidden lg:table-cell">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredAuditLogs.length === 0 ? <tr><td colSpan={7} className="text-center text-slate-500 py-12">No logs</td></tr> : filteredAuditLogs.map((log, i) => (
                          <tr key={i} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-4 py-2.5 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                            <td className="px-4 py-2.5"><span className={`px-1.5 py-0.5 rounded font-bold text-xs ${log.method === 'GET' ? 'text-blue-400' : log.method === 'POST' ? 'text-emerald-400' : log.method === 'DELETE' ? 'text-red-400' : 'text-amber-400'}`}>{log.method}</span></td>
                            <td className="px-4 py-2.5 text-slate-300 max-w-[200px] truncate">{log.path}</td>
                            <td className="px-4 py-2.5"><span className={`font-bold ${log.statusCode < 300 ? 'text-emerald-400' : log.statusCode < 400 ? 'text-blue-400' : log.statusCode < 500 ? 'text-amber-400' : 'text-red-400'}`}>{log.statusCode}</span></td>
                            <td className="px-4 py-2.5 text-slate-500">{log.duration}</td>
                            <td className="px-4 py-2.5 text-slate-600 hidden md:table-cell max-w-[120px] truncate">{log.uid !== 'anonymous' ? log.uid : <span className="text-slate-700">—</span>}</td>
                            <td className="px-4 py-2.5 text-slate-600 hidden lg:table-cell">{log.ip}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── SETTINGS TAB ── */}
          {tab === 'settings' && (
            <div className="max-w-xl space-y-6">
              {/* Section specific stats header */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-900/50 text-orange-300">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-white">{autoSuspendThreshold}</p>
                    <p className="text-xs text-slate-500">Auto Suspend Limit</p>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-900/50 text-emerald-300">
                    <Wifi className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-emerald-400">Connected</p>
                    <p className="text-xs text-slate-500">API Gateway Status</p>
                  </div>
                </div>
              </div>

              {settingsLoading ? <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div> : (
                <>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-orange-950 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-orange-400" /></div>
                      <div><h3 className="text-white font-bold text-base">Auto-Suspend Threshold</h3><p className="text-slate-400 text-xs">Automatically suspend users when they receive this many pending reports</p></div>
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="number" min={0} max={50} value={autoSuspendThreshold}
                        onChange={e => setAutoSuspendThreshold(Number(e.target.value))}
                        className="w-24 bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 transition-all text-center font-bold text-lg"
                      />
                      <div className="text-slate-400 text-sm">{autoSuspendThreshold === 0 ? <span className="text-slate-500 italic">Disabled — users are never auto-suspended</span> : <span>Users auto-suspended after <span className="text-orange-400 font-bold">{autoSuspendThreshold}</span> pending report{autoSuspendThreshold > 1 ? 's' : ''}</span>}</div>
                    </div>
                    <p className="text-slate-600 text-xs mb-5">Set to 0 to disable. Applies to all new reports from this point forward. Already-reported users are not retroactively suspended.</p>
                    <button onClick={handleSaveSettings} disabled={savingSettings} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
                      {savingSettings ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />} Save Settings
                    </button>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center"><Activity className="w-5 h-5 text-slate-400" /></div>
                      <div><h3 className="text-white font-bold text-base">App Info</h3><p className="text-slate-400 text-xs">Current runtime status</p></div>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-slate-500">Total users</dt><dd className="text-white font-semibold">{stats?.users?.toLocaleString() || '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Online now</dt><dd className="text-emerald-400 font-semibold">{stats?.onlineUsers || 0}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Push subscriptions</dt><dd className="text-yellow-400 font-semibold">{stats?.pushSubscriptions || 0}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Pending reports</dt><dd className={`font-semibold ${(stats?.pendingReports || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{stats?.pendingReports || 0}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Communities</dt><dd className="text-slate-300">{stats?.communities || 0}</dd></div>
                    </dl>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {deleteTarget && <DeleteUserModal user={deleteTarget} onCancel={() => !deleting && setDeleteTarget(null)} onConfirm={confirmDelete} />}
      {deleteComTarget && <DeleteCommunityModal community={deleteComTarget} onCancel={() => !deletingCom && setDeleteComTarget(null)} onConfirm={confirmDeleteCommunity} />}
      {showBroadcast && <BroadcastModal userCount={users.length} onSend={handleBroadcast} onCancel={() => !broadcasting && setShowBroadcast(false)} sending={broadcasting} />}
      {selectedReport && (
        <ReportDetailModal
          report={selectedReport}
          users={users}
          onClose={() => setSelectedReport(null)}
          onResolve={() => { resolveReport(selectedReport._id, 'resolved'); setSelectedReport(null); }}
          onDismiss={() => { resolveReport(selectedReport._id, 'dismissed'); setSelectedReport(null); }}
          onDeleteTarget={() => { const u = users.find(u => u.uid === selectedReport.targetUid); if (u) { setDeleteTarget(u); setSelectedReport(null); } }}
          onDeleteReporter={() => { const u = users.find(u => u.uid === selectedReport.reporterUid); if (u) { setDeleteTarget(u); setSelectedReport(null); } }}
          onViewProfile={(uid) => { const u = users.find(u => u.uid === uid); if (u) { setSelectedUser(u); setSelectedReport(null); } }}
        />
      )}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuspend={toggleSuspend}
          onDelete={u => { setDeleteTarget(u); setSelectedUser(null); }}
          suspending={suspending === selectedUser.uid}
        />
      )}
      {peekTarget && (
        <CommunityPeekModal
          communityId={peekTarget.id}
          token={token}
          onClose={() => setPeekTarget(null)}
          onViewMember={uid => {
            const u = users.find(u => u.uid === uid);
            if (u) { setSelectedUser(u); setPeekTarget(null); }
            else window.open(`/app/profile/${uid}`, '_blank');
          }}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
