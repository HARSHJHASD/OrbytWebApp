import {
    AlertTriangle,
    BookOpen,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    FileText,
    Image,
    LogOut,
    RefreshCw,
    Search,
    Shield,
    Trash2,
    Users,
    X,
    XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { AdminReport, AdminUser } from '../types';

// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(ts: number | Date): string {
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ms).toLocaleDateString();
}

function Avatar({ src, name, size = 36 }: { src?: string; name: string; size?: number }) {
  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  return src ? (
    <img src={src} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} />
  ) : (
    <div
      className="rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold flex-shrink-0 select-none"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}

// ─── stat card ──────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string;
  sub?: string; color: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white">{value}</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── delete confirm modal ────────────────────────────────────────────────────

function DeleteModal({ user, onConfirm, onCancel }: {
  user: AdminUser; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-950 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Permanently Delete User</h3>
            <p className="text-slate-400 text-xs">This action cannot be undone</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-4 mb-5 flex items-center gap-3">
          <Avatar src={user.photoURL} name={user.displayName} size={40} />
          <div>
            <p className="text-white font-semibold text-sm">{user.displayName}</p>
            <p className="text-slate-400 text-xs">{user.email}</p>
          </div>
        </div>

        <p className="text-slate-300 text-sm mb-5 leading-relaxed">
          This will permanently delete the account and <span className="text-red-400 font-semibold">all</span> associated data:
          <span className="text-slate-200"> {user.postCount} posts, {user.storyCount} stories, all messages, notifications, and friend connections.</span>
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── main dashboard ──────────────────────────────────────────────────────────

type Tab = 'users' | 'reports';
type SortField = 'createdAt' | 'reportCount' | 'postCount' | 'displayName';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('admin_token') || '';

  const [tab, setTab] = useState<Tab>('users');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('reportCount');
  const [sortAsc, setSortAsc] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // ── auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) navigate('/admin', { replace: true });
  }, [token, navigate]);

  // ── fetch data ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [statsData, usersData, reportsData] = await Promise.all([
        api.admin.getStats(token),
        api.admin.getUsers(token),
        api.admin.getReports(token),
      ]);
      setStats(statsData);
      setUsers(usersData.users);
      setReports(reportsData.reports);
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
      if (e?.message?.includes('Forbidden')) {
        sessionStorage.removeItem('admin_token');
        navigate('/admin', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── delete user ───────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.admin.deleteUser(token, deleteTarget.uid);
      setUsers(prev => prev.filter(u => u.uid !== deleteTarget.uid));
      setStats((prev: any) => prev ? { ...prev, users: prev.users - 1 } : prev);
      showToast(`${deleteTarget.displayName} deleted permanently.`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  // ── resolve report ────────────────────────────────────────────────────────
  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      await api.admin.resolveReport(token, id, status);
      setReports(prev => prev.map(r => r._id === id ? { ...r, status } : r));
      showToast(`Report ${status}.`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to update report', 'error');
    }
  };

  // ── sort + filter users ───────────────────────────────────────────────────
  const filteredUsers = users
    .filter(u => {
      const q = search.toLowerCase();
      return !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.uid.includes(q);
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortField === 'displayName') {
        diff = (a.displayName || '').localeCompare(b.displayName || '');
      } else if (sortField === 'createdAt') {
        diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        diff = (a[sortField] as number) - (b[sortField] as number);
      }
      return sortAsc ? diff : -diff;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(v => !v);
    else { setSortField(field); setSortAsc(false); }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? (sortAsc ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)
      : null;

  const logout = () => {
    sessionStorage.removeItem('admin_token');
    navigate('/admin', { replace: true });
  };

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold transition-all
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">Orbyt Admin</span>
          <span className="text-slate-500 text-xs border border-slate-700 rounded-full px-2 py-0.5 ml-1">Super Admin</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 rounded-xl px-5 py-4 mb-6 text-sm flex items-center gap-3">
            <XCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard icon={<Users className="w-6 h-6 text-violet-300" />} label="Total Users" value={stats.users} sub={`+${stats.newUsers7d} this week`} color="bg-violet-900/50" />
            <StatCard icon={<FileText className="w-6 h-6 text-blue-300" />} label="Posts" value={stats.posts} color="bg-blue-900/50" />
            <StatCard icon={<Image className="w-6 h-6 text-cyan-300" />} label="Stories" value={stats.stories} color="bg-cyan-900/50" />
            <StatCard icon={<AlertTriangle className="w-6 h-6 text-red-300" />} label="Pending Reports" value={stats.pendingReports} color="bg-red-900/50" />
            <StatCard icon={<BookOpen className="w-6 h-6 text-emerald-300" />} label="Communities" value={stats.communities} color="bg-emerald-900/50" />
            <StatCard icon={<Users className="w-6 h-6 text-amber-300" />} label="New (7d)" value={stats.newUsers7d} color="bg-amber-900/50" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['users', 'reports'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all capitalize
                ${tab === t ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              {t === 'reports' && stats?.pendingReports > 0 && (
                <span className="mr-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{stats.pendingReports}</span>
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <>
            {/* Search + count */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email or UID…"
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder-slate-500"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-slate-500 text-sm">{filteredUsers.length} of {users.length} users</p>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="text-left px-5 py-4 font-semibold">User</th>
                        <th className="text-left px-4 py-4 font-semibold cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('reportCount')}>
                          Reports <SortIcon field="reportCount" />
                        </th>
                        <th className="text-left px-4 py-4 font-semibold cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort('postCount')}>
                          Posts <SortIcon field="postCount" />
                        </th>
                        <th className="text-left px-4 py-4 font-semibold hidden md:table-cell">Stories</th>
                        <th className="text-left px-4 py-4 font-semibold hidden lg:table-cell">Friends</th>
                        <th className="text-left px-4 py-4 font-semibold cursor-pointer select-none hover:text-white transition-colors hidden sm:table-cell" onClick={() => toggleSort('createdAt')}>
                          Joined <SortIcon field="createdAt" />
                        </th>
                        <th className="text-left px-4 py-4 font-semibold">Auth</th>
                        <th className="px-4 py-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center text-slate-500 py-16">No users found</td>
                        </tr>
                      ) : filteredUsers.map(user => (
                        <tr key={user.uid} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar src={user.photoURL} name={user.displayName} size={38} />
                              <div className="min-w-0">
                                <p className="font-semibold text-white truncate max-w-[160px]">{user.displayName}</p>
                                <p className="text-slate-500 text-xs truncate max-w-[160px]">{user.email}</p>
                                <p className="text-slate-700 text-xs font-mono truncate max-w-[120px]">{user.uid.slice(0, 16)}…</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {user.reportCount > 0 ? (
                              <span className={`font-bold text-sm px-2 py-0.5 rounded-lg ${user.reportCount >= 3 ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>
                                {user.reportCount}
                              </span>
                            ) : (
                              <span className="text-slate-600 text-sm">0</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-slate-300 font-medium">{user.postCount}</td>
                          <td className="px-4 py-4 text-slate-300 hidden md:table-cell">{user.storyCount}</td>
                          <td className="px-4 py-4 text-slate-300 hidden lg:table-cell">{user.friendCount}</td>
                          <td className="px-4 py-4 text-slate-500 hidden sm:table-cell text-xs">
                            {timeAgo(user.createdAt as number)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border
                              ${user.authType === 'google' ? 'border-blue-700 text-blue-400 bg-blue-950' : 'border-slate-700 text-slate-400 bg-slate-800'}`}>
                              {user.authType === 'google' ? 'Google' : 'Email'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-950 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                              title="Delete user permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
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

        {/* ── REPORTS TAB ── */}
        {tab === 'reports' && (
          <>
            <p className="text-slate-400 text-sm mb-4">{reports.filter(r => r.status === 'pending').length} pending · {reports.length} total</p>
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {reports.length === 0 && (
                  <div className="text-center text-slate-500 py-16">No reports yet</div>
                )}
                {reports.map(r => (
                  <div
                    key={r._id}
                    className={`bg-slate-900 border rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4
                      ${r.status === 'pending' ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded-full border border-red-900">
                          {r.status.toUpperCase()}
                        </span>
                        <span className="text-slate-300 text-sm font-semibold">{r.reason}</span>
                      </div>
                      <p className="text-slate-500 text-xs">
                        Reported by <span className="text-slate-300">{r.reporterName}</span>
                        {' → '}Target: <span className="text-slate-300">{r.targetName}</span>
                        {r.postId && <span> · Post: <span className="font-mono text-slate-400">{r.postId.slice(0, 8)}…</span></span>}
                      </p>
                      <p className="text-slate-600 text-xs mt-1">{timeAgo(r.createdAt)}</p>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => resolveReport(r._id, 'resolved')}
                          className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                        <button
                          onClick={() => resolveReport(r._id, 'dismissed')}
                          className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Dismiss
                        </button>
                        <button
                          onClick={() => {
                            const u = users.find(u => u.uid === r.targetUid);
                            if (u) setDeleteTarget(u);
                          }}
                          className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete User
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
