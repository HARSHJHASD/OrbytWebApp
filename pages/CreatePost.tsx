import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
} from "lucide-react";
import { useUserLocation } from "../components/LocationGuard";
import { MEETUP_ACTIVITIES, FEE_TYPES } from "../types";
import Input from "../components/ui/Input";
import { compressImage } from "../util/ImageCompression";
import ImageCropperModal from "../components/ImageCropperModal";

const CreatePost: React.FC = () => {
  const { user } = useAuth();
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
        setError("Meetup title is required.");
        return;
      }
      if (meetupTitle.trim().length < 5 || meetupTitle.trim().length > 100) {
        setError("Meetup title must be between 5 and 100 characters.");
        return;
      }
      if (!date || !startTime || !endTime) {
        setError("Please fill in the Date and Time for the meetup.");
        return;
      }
      if (content.trim().length < 20 || content.trim().length > 1000) {
        setError("Meetup description must be between 20 and 1000 characters.");
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
        content: postType === "regular" ? content : content || meetupTitle, // Fallback content for legacy
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
        };
        // For meetups, the 'content' field in the DB acts as the description
        payload.content = content;
      }

      await api.posts.create(payload);
      navigate("/app");
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to post. Please try again.");
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
              onChange={(e) => {
                setContent(e.target.value);
                if (error) setError(null);
              }}
              autoFocus
            />
            <div className="text-right text-[10px] text-slate-500 font-bold uppercase tracking-tighter mt-1">
              {content.length} / 2000
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
    </div>
  );
};

export default CreatePost;
