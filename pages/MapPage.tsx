import L from "leaflet";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet/dist/leaflet.css";
import { Check, ChevronRight, Instagram, Loader2, LocateFixed, MessageCircle, RefreshCw, Search, User, UserPlus, X, MapPin } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import { useNavigate } from "react-router-dom";
import { useUserLocation } from "../components/LocationGuard";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { POPULAR_INTERESTS, UserProfile } from "../types";
import { calculateDistance } from "../util/location";
import { useTheme } from "../context/ThemeContext";
/* -------------------- TYPES -------------------- */

type NearbyUser = UserProfile & {
  distDisplay: string;
  distMeters: number;
};

/* -------------------- DISTANCE -------------------- */

const getDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/* -------------------- MAP CLICK HANDLER -------------------- */

const MapEventHandler: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  const map = useMap();

  useEffect(() => {
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, onClick]);

  return null;
};

/* -------------------- LOCATE ME CONTROL -------------------- */
const LocateMeControl: React.FC<{ coords: { lat: number; lng: number } }> = ({
  coords,
}) => {
  const map = useMap();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        map.flyTo([coords.lat, coords.lng], 14, {
          animate: true,
          duration: 1.5,
        });
      }}
      className="absolute right-4 bottom-32 z-[1001] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-full border border-slate-200 dark:border-slate-800 shadow-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <LocateFixed className="w-6 h-6 text-primary-500" />
    </button>
  );
};

/* -------------------- MAIN -------------------- */

