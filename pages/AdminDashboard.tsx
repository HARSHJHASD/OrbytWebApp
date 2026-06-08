import {
  AlertTriangle, Ban, BookOpen, CheckCircle, ChevronDown, ChevronLeft,
  ChevronRight, ChevronUp, Download, FileText, Globe, Image, LogOut,
  Megaphone, RefreshCw, Search, Shield, Trash2, UserCheck, Users, X, XCircle,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { AdminCommunity, AdminPost, AdminReport, AdminUser } from '../types';

// helpers
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

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: number | string; sub?: string; color: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>{icon}</div>
      <div>
        <p className="text-2xl font-extrabold text-white">{value}</p>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick, count }: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5
        ${active ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 text-xs ${active ? 'bg-violet-500' : 'bg-slate-700 text-slate-300'}`}>{count}</span>
      )}
    </button>
  );
}

// Delete User Modal
function DeleteUserModal({ user, onConfirm, onCancel }: { user: AdminUser; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-950 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
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
          <button onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete Forever
          </button>
        </div>
      </div>
    </div>
  );
}

// Delete Community Modal
function DeleteCommunityModal({ community, onConfirm, onCancel }: { community: AdminCommunity; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-950 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
          <div>
            <h3 className="text-white font-bold text-base">Delete Community</h3>
            <p className="text-slate-400 text-xs">This action cannot be undone</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 mb-5">
          <p className="text-white font-semibold text-sm">{community.name}</p>
          <p className="text-slate-400 text-xs mt-1">{community.memberCount} members · {community.isPrivate ? 'Private' : 'Public'}</p>
          {community.description && <p className="text-slate-500 text-xs mt-1 truncate">{community.description}</p>}
        </div>
        <p className="text-slate-300 text-sm mb-5">This will permanently remove the community and all its messages.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete Community
          </button>
        </div>
      </div>
    </div>
  );
}

// Broadcast Modal
function BroadcastModal({ userCount, onSend, onCancel, sending }: {
  userCount: number; onSend: (title: string, message: string) => void; onCancel: () => void; sending: boolean;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-950 flex items-center justify-center"><Megaphone className="w-5 h-5 text-violet-400" /></div>
            <div>
              <h3 className="text-white font-bold text-base">Broadcast Announcement</h3>
              <p className="text-slate-400 text-xs">Will be sent to all {userCount.toLocaleString()} users</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Title (optional)</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Orbyt" maxLength={80}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Message <span className="text-red-400">*</span></label>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your announcement here..." maxLength={500} rows={4}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder-slate-500 resize-none"
            />
            <p className="text-slate-600 text-xs mt-1 text-right">{message.length}/500</p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCancel} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-colors text-sm">Cancel</button>
          <button
            onClick={() => onSend(title, message)}
            disabled={!message.trim() || sending}
            className="flex-1 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Megaphone className="w-4 h-4" />}
            Send to All
          </button>
        </div>
      </div>
    </div>
  );
}

// User Drawer
function UserDrawer({ user, onClose, onSuspend, onDelete, suspending }: {
  user: AdminUser; onClose: () => void; onSuspend: (u: AdminUser) => void; onDelete: (u: AdminUser) => void; suspending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-slate-900 border-l border-slate-800 w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-white font-bold text-base">User Details</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-6 border-b border-slate-800">
          <div className="flex items-center gap-4 mb-4">
            <Avatar src={user.photoURL} name={user.displayName} size={64} />
            <div>
              <p className="text-white font-bold text-lg leading-tight">{user.displayName}</p>
              <p className="text-slate-400 text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border
                  ${user.authType === 'google' ? 'border-blue-700 text-blue-400 bg-blue-950' : 'border-slate-700 text-slate-400 bg-slate-800'}`}>
                  {user.authType === 'google' ? 'Google' : 'Email'}
                </span>
                {user.isSuspended && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-orange-800 text-orange-400 bg-orange-950">Suspended</span>
                )}
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
            <div className="flex justify-between">
              <dt className="text-slate-500">Joined</dt>
              <dd className="text-slate-300">{user.createdAt ? new Date(user.createdAt as number).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Account Age</dt>
              <dd className="text-slate-300">{timeAgo(user.createdAt as number)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd className={user.isSuspended ? 'text-orange-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {user.isSuspended ? 'Suspended' : 'Active'}
              </dd>
            </div>
          </dl>
        </div>
        <div className="px-6 py-5 mt-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Actions</p>
          <div className="space-y-2">
            <button
              onClick={() => onSuspend(user)} disabled={suspending}
              className={`w-full flex items-center justify-center gap-2 font-semibold py-2.5 rounded-xl transition-colors text-sm
                ${user.isSuspended
                  ? 'bg-emerald-900/50 hover:bg-emerald-900 text-emerald-400 border border-emerald-800'
                  : 'bg-orange-900/50 hover:bg-orange-900 text-orange-400 border border-orange-800'}`}
            >
              {user.isSuspended ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              {user.isSuspended ? 'Unsuspend User' : 'Suspend User'}
            </button>
            <button
              onClick={() => onDelete(user)}
              className="w-full flex items-center justify-center gap-2 bg-red-900/50 hover:bg-red-900 text-red-400 border border-red-800 font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              <Trash2 className="w-4 h-4" /> Permanently Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type Tab = 'users' | 'posts' | 'reports' | 'communities';
type SortField = 'createdAt' | 'reportCount' | 'postCount' | 'displayName';
type UserFilter = 'all' | 'flagged' | 'suspended';
type ReportFilter = 'all' | 'pending' | 'resolved' | 'dismissed';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('admin_token') || '';

  const [tab, setTab] = useState<Tab>('users');
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
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [suspending, setSuspending] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [reportFilter, setReportFilter] = useState<ReportFilter>('pending');

  const [deleteComTarget, setDeleteComTarget] = useState<AdminCommunity | null>(null);
  const [deletingCom, setDeletingCom] = useState(false);

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPages, setPostsPages] = useState(1);
  const [postsFilter, setPostsFilter] = useState<'all' | 'flagged'>('all');
  const [deletingPost, setDeletingPost] = useState<string | null>(null);

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!token) navigate('/admin', { replace: true });
  }, [token, navigate]);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
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
      if (e?.message?.includes('Forbidden')) {
        sessionStorage.removeItem('admin_token');
        navigate('/admin', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchPosts = useCallback(async (page = 1, flagged = false) => {
    if (!token) return;
    setPostsLoading(true);
    try {
      const data = await api.admin.getPosts(token, page, flagged);
      setPosts(data.posts);
      setPostsTotal(data.total);
      setPostsPages(data.pages);
      setPostsPage(page);
    } catch (e: any) {
      showToast(e?.message || 'Failed to load posts', 'error');
    } finally {
      setPostsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (tab === 'posts') fetchPosts(1, postsFilter === 'flagged');
  }, [tab, postsFilter, fetchPosts]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.admin.deleteUser(token, deleteTarget.uid);
      setUsers(prev => prev.filter(u => u.uid !== deleteTarget.uid));
      setStats((prev: any) => prev ? { ...prev, users: prev.users - 1 } : prev);
      showToast(`${deleteTarget.displayName} deleted permanently.`, 'success');
      setSelectedUser(null);
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete user', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const toggleSuspend = async (user: AdminUser) => {
    setSuspending(user.uid);
    try {
      const res = await api.admin.suspendUser(token, user.uid);
      setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, isSuspended: res.isSuspended } : u));
      if (selectedUser?.uid === user.uid) setSelectedUser(prev => prev ? { ...prev, isSuspended: res.isSuspended } : null);
      showToast(res.isSuspended ? `${user.displayName} suspended.` : `${user.displayName} unsuspended.`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to update suspension', 'error');
    } finally {
      setSuspending(null);
    }
  };

  const resolveReport = async (id: string, status: 'resolved' | 'dismissed') => {
    try {
      await api.admin.resolveReport(token, id, status);
      setReports(prev => prev.map(r => r._id === id ? { ...r, status } : r));
      showToast(`Report ${status}.`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to update report', 'error');
    }
  };

  const confirmDeleteCommunity = async () => {
    if (!deleteComTarget) return;
    setDeletingCom(true);
    try {
      await api.admin.deleteCommunity(token, deleteComTarget.id);
      setCommunities(prev => prev.filter(c => c.id !== deleteComTarget.id));
      setStats((prev: any) => prev ? { ...prev, communities: prev.communities - 1 } : prev);
      showToast(`"${deleteComTarget.name}" deleted.`, 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete community', 'error');
    } finally {
      setDeletingCom(false);
      setDeleteComTarget(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    setDeletingPost(postId);
    try {
      await api.admin.deletePost(token, postId);
      setPosts(prev => prev.filter(p => p._id !== postId));
      setPostsTotal(t => t - 1);
      setStats((prev: any) => prev ? { ...prev, posts: prev.posts - 1 } : prev);
      showToast('Post deleted.', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Failed to delete post', 'error');
    } finally {
      setDeletingPost(null);
    }
  };

  const handleBroadcast = async (title: string, message: string) => {
    setBroadcasting(true);
    try {
      const res = await api.admin.broadcast(token, title, message);
      showToast(`Announcement sent to ${res.sent.toLocaleString()} users.`, 'success');
      setShowBroadcast(false);
    } catch (e: any) {
      showToast(e?.message || 'Failed to broadcast', 'error');
    } finally {
      setBroadcasting(false);
    }
  };

  const exportCSV = () => {
    const headers = ['UID', 'Display Name', 'Email', 'Auth Type', 'Posts', 'Stories', 'Friends', 'Reports', 'Suspended', 'Joined'];
    const rows = filteredUsers.map(u => [
      u.uid, u.displayName, u.email, u.authType,
      u.postCount, u.storyCount, u.friendCount, u.reportCount,
      u.isSuspended ? 'Yes' : 'No',
      u.createdAt ? new Date(u.createdAt as number).toLocaleDateString() : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbyt-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredUsers = users
    .filter(u => {
      const q = search.toLowerCase();
      const matchesSearch = !q || u.displayName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.uid.includes(q);
      const matchesFilter = userFilter === 'all' ? true : userFilter === 'flagged' ? u.reportCount > 0 : u.isSuspended;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let diff = 0;
      if (sortField === 'displayName') diff = (a.displayName || '').localeCompare(b.displayName || '');
      else if (sortField === 'createdAt') diff = new Date(a.createdAt as number).getTime() - new Date(b.createdAt as number).getTime();
      else diff = (a[sortField] as number) - (b[sortField] as number);
      return sortAsc ? diff : -diff;
    });

  const filteredReports = reports.filter(r => reportFilter === 'all' || r.status === reportFilter);

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

  const pendingCount = reports.filter(r => r.status === 'pending').length;
  const suspendedCount = users.filter(u => u.isSuspended).length;
  const flaggedCount = users.filter(u => u.reportCount > 0).length;

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {toast && (
        <div className={`fixed top-5 right-5 z-[60] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl text-sm font-semibold
          ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="border-b border-slate-800 bg-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-white text-lg tracking-tight">Orbyt Admin</span>
          <span className="text-slate-500 text-xs border border-slate-700 rounded-full px-2 py-0.5 ml-1">Super Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Broadcast</span>
          </button>
          <button onClick={fetchAll} disabled={loading} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={logout} className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm font-semibold px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-400 rounded-xl px-5 py-4 mb-6 text-sm flex items-center gap-3">
            <XCircle className="w-5 h-5 flex-shrink-0" />{error}
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <StatCard icon={<Users className="w-6 h-6 text-violet-300" />} label="Total Users" value={stats.users} sub={`+${stats.newUsers7d} this week`} color="bg-violet-900/50" />
            <StatCard icon={<FileText className="w-6 h-6 text-blue-300" />} label="Posts" value={stats.posts} color="bg-blue-900/50" />
            <StatCard icon={<Image className="w-6 h-6 text-cyan-300" />} label="Stories" value={stats.stories} color="bg-cyan-900/50" />
            <StatCard icon={<AlertTriangle className="w-6 h-6 text-red-300" />} label="Pending Reports" value={stats.pendingReports} color="bg-red-900/50" />
            <StatCard icon={<BookOpen className="w-6 h-6 text-emerald-300" />} label="Communities" value={stats.communities} color="bg-emerald-900/50" />
            <StatCard icon={<Ban className="w-6 h-6 text-orange-300" />} label="Suspended" value={suspendedCount} color="bg-orange-900/50" />
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          {(['users', 'posts', 'reports', 'communities'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all capitalize
                ${tab === t ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              {t === 'reports' && pendingCount > 0 && (
                <span className="mr-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{pendingCount}</span>
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* USERS TAB */}
        {tab === 'users' && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3 flex-wrap">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or UID..."
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder-slate-500"
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
            <p className="text-slate-600 text-xs mb-3">{filteredUsers.length} of {users.length} users — click a row to view details</p>

            {loading ? (
              <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div>
            ) : (
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
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={8} className="text-center text-slate-500 py-16">No users found</td></tr>
                      ) : filteredUsers.map(user => (
                        <tr
                          key={user.uid}
                          onClick={() => setSelectedUser(user)}
                          className={`hover:bg-slate-800/40 transition-colors group cursor-pointer ${user.isSuspended ? 'opacity-60' : ''}`}
                        >
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
                            {user.reportCount > 0 ? (
                              <span className={`font-bold text-sm px-2 py-0.5 rounded-lg ${user.reportCount >= 3 ? 'bg-red-950 text-red-400' : 'bg-amber-950 text-amber-400'}`}>{user.reportCount}</span>
                            ) : <span className="text-slate-600 text-sm">0</span>}
                          </td>
                          <td className="px-4 py-4 text-slate-300 font-medium">{user.postCount}</td>
                          <td className="px-4 py-4 text-slate-300 hidden md:table-cell">{user.storyCount}</td>
                          <td className="px-4 py-4 text-slate-300 hidden lg:table-cell">{user.friendCount}</td>
                          <td className="px-4 py-4 text-slate-500 hidden sm:table-cell text-xs">{timeAgo(user.createdAt as number)}</td>
                          <td className="px-4 py-4">
                            {user.isSuspended
                              ? <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-orange-800 text-orange-400 bg-orange-950">Suspended</span>
                              : <span className="text-xs px-2 py-0.5 rounded-full font-medium border border-emerald-800 text-emerald-400 bg-emerald-950">Active</span>}
                          </td>
                          <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
                              <button
                                onClick={() => toggleSuspend(user)} disabled={suspending === user.uid}
                                className={`p-1.5 rounded-xl transition-colors ${user.isSuspended ? 'text-emerald-400 hover:bg-emerald-950' : 'text-orange-400 hover:bg-orange-950'}`}
                              >
                                {user.isSuspended ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => setDeleteTarget(user)} className="p-1.5 text-red-500 hover:bg-red-950 rounded-xl transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

        {/* POSTS TAB */}
        {tab === 'posts' && (
          <>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <FilterPill label="All Posts" active={postsFilter === 'all'} onClick={() => setPostsFilter('all')} />
              <FilterPill label="Flagged" active={postsFilter === 'flagged'} onClick={() => setPostsFilter('flagged')} />
              <p className="text-slate-600 text-xs ml-auto">{postsTotal.toLocaleString()} total posts</p>
            </div>

            {postsLoading ? (
              <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center text-slate-500 py-16">No posts found</div>
            ) : (
              <>
                <div className="space-y-3">
                  {posts.map(post => (
                    <div key={post._id} className={`bg-slate-900 border rounded-2xl px-5 py-4 flex gap-4 group ${post.reportCount > 0 ? 'border-red-900/50' : 'border-slate-800'}`}>
                      <Avatar src={post.authorPhoto} name={post.authorName} size={38} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-white font-semibold text-sm">{post.authorName}</span>
                          {post.reportCount > 0 && (
                            <span className="text-xs font-bold bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded-full">
                              {post.reportCount} report{post.reportCount > 1 ? 's' : ''}
                            </span>
                          )}
                          {post.imageURL && <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">has image</span>}
                          <span className="text-slate-600 text-xs ml-auto">{timeAgo(post.createdAt)}</span>
                        </div>
                        {post.content && <p className="text-slate-300 text-sm line-clamp-2 mb-2">{post.content}</p>}
                        <div className="flex items-center gap-3 text-slate-600 text-xs">
                          <span>{post.likeCount} likes</span>
                          <span>{post.commentCount} comments</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePost(post._id)} disabled={deletingPost === post._id}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 flex items-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-950 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all self-start"
                      >
                        {deletingPost === post._id
                          ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                {postsPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6">
                    <button
                      onClick={() => fetchPosts(postsPage - 1, postsFilter === 'flagged')} disabled={postsPage <= 1}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-slate-400 text-sm">Page {postsPage} of {postsPages}</span>
                    <button
                      onClick={() => fetchPosts(postsPage + 1, postsFilter === 'flagged')} disabled={postsPage >= postsPages}
                      className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-xl transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* REPORTS TAB */}
        {tab === 'reports' && (
          <>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <FilterPill label="All" active={reportFilter === 'all'} onClick={() => setReportFilter('all')} count={reports.length} />
              <FilterPill label="Pending" active={reportFilter === 'pending'} onClick={() => setReportFilter('pending')} count={reports.filter(r => r.status === 'pending').length} />
              <FilterPill label="Resolved" active={reportFilter === 'resolved'} onClick={() => setReportFilter('resolved')} count={reports.filter(r => r.status === 'resolved').length} />
              <FilterPill label="Dismissed" active={reportFilter === 'dismissed'} onClick={() => setReportFilter('dismissed')} count={reports.filter(r => r.status === 'dismissed').length} />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-3">
                {filteredReports.length === 0 && <div className="text-center text-slate-500 py-16">No reports found</div>}
                {filteredReports.map(r => (
                  <div key={r._id} className={`bg-slate-900 border rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4
                    ${r.status === 'pending' ? 'border-slate-700' : 'border-slate-800 opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full border
                          ${r.status === 'pending' ? 'bg-red-950 text-red-400 border-red-900' :
                            r.status === 'resolved' ? 'bg-emerald-950 text-emerald-400 border-emerald-900' :
                            'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          {r.status.toUpperCase()}
                        </span>
                        <span className="text-slate-300 text-sm font-semibold">{r.reason}</span>
                      </div>
                      <p className="text-slate-500 text-xs">
                        Reported by <span className="text-slate-300">{r.reporterName}</span>
                        {' -> '}Target: <span
                          className="text-slate-300 cursor-pointer hover:text-violet-400 transition-colors"
                          onClick={() => { const u = users.find(u => u.uid === r.targetUid); if (u) setSelectedUser(u); }}
                        >{r.targetName}</span>
                        {r.postId && <span> · Post: <span className="font-mono text-slate-400">{r.postId.slice(0, 8)}...</span></span>}
                      </p>
                      <p className="text-slate-600 text-xs mt-1">{timeAgo(r.createdAt)}</p>
                    </div>
                    {r.status === 'pending' && (
                      <div className="flex gap-2 flex-shrink-0 flex-wrap">
                        <button onClick={() => resolveReport(r._id, 'resolved')} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                          <CheckCircle className="w-3.5 h-3.5" /> Resolve
                        </button>
                        <button onClick={() => resolveReport(r._id, 'dismissed')} className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors">
                          <XCircle className="w-3.5 h-3.5" /> Dismiss
                        </button>
                        <button
                          onClick={() => { const u = users.find(u => u.uid === r.targetUid); if (u) setDeleteTarget(u); }}
                          className="flex items-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete User
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* COMMUNITIES TAB */}
        {tab === 'communities' && (
          <>
            <p className="text-slate-600 text-xs mb-4">{communities.length} communities total</p>
            {loading ? (
              <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-slate-700 border-t-violet-500 rounded-full animate-spin" /></div>
            ) : communities.length === 0 ? (
              <div className="text-center text-slate-500 py-16">No communities yet</div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                        <th className="text-left px-5 py-4 font-semibold">Community</th>
                        <th className="text-left px-4 py-4 font-semibold">Members</th>
                        <th className="text-left px-4 py-4 font-semibold hidden sm:table-cell">Type</th>
                        <th className="text-left px-4 py-4 font-semibold hidden md:table-cell">Tags</th>
                        <th className="text-left px-4 py-4 font-semibold hidden lg:table-cell">Created</th>
                        <th className="px-4 py-4" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {communities.map(c => (
                        <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-700 flex items-center justify-center flex-shrink-0">
                                <Globe className="w-4 h-4 text-white" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-white truncate max-w-[200px]">{c.name}</p>
                                {c.description && <p className="text-slate-500 text-xs truncate max-w-[200px]">{c.description}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-white font-bold">{c.memberCount}</td>
                          <td className="px-4 py-4 hidden sm:table-cell">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium
                              ${c.isPrivate ? 'border-violet-700 text-violet-400 bg-violet-950' : 'border-slate-700 text-slate-400 bg-slate-800'}`}>
                              {c.isPrivate ? 'Private' : 'Public'}
                            </span>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {c.tags.slice(0, 3).map(tag => <span key={tag} className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{tag}</span>)}
                              {c.tags.length > 3 && <span className="text-xs text-slate-600">+{c.tags.length - 3}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-500 text-xs hidden lg:table-cell">{timeAgo(c.createdAt)}</td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => setDeleteComTarget(c)}
                              className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-red-500 hover:text-red-400 hover:bg-red-950 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
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

      </div>

      {deleteTarget && <DeleteUserModal user={deleteTarget} onCancel={() => !deleting && setDeleteTarget(null)} onConfirm={confirmDelete} />}
      {deleteComTarget && <DeleteCommunityModal community={deleteComTarget} onCancel={() => !deletingCom && setDeleteComTarget(null)} onConfirm={confirmDeleteCommunity} />}
      {showBroadcast && <BroadcastModal userCount={users.length} onSend={handleBroadcast} onCancel={() => !broadcasting && setShowBroadcast(false)} sending={broadcasting} />}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuspend={toggleSuspend}
          onDelete={u => { setDeleteTarget(u); setSelectedUser(null); }}
          suspending={suspending === selectedUser.uid}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
