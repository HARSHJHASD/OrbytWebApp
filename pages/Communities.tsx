import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Community } from '../types';
import {
  Hash, Plus, Users, ArrowRight, Trash2, Pencil, LogOut,
  Loader2, Search, X, Crown, MessageCircle
} from 'lucide-react';

// ─── Create / Edit Modal ────────────────────────────────────────────────────
interface RoomModalProps {
  initial?: { name: string; description: string };
  onClose: () => void;
  onSave: (name: string, description: string) => Promise<void>;
}

const RoomModal: React.FC<RoomModalProps> = ({ initial, onClose, onSave }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError('Name must be at least 2 characters'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(name.trim(), description.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-900 rounded-t-3xl p-6 border-t border-slate-800 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
        <h2 className="text-xl font-bold text-white mb-5">
          {initial ? 'Edit Room' : 'Create a Room'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Room Name <span className="text-primary-500">*</span>
            </label>
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
              placeholder="e.g. Weekend Hikers, Book Club, Music Lovers…"
              value={name}
              maxLength={80}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">
              Description <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
              placeholder="What's this room about?"
              rows={3}
              value={description}
              maxLength={300}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 font-semibold hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary-500 text-white font-bold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {initial ? 'Save Changes' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Communities Page ───────────────────────────────────────────────────
const Communities: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'discover' | 'my'>('discover');
  const [allRooms, setAllRooms] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editRoom, setEditRoom] = useState<Community | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // roomId being acted on

  const fetchRooms = useCallback(async () => {
    try {
      const data = await api.communities.getAll();
      setAllRooms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Derived lists
  const myRooms = allRooms.filter(r => user && r.members.includes(user.uid));
  const searchLower = search.toLowerCase();

  const visibleRooms = (tab === 'my' ? myRooms : allRooms).filter(r =>
    r.name.toLowerCase().includes(searchLower) ||
    (r.description || '').toLowerCase().includes(searchLower)
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleCreate = async (name: string, description: string) => {
    if (!user) return;
    const { id } = await api.communities.create(user.uid, name, description);
    await fetchRooms();
    navigate(`/app/rooms/${id}`);
  };

  const handleEdit = async (name: string, description: string) => {
    if (!user || !editRoom) return;
    await api.communities.update(editRoom._id, user.uid, name, description);
    setAllRooms(prev => prev.map(r => r._id === editRoom._id ? { ...r, name, description } : r));
  };

  const handleJoin = async (room: Community) => {
    if (!user) return;
    setActionLoading(room._id);
    try {
      await api.communities.join(room._id, user.uid);
      setAllRooms(prev => prev.map(r => r._id === room._id ? { ...r, members: [...r.members, user.uid] } : r));
      navigate(`/app/rooms/${room._id}`);
    } catch (e: any) {
      alert(e.message || 'Failed to join room');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeave = async (room: Community) => {
    if (!user || !confirm(`Leave "${room.name}"?`)) return;
    setActionLoading(room._id);
    try {
      await api.communities.leave(room._id, user.uid);
      setAllRooms(prev => prev.map(r => r._id === room._id ? { ...r, members: r.members.filter(m => m !== user.uid) } : r));
    } catch (e: any) {
      alert(e.message || 'Failed to leave room');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (room: Community) => {
    if (!user || !confirm(`Delete "${room.name}"? This cannot be undone.`)) return;
    setActionLoading(room._id);
    try {
      await api.communities.delete(room._id, user.uid);
      setAllRooms(prev => prev.filter(r => r._id !== room._id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete room');
    } finally {
      setActionLoading(null);
    }
  };

  const isOwner = (room: Community) => user?.uid === room.ownerUid;
  const isMember = (room: Community) => user ? room.members.includes(user.uid) : false;

  return (
    <div className="flex flex-col min-h-full bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/60 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Rooms</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">
              Local Interest Groups
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30 active:scale-95 transition-transform"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="w-full bg-slate-800/70 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500/50 transition-colors"
            placeholder="Search rooms…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900 p-1 rounded-xl">
          {(['discover', 'my'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t === 'discover' ? `Discover (${allRooms.length})` : `My Rooms (${myRooms.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary-500 animate-spin" />
          </div>
        ) : visibleRooms.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <Hash className="w-8 h-8 text-slate-700" />
            </div>
            <p className="text-slate-500 font-medium">
              {tab === 'my' ? "You have not joined any rooms yet." : 'No rooms found. Be the first!'}
            </p>
            {tab === 'my' && (
              <button
                onClick={() => setTab('discover')}
                className="mt-3 text-primary-400 text-sm font-semibold"
              >
                Browse public rooms →
              </button>
            )}
          </div>
        ) : (
          visibleRooms.map(room => {
            const member = isMember(room);
            const owner = isOwner(room);
            const busy = actionLoading === room._id;

            return (
              <div
                key={room._id}
                className="bg-slate-900/70 border border-slate-800/60 rounded-2xl p-4 flex flex-col gap-3 animate-fade-in"
              >
                {/* Room info */}
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <Hash className="w-5 h-5 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-white text-sm truncate">{room.name}</h3>
                      {owner && (
                        <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    {room.description && (
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{room.description}</p>
                    )}
                    <div className="flex items-center gap-1 mt-1.5 text-slate-500 text-xs">
                      <Users className="w-3 h-3" />
                      <span>{room.members.length} {room.members.length === 1 ? 'member' : 'members'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {member ? (
                    <button
                      onClick={() => navigate(`/app/rooms/${room._id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary-500 text-white text-sm font-bold active:scale-[0.98] transition-transform"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enter Room
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(room)}
                      disabled={busy}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary-500/10 border border-primary-500/30 text-primary-400 text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Join Room
                    </button>
                  )}

                  {/* Owner controls */}
                  {owner && (
                    <>
                      <button
                        onClick={() => setEditRoom(room)}
                        className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(room)}
                        disabled={busy}
                        className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </>
                  )}

                  {/* Non-owner member: leave */}
                  {member && !owner && (
                    <button
                      onClick={() => handleLeave(room)}
                      disabled={busy}
                      className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50"
                      title="Leave room"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Room Modal */}
      {showCreate && (
        <RoomModal onClose={() => setShowCreate(false)} onSave={handleCreate} />
      )}

      {/* Edit Room Modal */}
      {editRoom && (
        <RoomModal
          initial={{ name: editRoom.name, description: editRoom.description || '' }}
          onClose={() => setEditRoom(null)}
          onSave={handleEdit}
        />
      )}
    </div>
  );
};

export default Communities;