const MapPage: React.FC = () => {
  const { location: myLocation } = useUserLocation();
  const { user: currentUser } = useAuth();
  const { isDark } = useTheme();
  const [currentUserProfile, setCurrentUserProfile] =
    useState<UserProfile | null>(null);
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<NearbyUser | null>(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const [connecting, setConnecting] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  type FilterType = "all" | "friends" | "interests";
  const [filter, setFilter] = useState<FilterType>("all");
  const [radiusFilter, setRadiusFilter] = useState<number>(500);
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  useEffect(() => {
    if (currentUserProfile?.discoveryRadius) {
      setRadiusFilter(currentUserProfile.discoveryRadius);
    }
  }, [currentUserProfile]);

  /* ---------------- FETCH USERS ---------------- */

  const fetchMapData = useCallback(async () => {
    if (!currentUser?.uid) return;
    try {
      const [data, profile] = await Promise.all([
        api.profile.getAllWithLocation(currentUser.uid),
        api.profile.get(currentUser.uid),
      ]);
      setUsers(data);
      setCurrentUserProfile(profile);
      setLastRefreshed(new Date());
    } catch (e) {
      console.error("Failed to load map users", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchMapData(); }, [fetchMapData]);

  useEffect(() => {
    const interval = setInterval(() => fetchMapData(), 60_000);
    return () => clearInterval(interval);
  }, [fetchMapData]);

  /* ---------------- CONNECT ---------------- */

  const handleConnect = async (targetUid: string) => {
    if (!currentUser?.uid || connecting.has(targetUid) || connected.has(targetUid)) return;
    setConnecting(prev => new Set(prev).add(targetUid));
    try {
      await api.friends.sendRequest(currentUser.uid, targetUid);
      setConnected(prev => new Set(prev).add(targetUid));
    } catch (e) {
      console.error("Failed to send request", e);
    } finally {
      setConnecting(prev => { const n = new Set(prev); n.delete(targetUid); return n; });
    }
  };

  /* ---------------- NEARBY USERS ---------------- */

  const currentUserFriends = currentUserProfile?.friends || [];
  const currentUserInterests = currentUserProfile?.interests || [];

  const nearbyUsers = useMemo(() => {
    if (!myLocation) return [];

    const maxDistanceMeters = radiusFilter * 1000;

    return users
      .filter((u) => u.uid !== currentUser?.uid && u.lastLocation)
      .map((u) => {
        const distMeters = getDistanceMeters(
          myLocation.lat,
          myLocation.lng,
          u.lastLocation!.lat,
          u.lastLocation!.lng,
        );
        const distDisplay = calculateDistance(
          myLocation.lat,
          myLocation.lng,
          u.lastLocation!.lat,
          u.lastLocation!.lng,
        );
        return { ...u, distMeters, distDisplay };
      })
      .filter((u) => {
        if (u.distMeters > maxDistanceMeters) return false;

        // Gender Filter
        if (genderFilter !== "all" && u.gender !== genderFilter) {
          return false;
        }

        // Apply Filters
        if (filter === "friends") {
          return currentUserFriends.includes(u.uid);
        }
        if (filter === "interests") {
          const common = (u.interests || []).filter((i) =>
            currentUserInterests.includes(i),
          );
          return common.length > 0;
        }
        return true;
      })
      .sort((a, b) => a.distMeters - b.distMeters);
  }, [
    users,
    myLocation,
    currentUser,
    currentUserProfile,
    filter,
    radiusFilter,
    genderFilter,
    currentUserFriends,
    currentUserInterests,
  ]);


  /* ---------------- USER ICON ---------------- */

  const createUserIcon = useCallback(
    (user: NearbyUser) =>
      L.divIcon({
        className: "bg-transparent",
        html: `
          <div class="w-12 h-12 relative group">
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-200 dark:border-t-slate-800"></div>
            <div class="absolute bottom-1.5 left-0 right-0 top-0 rounded-full bg-white dark:bg-slate-800 p-0.5 overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md">
              ${
                user.photoURL
                  ? `<img src="${user.photoURL}" class="w-full h-full object-cover rounded-full" />`
                  : `<div class="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold">${user.displayName[0]}</div>`
              }
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 48],
      }),
    [],
  );

  const ResizeMap = () => {
    const map = useMap();

    useEffect(() => {
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }, [map]);

    return null;
  };

  const myIcon = L.divIcon({
    className: "bg-transparent",
    html: `
      <div class="relative w-6 h-6">
        <div class="absolute inset-0 bg-primary-500 rounded-full animate-ping opacity-75"></div>
        <div class="absolute inset-0 bg-primary-600 rounded-full border-2 border-white dark:border-slate-900 shadow-lg"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  /* ---------------- LOADING ---------------- */

  if (loading || !myLocation) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
      </div>
    );
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div className={`h-screen w-full relative bg-slate-50 dark:bg-slate-950 transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <MapContainer
        center={[myLocation.lat, myLocation.lng]}
        zoom={14}
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          updateWhenIdle={false}
        />
        <ResizeMap />

        <MapEventHandler onClick={() => setSelectedUser(null)} />

        <LocateMeControl coords={myLocation} />

        <Circle
          center={[myLocation.lat, myLocation.lng]}
          radius={radiusFilter * 1000}
          pathOptions={{
            color: "#8b5cf6",
            fillColor: "#8b5cf6",
            fillOpacity: 0.05,
            weight: 1,
            dashArray: "4 4",
          }}
        />

        <Marker position={[myLocation.lat, myLocation.lng]} icon={myIcon} />

        <MarkerClusterGroup chunkedLoading>
          {nearbyUsers.map((user) => (
            <Marker
              key={user.uid}
              position={[user.lastLocation!.lat, user.lastLocation!.lng]}
              icon={createUserIcon(user)}
              eventHandlers={{
                click: (e: any) => {
                  L.DomEvent.stopPropagation(e);
                  setSelectedUser(user);
                  setIsListOpen(false);
                },
              }}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      {/* SELECTED USER CARD */}
      {selectedUser && (
        <div className="absolute bottom-6 left-4 right-4 z-[1002] bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xl transition-colors duration-300">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
              {selectedUser.photoURL ? (
                <img draggable={false} src={selectedUser.photoURL} className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 m-auto text-slate-400 dark:text-slate-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{selectedUser.displayName}</h3>
              <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{selectedUser.distanceBand || selectedUser.distDisplay} away</p>
              {(() => {
                const mutual = (selectedUser.friends || []).filter(f => currentUserFriends.includes(f)).length;
                return mutual > 0 ? <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{mutual} mutual friend{mutual > 1 ? 's' : ''}</p> : null;
              })()}
            </div>
            <button onClick={() => setSelectedUser(null)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedUser.bio && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3 line-clamp-1">"{selectedUser.bio}"</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/app/chat/${selectedUser.uid}`)}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> Message
            </button>
            {!currentUserFriends.includes(selectedUser.uid) ? (
              <button
                onClick={() => handleConnect(selectedUser.uid)}
                disabled={connecting.has(selectedUser.uid) || connected.has(selectedUser.uid)}
                className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary-600 transition-colors disabled:opacity-60"
              >
                {connected.has(selectedUser.uid) ? <><Check className="w-3.5 h-3.5" /> Sent</> : <><UserPlus className="w-3.5 h-3.5" /> Connect</>}
              </button>
            ) : null}
            <button
              onClick={() => navigate(`/app/profile/${selectedUser.uid}`)}
              className="h-9 w-9 bg-slate-900 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* FLOATING NEARBY BUTTON */}
      {!isListOpen && !selectedUser && nearbyUsers?.length > 0 && (
        <button
          onClick={() => setIsListOpen(true)}
          className="absolute bottom-[20%] left-4 z-[1001] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl p-2 pr-4 flex items-center gap-3 border border-slate-200 dark:border-slate-800"
        >
          {/* Stacked Avatars */}
          <div className="flex -space-x-3 items-center">
            {nearbyUsers.slice(0, 3).map((u, i) => (
              <div
                key={u.uid}
                className={`w-10 h-10 rounded-full border-2 border-slate-50 dark:border-slate-900 bg-slate-50 dark:bg-slate-800 overflow-hidden relative z-[${3 - i}]`}
              >
                {u.photoURL ? (
                  <img
                   draggable={false}
                    src={u.photoURL}
                    alt={u.displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500">
                    {u.displayName[0]}
                  </div>
                )}
              </div>
            ))}
            {nearbyUsers.length > 3 && (
              <div className="w-10 h-10 rounded-full border-2 border-slate-50 dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 relative z-0">
                +{nearbyUsers.length - 3}
              </div>
            )}
          </div>

          <div className="text-left">
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {nearbyUsers.length} Nearby
            </p>
            <p className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-wider">
              view list
            </p>
          </div>
        </button>
      )}

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-slate-900/90 text-slate-200 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-slate-700 shadow-lg flex items-center gap-2">
        Approximate locations for safety
        <button onClick={() => fetchMapData()} className="text-slate-400 hover:text-white transition-colors">
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* BOTTOM DRAWER */}
      {isListOpen && (
        <div className="fixed inset-0 z-[2050] flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
            onClick={() => setIsListOpen(false)}
          />

          <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] flex flex-col border-t border-slate-100 dark:border-slate-800 relative z-10 shadow-2xl transition-colors duration-300">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">People Nearby</h2>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">{nearbyUsers.length} connections found</p>
              </div>
              <button
                onClick={() => setIsListOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search inside drawer */}
            <div className="px-6 pt-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  value={mapSearchQuery}
                  onChange={(e) => setMapSearchQuery(e.target.value)}
                  placeholder="Search by name, bio…"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-9 py-2 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-primary-500/60 transition-colors"
                />
                {mapSearchQuery && (
                  <button
                    onClick={() => setMapSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* FILTERS BAR */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 space-y-4">
              {/* Show filter */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Show</span>
                <div className="flex gap-2">
                  {(["all", "friends", "interests"] as const).map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${filter === f ? "bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700"}`}>
                      {f === "all" ? "Everyone" : f === "friends" ? "Friends" : "Shared Interests"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Search Radius</span>
                  <span className="text-xs font-bold text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full border border-primary-500/20">{radiusFilter} km</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="500" 
                  value={radiusFilter} 
                  onChange={(e) => setRadiusFilter(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gender</span>
                <div className="flex gap-2">
                  {["all", "male", "female", "other"].map((g) => (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(g)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                        genderFilter === g
                          ? "bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {nearbyUsers.filter(u => {
                if (!mapSearchQuery.trim()) return true;
                const q = mapSearchQuery.trim().toLowerCase();
                return (
                  u.displayName?.toLowerCase().includes(q) ||
                  u.bio?.toLowerCase().includes(q) ||
                  u.jobRole?.toLowerCase().includes(q)
                );
              }).map((u) => (
                <div
                  key={u.uid}
                  className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:border-primary-500/30"
                >
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-inner">
                      {u.photoURL ? (
                        <img
                         draggable={false}
                          src={u.photoURL}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 font-bold text-xl uppercase">
                          {u.displayName[0]}
                        </div>
                      )}
                    </div>

                    {/* Info Side */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3
                            className="font-bold text-slate-900 dark:text-white text-lg leading-tight cursor-pointer hover:text-primary-500 transition-colors"
                            onClick={() => navigate(`/app/profile/${u.uid}`)}
                          >
                            {u.displayName}
                          </h3>
                          {u.lastLocation?.name ? (
                            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {u.lastLocation.name} · {u.distanceBand || u.distDisplay}
                            </p>
                          ) : (
                            <p className="text-xs font-bold text-primary-500 dark:text-primary-400 mt-1 uppercase tracking-tight">
                              {(u.distanceBand || u.distDisplay)} away
                            </p>
                          )}
                          {(() => {
                            const mutual = (u.friends || []).filter(f => currentUserFriends.includes(f)).length;
                            return mutual > 0 ? (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{mutual} mutual friend{mutual > 1 ? 's' : ''}</p>
                            ) : null;
                          })()}
                        </div>
                        {u.instagramHandle && (
                          <a
                            href={`https://instagram.com/${u.instagramHandle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-pink-500 hover:text-pink-400 p-2 bg-pink-50 dark:bg-pink-500/10 rounded-xl transition-colors shadow-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Instagram className="w-5 h-5" />
                          </a>
                        )}
                      </div>

                      {/* Bio */}
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed italic">
                        {u.bio || "Searching for connections..."}
                      </p>

                      {/* Interests Chips */}
                      {u.interests && u.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3.5">
                          {u.interests.slice(0, 4).map((iid) => {
                            const tag = POPULAR_INTERESTS.find(
                              (p) => p.id === iid,
                            );
                            return (
                              <span
                                key={iid}
                                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-100"
                              >
                                {tag ? (
                                  <span className="mr-1.5">{tag.emoji}</span>
                                ) : null}
                                {tag ? tag.label : iid}
                              </span>
                            );
                          })}
                          {u.interests.length > 4 && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                              +{u.interests.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => navigate(`/app/chat/${u.uid}`)}
                      className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> Message
                    </button>
                    {!currentUserFriends.includes(u.uid) ? (
                      <button
                        onClick={() => handleConnect(u.uid)}
                        disabled={connecting.has(u.uid) || connected.has(u.uid)}
                        className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-primary-600 transition-colors disabled:opacity-60 border border-primary-500"
                      >
                        {connected.has(u.uid) ? <><Check className="w-3.5 h-3.5" /> Sent</> : <><UserPlus className="w-3.5 h-3.5" /> Connect</>}
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/app/profile/${u.uid}`)}
                        className="flex-1 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors border border-slate-800 dark:border-slate-700"
                      >
                        View Profile <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Bottom Spacer for safe area */}
              <div className="h-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
