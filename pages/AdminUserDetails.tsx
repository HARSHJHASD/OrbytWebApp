import { AlertTriangle, ChevronLeft, Image as ImageIcon, MessageSquare, Shield, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import { api } from '../services/api';
import { timeAgo } from '../utils/formatTime';

interface ComprehensiveData {
  user: any;
  posts: any[];
  comments: any[];
  stories: any[];
  communities: any[];
  chats: any[];
  reports: any[];
}

export default function AdminUserDetails() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const token = sessionStorage.getItem('admin_token');

  const [data, setData] = useState<ComprehensiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/admin');
      return;
    }
    const fetchData = async () => {
      try {
        if (!uid) return;
        const result = await api.admin.getComprehensiveUserDetails(token, uid);
        setData(result.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch user data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [uid, token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 p-8 flex flex-col items-center justify-center text-white">
        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading User</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button onClick={() => navigate('/admin/dashboard')} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl">Back to Dashboard</button>
      </div>
    );
  }

  const { user, posts, comments, stories, communities, chats, reports } = data;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <div className="border-b border-slate-800 bg-slate-900 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate('/admin/dashboard')} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-3 flex-1">
            <Avatar src={user.photoURL} name={user.displayName} size={40} />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                {user.displayName}
                {user.badgeTitle && <span className="bg-blue-900 text-blue-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">{user.badgeTitle}</span>}
              </h1>
              <p className="text-slate-500 text-xs">{user.email} • UID: <span className="font-mono">{user.uid}</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            {user.isSuspended && <span className="bg-orange-950 text-orange-400 border border-orange-800 px-3 py-1.5 rounded-xl text-xs font-bold uppercase">Suspended</span>}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Left Column: Profile Info */}
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm flex items-center gap-2"><User className="w-4 h-4 text-blue-400" /> Profile Details</h3>
              <div className="space-y-4 text-sm">
                <div><span className="text-slate-500 block text-xs">Bio</span><span className="text-slate-300">{user.bio || '—'}</span></div>
                <div><span className="text-slate-500 block text-xs">Job Role</span><span className="text-slate-300">{user.jobRole || '—'}</span></div>
                <div><span className="text-slate-500 block text-xs">Gender</span><span className="text-slate-300 capitalize">{user.gender || '—'}</span></div>
                <div><span className="text-slate-500 block text-xs">DOB</span><span className="text-slate-300">{user.dob || '—'}</span></div>
                <div><span className="text-slate-500 block text-xs">Instagram</span><span className="text-slate-300">{user.instagramHandle || '—'}</span></div>
                <div><span className="text-slate-500 block text-xs">Location</span><span className="text-slate-300">{user.location?.city ? `${user.location.city}, ${user.location.country}` : '—'}</span></div>
                <div><span className="text-slate-500 block text-xs">Joined</span><span className="text-slate-300">{new Date(user.createdAt).toLocaleDateString()} ({timeAgo(user.createdAt)})</span></div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
              <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Stats & Counts</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-2xl font-bold text-white">{posts.length}</p>
                  <p className="text-xs text-slate-500">Posts</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-2xl font-bold text-white">{comments.length}</p>
                  <p className="text-xs text-slate-500">Comments</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-2xl font-bold text-white">{stories.length}</p>
                  <p className="text-xs text-slate-500">Stories</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-2xl font-bold text-white">{communities.length}</p>
                  <p className="text-xs text-slate-500">Communities</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-2xl font-bold text-white">{chats.length}</p>
                  <p className="text-xs text-slate-500">Chats</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <p className="text-2xl font-bold text-white">{reports.length}</p>
                  <p className="text-xs text-slate-500">Reports Filed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Activity */}
          <div className="md:col-span-2 space-y-6">

            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                <h3 className="text-white font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-400" /> Recent Posts</h3>
              </div>
              <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
                {posts.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">No posts yet</p> : posts.map(post => (
                  <div key={post._id} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-sm text-slate-300">{post.content || <span className="italic text-slate-500">[Media Only]</span>}</p>
                    {post.mediaUrls?.length > 0 && <div className="mt-2 text-xs text-blue-400">{post.mediaUrls.length} attached media</div>}
                    <p className="text-xs text-slate-600 mt-2">{timeAgo(post.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                <h3 className="text-white font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-400" /> Recent Comments</h3>
              </div>
              <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto">
                {comments.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">No comments yet</p> : comments.map(c => (
                  <div key={c._id} className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <p className="text-sm text-slate-300">{c.content}</p>
                    <p className="text-xs text-slate-600 mt-2">{timeAgo(c.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-800/50">
                <h3 className="text-white font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-red-400" /> Admin View: Private Chats</h3>
              </div>
              <div className="p-4">
                <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-4 text-sm text-red-200 mb-4 flex gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500" />
                  <div>
                    <strong className="block text-red-400 mb-1">Privacy Warning</strong>
                    You are viewing private end-to-end conversation metadata. Do not share this information outside the administrative context.
                  </div>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {chats.length === 0 ? <p className="text-slate-500 text-sm text-center py-4">No chats</p> : chats.map(chat => (
                    <div key={chat._id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-slate-300 font-medium">{chat.isGroup ? chat.groupName : '1-on-1 Chat'}</p>
                        <p className="text-xs text-slate-500">{chat.participants?.length} participants</p>
                      </div>
                      <span className="text-xs text-slate-600">{timeAgo(chat.updatedAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
