import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { api } from "../services/api";
import {
  ChevronLeft,
  Image as ImageIcon,
  X,
  AlertCircle,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Link as LinkIcon,
  PartyPopper,
  Type,
  Globe,
  Lock,
  Loader2,
  Eye,
  Smile,
  Repeat2,
  Tag,
  Home,
} from "lucide-react";
import { useUserLocation } from "../components/LocationGuard";
import { MEETUP_ACTIVITIES, FEE_TYPES } from "../types";
import Input from "../components/ui/Input";
import { compressImage } from "../util/ImageCompression";
import ImageCropperModal from "../components/ImageCropperModal";

import { useConfig } from '../context/ConfigContext';

const DRAFT_KEY = 'create_post_draft';
const MEETUP_DRAFT_KEY = 'create_meetup_draft';
const REPEAT_OPTIONS = [
  { id: 'once', label: 'Once' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'biweekly', label: 'Bi-weekly' },
  { id: 'monthly', label: 'Monthly' },
] as const;

const CreatePost: React.FC = () => {
  const { lists } = useConfig();
  const MOODS = lists?.moods || [];
  const POPULAR_TAGS = lists?.popularTags || [];
  const MEETUP_CATEGORIES = lists?.meetupCategories || [];

  const { user } = useAuth();
  const { showToast } = useNotifications();
  const navigate = useNavigate();
  const { location: gpsLocation } = useUserLocation();
  const [postType, setPostType] = useState<"regular" | "meetup">("regular");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

  // Meetup Specific State
  const [meetupTitle, setMeetupTitle] = useState("");
  const [activity, setActivity] = useState(MEETUP_ACTIVITIES[0]);
  const [feeType, setFeeType] = useState(FEE_TYPES[0]);
  const [feeAmount, setFeeAmount] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxGuests, setMaxGuests] = useState<number | "">("");
  const [meetupUrl, setMeetupUrl] = useState("");
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public');
  // New meetup fields
  const [venueName, setVenueName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [rsvpDeadline, setRsvpDeadline] = useState("");
  const [repeatFrequency, setRepeatFrequency] = useState<'once' | 'weekly' | 'biweekly' | 'monthly'>('once');

  // Draft
  const draftSaved = useRef(false);

  // Mood
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);

  // Hashtag suggestions
  const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState('');
  const filteredTags = POPULAR_TAGS.filter(t => t.startsWith(hashtagQuery));

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // Load draft on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.content) setContent(d.content);
        if (d.selectedMood) setSelectedMood(d.selectedMood);
      }
      const meetupSaved = localStorage.getItem(MEETUP_DRAFT_KEY);
      if (meetupSaved) {
        const m = JSON.parse(meetupSaved);
        if (m.meetupTitle) setMeetupTitle(m.meetupTitle);
        if (m.activity) setActivity(m.activity);
        if (m.date) setDate(m.date);
        if (m.startTime) setStartTime(m.startTime);
        if (m.endTime) setEndTime(m.endTime);
        if (m.content) setContent(m.content);
        if (m.venueName) setVenueName(m.venueName);
        if (m.category) setCategory(m.category);
        if (m.rsvpDeadline) setRsvpDeadline(m.rsvpDeadline);
        if (m.repeatFrequency) setRepeatFrequency(m.repeatFrequency);
      }
    } catch {}
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (!content && !selectedMood) return;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ content, selectedMood }));
      draftSaved.current = true;
    }, 800);
    return () => clearTimeout(timer);
  }, [content, selectedMood]);

  // Auto-save meetup draft
  useEffect(() => {
    if (!meetupTitle && !date && !venueName) return;
    const timer = setTimeout(() => {
      localStorage.setItem(MEETUP_DRAFT_KEY, JSON.stringify({
        meetupTitle, activity, date, startTime, endTime, content,
        venueName, category, rsvpDeadline, repeatFrequency,
      }));
    }, 800);
    return () => clearTimeout(timer);
  }, [meetupTitle, activity, date, startTime, endTime, content, venueName, category, rsvpDeadline, repeatFrequency]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    localStorage.removeItem(MEETUP_DRAFT_KEY);
    draftSaved.current = false;
  }, []);

  const handleContentChange = (txt: string) => {
    setContent(txt);
    if (error) setError(null);
    const words = txt.split(/\s/);
    const last = words[words.length - 1] ?? '';
    if (last.startsWith('#') && last.length > 1) {
      setHashtagQuery(last.toLowerCase());
      setShowHashtagSuggestions(true);
    } else {
      setShowHashtagSuggestions(false);
      setHashtagQuery('');
    }
  };

  const insertHashtag = (tag: string) => {
    const words = content.split(/\s/);
    words[words.length - 1] = tag;
    setContent(words.join(' ') + ' ');
    setShowHashtagSuggestions(false);
    setHashtagQuery('');
  };

  useEffect(() => {
    if (gpsLocation) {
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${gpsLocation.lat}&lon=${gpsLocation.lng}`,
      )
        .then((res) => res.json())
        .then((data) => {
          const addr = data.address;
          const city =
            addr?.city ||
            addr?.town ||
            addr?.village ||
            addr?.county ||
            "Unknown Location";
          const state = addr?.state || "";
          setLocationName(state ? `${city}, ${state}` : city);
        })
        .catch(() => setLocationName("Nearby"));
    }
  }, [gpsLocation]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        setError("Image is too large (Max 20MB)");
        return;
      }

      // Show cropper first
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setTempImageSrc(reader.result?.toString() || null);
        setCropModalOpen(true);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropModalOpen(false);
    setTempImageSrc(null);
    try {
      setLoading(true);
      setError(null);
      const file = new File([croppedBlob], "cropped.jpg", { type: "image/jpeg" });
      const compressed = await compressImage(file, 640, 0.5);
      setImage(compressed);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process image.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validation
    if (postType === "regular") {
      const trimmed = content.trim();
      if (trimmed.length < 10 && !image) {
        setError("Post content must be at least 10 characters long.");
        return;
      }
      if (trimmed.length > 2000) {
        setError("Post content cannot exceed 2000 characters.");
        return;
      }
    }

    if (postType === "meetup") {
      if (!meetupTitle.trim()) {
        const msg = "Meetup title is required.";
        setError(msg);
        showToast(msg);
        return;
      }
      if (meetupTitle.trim().length < 5 || meetupTitle.trim().length > 100) {
        const msg = "Meetup title must be between 5 and 100 characters.";
        setError(msg);
        showToast(msg);
        return;
      }
      if (!date || !startTime || !endTime) {
        const msg = "Please fill in the Date and Time for the meetup.";
        setError(msg);
        showToast(msg);
        return;
      }
      if (content.trim().length < 20 || content.trim().length > 1000) {
        const msg = "Meetup description must be between 20 and 1000 characters.";
        setError(msg);
        showToast(msg);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      let profile = null;
      try {
        profile = await api.profile.get(user.uid);
      } catch (e) {
        console.warn("Could not fetch profile", e);
      }

      const payload: any = {
        uid: user.uid,
        authorName: profile?.displayName || user.email?.split("@")[0] || "User",
        authorPhoto: profile?.photoURL || "",
        content: postType === "regular" ? (content + (selectedMood ? ` — feeling ${selectedMood}` : '')) : content || meetupTitle, // Fallback content for legacy
        imageURL: image || undefined,
        location:
          gpsLocation
            ? {
              lat: parseFloat(gpsLocation.lat.toFixed(3)),
              lng: parseFloat(gpsLocation.lng.toFixed(3)),
              name: locationName,
            }
            : undefined,
        type: postType,
        visibility,
      };

      if (postType === "meetup") {
        payload.meetupDetails = {
          title: meetupTitle,
          activity,
          feeType,
          feeAmount: feeType === 'Attendance fee applicable' ? feeAmount : undefined,
          date,
          startTime,
          endTime,
          maxGuests: maxGuests || undefined,
          meetingUrl: meetupUrl || undefined,
          venueName: venueName.trim() || undefined,
          category: category || undefined,
          rsvpDeadline: rsvpDeadline || undefined,
          repeatFrequency,
        };
        // For meetups, the 'content' field in the DB acts as the description
        payload.content = content;
      }

      await api.posts.create(payload);
      clearDraft();
      navigate("/app");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Failed to post. Please try again.";
      setError(msg);
      if (postType === "meetup") {
        showToast(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return !loading;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 shadow-sm z-30 sticky top-0 border-b border-slate-800">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/app")}
            className="p-2 -ml-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <span className="font-bold text-white text-lg">Create</span>

          <div className="flex items-center gap-2">
            {postType === 'regular' && (
              <button
                onClick={() => setShowPreview(true)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                title="Preview post"
              >
                <Eye className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading || !isFormValid()}
              className="text-primary-500 font-bold text-base hover:text-primary-400 transition-colors disabled:opacity-50 flex items-center gap-1 px-2 py-1"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : postType === "meetup" ? (
                "Create"
              ) : (
                "Post"
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 max-w-md mx-auto w-full pb-10">
        {/* Toggle Switch */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mb-3">
          <button
            onClick={() => setPostType("regular")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${postType === "regular" ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:text-slate-300"}`}
          >
            <Type className="w-4 h-4" /> Post
          </button>
          <button
            onClick={() => setPostType("meetup")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${postType === "meetup" ? "bg-primary-600 text-white shadow-md" : "text-slate-500 hover:text-slate-300"}`}
          >
            <PartyPopper className="w-4 h-4" /> Meet Up
          </button>
        </div>

        {/* Visibility Toggle */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 mb-6 gap-1">
          <button
            onClick={() => setVisibility('public')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${visibility === 'public' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Globe className="w-3.5 h-3.5" /> Everyone
          </button>
          <button
            onClick={() => setVisibility('friends')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${visibility === 'friends' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Lock className="w-3.5 h-3.5" /> Friends Only
          </button>
        </div>

        {postType === "regular" ? (
          /* REGULAR POST FORM */
          <>
            <textarea
              className="w-full h-40 text-lg text-white bg-transparent placeholder-slate-500 outline-none resize-none"
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              autoFocus
            />
            <div className="text-right text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">
              {content.length} / 2000
            </div>

            {/* Hashtag suggestions */}
            {showHashtagSuggestions && filteredTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {filteredTags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertHashtag(tag)}
                    className="text-primary-400 bg-primary-500/10 border border-primary-500/30 rounded-full px-3 py-1 text-sm font-bold hover:bg-primary-500/20 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}

            {/* Mood selector */}
            <div className="mt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMoodPicker(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
                >
                  <Smile className="w-4 h-4" />
                  {selectedMood ? <span>Feeling {selectedMood}</span> : <span>Add Mood</span>}
                </button>
                {selectedMood && (
                  <button type="button" onClick={() => setSelectedMood(null)} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {showMoodPicker && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {MOODS.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setSelectedMood(m); setShowMoodPicker(false); }}
                      className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-all ${selectedMood === m ? 'bg-primary-500/20 ring-2 ring-primary-500' : 'bg-slate-900 hover:bg-slate-800'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* MEETUP FORM */
          <div className="space-y-6 animate-fade-in">
            <Input
              placeholder="Event Title (e.g. Sunday Morning Run)"
              value={meetupTitle}
              onChange={(e) => setMeetupTitle(e.target.value)}
              className="font-bold text-lg"
            />

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Activity
              </label>
              <div className="relative">
                <select
                  value={activity}
                  onChange={(e) => setActivity(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-800 text-white rounded-2xl px-4 py-3.5 appearance-none outline-none focus:border-primary-500"
                >
                  {MEETUP_ACTIVITIES.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  ▼
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="date"
                icon={<Calendar className="w-4 h-4" />}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-slate-900 border-2 border-slate-800 rounded-2xl px-3 py-0.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <div className="flex-1 flex items-center gap-1">
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="bg-transparent text-white text-sm w-full py-3 outline-none"
                    />
                    <span className="text-slate-600">-</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="bg-transparent text-white text-sm w-full py-3 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Max Guests"
                icon={<Users className="w-4 h-4" />}
                value={maxGuests}
                onChange={(e) => setMaxGuests(parseInt(e.target.value) || "")}
              />
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <DollarSign className="w-4 h-4" />
                </div>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value)}
                  className="w-full bg-slate-900 border-2 border-slate-800 text-white rounded-2xl pl-10 pr-4 py-3.5 appearance-none outline-none focus:border-primary-500 h-[58px]"
                >
                  {FEE_TYPES.map((fee) => (
                    <option key={fee} value={fee}>
                      {fee}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {feeType === 'Attendance fee applicable' && (
              <Input
                type="number"
                placeholder="Attendance Fee Amount"
                icon={<DollarSign className="w-4 h-4" />}
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
              />
            )}

            <div className="w-full space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                Details
              </label>
              <textarea
                className="w-full rounded-2xl border-2 border-slate-800 bg-slate-900 px-4 py-4 text-base text-white placeholder-slate-500 outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 min-h-[100px] resize-none"
                placeholder="Describe the plan, meeting point details, etc..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="text-right text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">
                {content.length} / 1000
              </div>
            </div>

            <Input
              placeholder="Link (Optional)"
              icon={<LinkIcon className="w-4 h-4" />}
              value={meetupUrl}
              onChange={(e) => setMeetupUrl(e.target.value)}
            />

            {/* Venue Name */}
            <Input
              placeholder="Venue / Location name (e.g. Central Park, Blue Bottle Coffee)"
              icon={<Home className="w-4 h-4" />}
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />

            {/* Category Pills */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> Category
              </label>
              <div className="flex flex-wrap gap-2">
                {MEETUP_CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(category === c.id ? '' : c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      category === c.id
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-primary-500/50'
                    }`}
                  >
                    <span>{c.emoji}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* RSVP Deadline */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                RSVP Deadline <span className="text-slate-600 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="date"
                className="w-full rounded-2xl border-2 border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 text-sm"
                value={rsvpDeadline}
                min={new Date().toISOString().split('T')[0]}
                max={date || undefined}
                onChange={(e) => setRsvpDeadline(e.target.value)}
              />
            </div>

            {/* Repeat Frequency */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Repeat2 className="w-3.5 h-3.5" /> Repeats
              </label>
              <div className="flex gap-2">
                {REPEAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRepeatFrequency(opt.id)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                      repeatFrequency === opt.id
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-primary-500/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Image Preview (Common) */}
        {image && (
          <div className="relative rounded-2xl overflow-hidden mb-6 border border-slate-800 animate-fade-in mt-6">
            <img
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

        {/* Action Bar (Common) */}
        <div className="flex items-center justify-between mt-6 border-t border-slate-800 pt-4">
          <label className="flex items-center gap-2 text-primary-400 font-medium px-4 py-2 bg-primary-500/10 rounded-xl cursor-pointer hover:bg-primary-500/20 transition-colors select-none">
            <ImageIcon className="w-5 h-5" />
            <span>{image ? "Change Photo" : "Add Photo"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>

          {locationName && (
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold px-3 py-1.5 bg-slate-800 rounded-full border border-slate-700">
              <MapPin className="w-3 h-3" />
              {locationName}
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-400 text-sm font-medium animate-slide-up">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={tempImageSrc}
        aspect={4 / 3}
        onClose={() => { setCropModalOpen(false); setTempImageSrc(null); }}
        onCropComplete={handleCropComplete}
      />

      {/* Post Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-[200] bg-black/80 flex items-end sm:items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
              <span className="text-white font-bold">Preview</span>
              <div className="w-5" />
            </div>
            <div className="p-4">
              <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-bold">You</div>
                  <div>
                    <p className="text-white font-bold text-sm">Your Name</p>
                    <div className="flex items-center gap-1 text-slate-500 text-xs">
                      {visibility === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span>Just now{locationName ? ` · ${locationName}` : ''}</span>
                    </div>
                  </div>
                </div>
                <p className="text-white text-base leading-relaxed mb-3">
                  {content}{selectedMood ? ` — feeling ${selectedMood}` : ''}
                </p>
                {image && (
                  <img src={image} alt="Preview" className="w-full rounded-xl object-cover max-h-80" />
                )}
                {locationName && (
                  <div className="flex items-center gap-1 text-slate-500 text-xs mt-3">
                    <MapPin className="w-3 h-3" />
                    <span>{locationName}</span>
                  </div>
                )}
              </div>
              <p className="text-slate-500 text-xs text-center mt-3">This is how your post will appear in the feed</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
