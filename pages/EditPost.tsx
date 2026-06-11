import {
  AlertCircle,
  ChevronLeft,
  Image as ImageIcon,
  Loader2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { compressImage } from "../util/ImageCompression";

const EditPost: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id || !user) return;
      try {
        const post = await api.posts.getPost(id);
        if (post) {
          if (post.uid !== user.uid) {
            navigate("/app"); // Unauthorized
            return;
          }
          setContent(post.content);
          setImage(post.imageURL || null);
        } else {
          setError("Post not found");
        }
      } catch (err) {
        setError("Failed to fetch post");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, user, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setError("Image is too large (Max 20MB)");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        // Optimize for feed: Balanced compression
        const compressed = await compressImage(file, 640, 0.5);
        setImage(compressed);
      } catch (err: any) {
        setError(err.message || "Failed to process image.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (trimmed.length < 10 && !image) {
      setError("Post content must be at least 10 characters long.");
      return;
    }
    if (trimmed.length > 2000) {
      setError("Post content cannot exceed 2000 characters.");
      return;
    }
    if (!user || !id) return;

    setSaving(true);
    setError(null);

    try {
      await api.posts.updatePost(id, user.uid, content, image);
      navigate("/app/profile");
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to update post. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 shadow-sm z-30 sticky top-0 border-b border-slate-800">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={() => navigate("/app/profile")}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          {/* Title */}
          <span className="font-bold text-white text-lg">Edit</span>

          {/* Save Button (Same as CreatePost) */}
          <button
            onClick={handleSubmit}
            disabled={saving || (!content.trim() && !image)}
            className="text-primary-500 font-bold text-base hover:text-primary-400 transition-colors disabled:opacity-50 flex items-center gap-1 px-2 py-1"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save"}
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        {/* Text Area */}
        <textarea
          className="w-full h-40 text-lg text-white bg-transparent placeholder-slate-500 outline-none resize-none"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (error) setError(null);
          }}
          autoFocus
        />
        <div className="text-right text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">
          {content.length} / 2000
        </div>

        {/* Image Preview */}
        {image && (
          <div className="relative rounded-2xl overflow-hidden mb-6 border border-slate-800 animate-fade-in">
            <img
              draggable={false}
              src={image}
              alt="Preview"
              className="w-full h-auto max-h-80 object-cover"
            />
            <button
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between mt-4 border-t border-slate-800 pt-4">
          <label className="flex items-center gap-2 text-primary-400 font-medium px-4 py-2 bg-primary-500/10 rounded-xl cursor-pointer hover:bg-primary-500/20 transition-colors select-none">
            <ImageIcon className="w-5 h-5" />
            <span>Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm font-medium animate-slide-up">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Footer Button */}
      {/* <div className="p-4 border-t border-slate-800 bg-slate-900">
        <Button
          onClick={handleSubmit}
          fullWidth
          isLoading={saving}
          disabled={(!content.trim() && !image) || saving}
        >
          Save Changes
        </Button>
      </div> */}
    </div>
  );
};

export default EditPost;
