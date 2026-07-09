import { Briefcase, Calendar, Camera, CheckCircle, ChevronLeft, Instagram, Shield, Sparkles, User as UserIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import { PROFESSIONS } from '../constants/professions';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { InterestTag, POPULAR_INTERESTS, UserProfile } from '../types';
import { compressImage } from '../util/ImageCompression';



const STEPS = ['Legal', 'Basic Info', "That's Me", 'Socials', 'Interests'];

const Onboarding: React.FC = () => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Legal Step State
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedLocation, setAgreedLocation] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);

  // Profile Data State
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [dob, setDob] = useState('');
  const [jobRole, setJobRole] = useState('');
  const [instagram, setInstagram] = useState('');
  const [bio, setBio] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [thatsMePhotos, setThatsMePhotos] = useState<string[]>([]);
  const [gender, setGender] = useState<UserProfile['gender'] | ''>('');

  useEffect(() => {
    if (user?.email && !displayName) {
      setDisplayName(user.email.split('@')[0] ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError("Image too large (Max 10MB).");
        return;
      }
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          setLoading(true);
          setError(null);
          const compressed = await compressImage(file, 800, 0.8);
          setPhotoURL(compressed);
        } catch (err: any) {
          setError(err.message || "Failed to process image.");
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Could not access gallery. Please check permissions in device settings.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThatsMeUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      const newPhotos = [...thatsMePhotos];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const targetIndex = index + i;
        if (targetIndex >= 3) break;
        if (!file) continue;

        if (file.size > 10 * 1024 * 1024) {
          continue;
        }

        const compressed = await compressImage(file, 1080, 0.7);
        newPhotos[targetIndex] = compressed;
      }
      setThatsMePhotos(newPhotos);
    } catch (err: any) {
      setError("Failed to process one or more images.");
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      if (prev.length >= 5) {
        setError("You can only select up to 5 interests.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const calculateAge = (dateString: string) => {
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleNext = () => {
    setError(null);

    // Step 0: Legal & Privacy
    if (currentStep === 0) {
      if (!agreedTerms) {
        setError("You must agree to the Terms of Service and Privacy Policy.");
        return;
      }
      if (!agreedLocation) {
        setError("Location consent is required to use this app.");
        return;
      }
      if (!agreedAge) {
        setError("You must confirm you are at least 18 years old.");
        return;
      }
    }

    // Step 1: Basic Info
    if (currentStep === 1) {
      if (!photoURL) {
        setError("Profile photo is required.");
        return;
      }
      if (!displayName.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (!dob) {
        setError("Date of birth is required.");
        return;
      }
      const age = calculateAge(dob);
      if (age < 18) {
        setError("You must be at least 18 years old to use Orbyt.");
        return;
      }
      if (!gender) {
        setError("Please select your gender.");
        return;
      }
    }

    // Step 2: That's Me
    if (currentStep === 2) {
      const photoCount = thatsMePhotos.filter(p => !!p).length;
      if (photoCount < 3) {
        setError("Please upload at least 3 pictures for 'That's me'.");
        return;
      }
    }

    // Step 3: Socials
    if (currentStep === 3 && instagram.trim()) {
      const handle = instagram.trim().toLowerCase();
      const forbidden = ['none', 'na', 'n/a', 'nothing', 'no', 'null', 'undefined', 'not', 'rubbish', 'asdf', 'test'];
      if (forbidden.includes(handle) || handle.length < 2) {
        setError("Please enter a valid Instagram handle or leave it empty.");
        return;
      }

      const instagramRegex = /^[a-zA-Z0-9._]+$/;
      if (!instagramRegex.test(handle)) {
        setError("Invalid Instagram handle. Use only letters, numbers, periods, and underscores.");
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep(prev => prev - 1);
  };

  const handleFinish = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const profileData: Partial<UserProfile> = {
        uid: user.uid,
        email: user.email,
        displayName,
        photoURL,
        dob,
        jobRole: jobRole.trim(),
        instagramHandle: instagram,
        bio: bio.trim(),
        interests: selectedInterests,
        thatsMePhotos: thatsMePhotos,
        gender: gender as UserProfile['gender'],
        createdAt: Date.now(),
      };

      await api.profile.createOrUpdate(user.uid, profileData);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.error || err?.message || "Check connection";
      setError(`Failed to save profile: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Legal
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-800 shadow-xl shadow-black/50 transform -rotate-3">
                <Shield className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Welcome to Orbyt</h2>
              <p className="text-slate-400">Please review and accept our community policies to continue.</p>
            </div>

            <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-800 space-y-6">
              {/* Terms */}
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="pt-0.5">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${agreedTerms ? 'bg-primary-500 border-primary-500' : 'border-slate-600 group-hover:border-primary-400'}`}>
                    {agreedTerms && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={agreedTerms} onChange={e => setAgreedTerms(e.target.checked)} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-200">Terms & Privacy</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    I agree to the <span className="text-primary-400 underline">Terms of Service</span> and <span className="text-primary-400 underline">Privacy Policy</span>.
                  </p>
                </div>
              </label>

              <div className="h-px bg-slate-800/50" />

              {/* Location */}
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="pt-0.5">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${agreedLocation ? 'bg-primary-500 border-primary-500' : 'border-slate-600 group-hover:border-primary-400'}`}>
                    {agreedLocation && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={agreedLocation} onChange={e => setAgreedLocation(e.target.checked)} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-200">Location Access</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    I consent to sharing my location to find people nearby. I can change this in settings later.
                  </p>
                </div>
              </label>

              <div className="h-px bg-slate-800/50" />

              {/* Age */}
              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="pt-0.5">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${agreedAge ? 'bg-primary-500 border-primary-500' : 'border-slate-600 group-hover:border-primary-400'}`}>
                    {agreedAge && <CheckCircle className="w-4 h-4 text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={agreedAge} onChange={e => setAgreedAge(e.target.checked)} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-200">Age Confirmation</p>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    I confirm that I am at least 18 years old.
                  </p>
                </div>
              </label>
            </div>
          </div>
        );

      case 1: // Basic Info
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative group cursor-pointer">
                <div className={`w-36 h-36 rounded-full border-[6px] border-slate-900 shadow-2xl overflow-hidden bg-slate-800 flex items-center justify-center ${!photoURL ? 'bg-slate-800' : ''}`}>
                  {photoURL ? (
                    <img  draggable={false} src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-16 h-16 text-slate-600" />
                  )}
                </div>
                <label className="absolute bottom-1 right-1 p-3.5 bg-slate-800 text-white rounded-full shadow-lg cursor-pointer hover:bg-slate-700 transition-transform hover:scale-105 active:scale-95 border border-slate-600">
                  <Camera className="w-6 h-6" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-white">Profile Photo</h3>
                <p className="text-sm text-slate-400">Make a great first impression</p>
              </div>
            </div>

            <div className="space-y-6">
              <Input
                label="Display Name"
                placeholder="e.g. Alex Rivera"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />

              <SearchableDropdown
                label="Job Role / Profession"
                placeholder="Select your profession"
                options={PROFESSIONS}
                value={jobRole}
                onSelect={setJobRole}
                icon={<Briefcase className="w-5 h-5" />}
              />

              <div>
                <Input
                  label="Date of Birth"
                  type="date"
                  icon={<Calendar className="w-5 h-5" />}
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-slate-500 mt-2 ml-1">You must be 18+ to join.</p>
              </div>

              <div className="w-full space-y-2">
                <label className="block text-sm font-semibold text-slate-300 ml-1">
                  Bio <span className="text-slate-500 font-normal ml-1">(Optional)</span>
                </label>
                <textarea
                  className="w-full rounded-2xl border-2 border-slate-800 bg-slate-900 px-4 py-4 text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:bg-slate-800 resize-none min-h-[120px]"
                  placeholder="Tell us a bit about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-300 ml-1">
                  Gender
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'male', label: 'Male', emoji: '👨' },
                    { id: 'female', label: 'Female', emoji: '👩' },
                    { id: 'other', label: 'Other', emoji: '🏳️‍🌈' },
                    { id: 'prefer_not_to_say', label: 'Private', emoji: '🔒' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setGender(option.id as any)}
                      className={`
                        px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 border-2
                        flex items-center gap-3
                        ${gender === option.id
                          ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-md scale-[1.02]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'}
                      `}
                    >
                      <span className="text-xl">{option.emoji}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 2: // That's Me
        return (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white">That's Me</h3>
              <p className="text-slate-400 text-base">Upload 3 photos that best represent you</p>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <label key={i} className="relative aspect-[4/5] bg-slate-900 rounded-2xl border-2 border-slate-800 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors overflow-hidden group">
                  {thatsMePhotos[i] ? (
                    <>
                      <img src={thatsMePhotos[i]} alt={`That's me ${i+1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 p-1 bg-primary-500 rounded-full">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-slate-600 mb-2 group-hover:text-primary-500 transition-colors" />
                      <span className="text-xs font-bold text-slate-500">Photo {i + 1}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleThatsMeUpload(e, i)} />
                </label>
              ))}
            </div>
            <p className="text-xs text-center text-slate-500 italic mt-4">These photos will be featured on your profile!</p>
          </div>
        );

      case 3: // Socials
        return (
          <div className="space-y-8 animate-fade-in pt-4">
            <div className="text-center space-y-4 mb-8">
              <div className="w-20 h-20 bg-gradient-to-tr from-pink-500 to-purple-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-pink-500/20 transform -rotate-3">
                <Instagram className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Instagram</h3>
                <p className="text-slate-400 text-base mt-1">Let others find you on socials</p>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                label="Username"
                placeholder="@username"
                icon={<span className="text-slate-500 font-bold">@</span>}
                value={instagram}
                onChange={(e) => setInstagram(e.target.value.replace('@', ''))}
              />
              {instagram.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => window.open(`https://instagram.com/${instagram.trim()}`, '_blank')}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2 group"
                >
                  <Instagram className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  Verify this handle works
                </button>
              )}
            </div>
          </div>
        );

      case 4: // Interests
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white">Your Vibe</h3>
              <p className="text-slate-400 text-base">Select your Top 5 interests</p>
              <p className="text-[10px] text-primary-400 font-bold uppercase mt-1">
                {selectedInterests.length} / 5 Selected
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {POPULAR_INTERESTS.map((interest: InterestTag) => {
                const isSelected = selectedInterests.includes(interest.id);
                return (
                  <button
                    key={interest.id}
                    onClick={() => toggleInterest(interest.id)}
                    className={`
                      relative overflow-hidden px-4 py-4 rounded-2xl text-sm font-bold transition-all duration-200 border-2 text-left
                      flex items-center gap-3
                      ${isSelected
                        ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-md scale-[1.02]'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800'}
                    `}
                  >
                    <span className="text-2xl">{interest.emoji}</span>
                    <span className="truncate">{interest.label}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header / Progress */}
      <div className="bg-slate-900/80 backdrop-blur-md px-6 py-4 shadow-sm z-20 sticky top-0 border-b border-slate-800">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-4">
            {currentStep > 0 ? (
              <button onClick={handleBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-7 h-7" />
              </button>
            ) : (
              <div className="w-10" />
            )}
            <span className="font-bold text-white text-lg">Step {currentStep + 1} of {STEPS.length}</span>
            <div className="w-10" />
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6 max-w-md mx-auto w-full pb-32">
        <div className="flex-1">
          {renderStep()}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-500/10 text-red-400 font-medium text-sm rounded-2xl border border-red-500/20 text-center animate-slide-up">
            {error}
          </div>
        )}
      </div>

      {/* Floating Footer */}
      <div className="fixed bottom-0 inset-x-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950 to-slate-950/0 z-30">
        <div className="max-w-md mx-auto">
          {currentStep < STEPS.length - 1 ? (
            <Button onClick={handleNext} fullWidth className="shadow-xl shadow-primary-500/20">
              {currentStep === 0 ? 'Accept & Continue' : 'Continue'}
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              fullWidth
              isLoading={loading}
              disabled={selectedInterests.length !== 5}
              className="shadow-xl shadow-primary-500/20"
            >
              Complete Profile
              <Sparkles className="w-5 h-5 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;