import React, { useState, useEffect } from 'react';
import { useConfig } from '../context/ConfigContext';
import { api } from '../services/api';
import { Plus, Trash2, Save, Loader2, RefreshCw } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const DynamicListsEditor: React.FC<{ token: string }> = ({ token }) => {
  const { lists, refreshLists, loading: configLoading } = useConfig();
  const { showToast } = useNotifications();
  
  const [localLists, setLocalLists] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (lists) {
      // Deep copy to allow local edits
      setLocalLists(JSON.parse(JSON.stringify(lists)));
    }
  }, [lists]);

  if (configLoading || !localLists) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.admin.updateLists(token, localLists);
      await refreshLists();
      showToast("Lists updated successfully", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to update lists", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleArrayStringChange = (key: string, index: number, value: string) => {
    const newArr = [...localLists[key]];
    newArr[index] = value;
    setLocalLists({ ...localLists, [key]: newArr });
  };

  const handleArrayStringAdd = (key: string, value: string = '') => {
    setLocalLists({ ...localLists, [key]: [...localLists[key], value] });
  };

  const handleArrayRemove = (key: string, index: number) => {
    const newArr = [...localLists[key]];
    newArr.splice(index, 1);
    setLocalLists({ ...localLists, [key]: newArr });
  };

  const handleObjectListChange = (key: string, index: number, field: string, value: string) => {
    const newArr = [...localLists[key]];
    newArr[index] = { ...newArr[index], [field]: value };
    setLocalLists({ ...localLists, [key]: newArr });
  };

  const handleObjectListAdd = (key: string, defaultObj: any) => {
    setLocalLists({ ...localLists, [key]: [...localLists[key], defaultObj] });
  };

  const renderStringList = (title: string, key: string, placeholder: string = "Value") => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <div className="space-y-2">
        {localLists[key].map((val: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={val}
              onChange={(e) => handleArrayStringChange(key, i, e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
              placeholder={placeholder}
            />
            <button
              onClick={() => handleArrayRemove(key, i)}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => handleArrayStringAdd(key)}
        className="flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Item
      </button>
    </div>
  );

  const renderObjectList = (title: string, key: string, fields: { name: string, placeholder: string }[], defaultObj: any) => (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <div className="space-y-2">
        {localLists[key].map((obj: any, i: number) => (
          <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {fields.map(f => (
              <input
                key={f.name}
                type="text"
                value={obj[f.name]}
                onChange={(e) => handleObjectListChange(key, i, f.name, e.target.value)}
                className={`bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white ${f.name === 'emoji' ? 'w-16' : 'flex-1 min-w-[120px]'}`}
                placeholder={f.placeholder}
              />
            ))}
            <button
              onClick={() => handleArrayRemove(key, i)}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => handleObjectListAdd(key, defaultObj)}
        className="flex items-center gap-1.5 text-sm font-semibold text-violet-400 hover:text-violet-300 transition-colors"
      >
        <Plus className="w-4 h-4" /> Add Item
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md py-4 border-b border-slate-800 -mx-6 px-6 mb-6">
        <div>
          <h2 className="text-2xl font-black text-white">Dynamic Lists</h2>
          <p className="text-slate-400 text-sm mt-1">Configure the static options available throughout the app.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={refreshLists}
            className="px-4 py-2 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-all flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-all flex items-center gap-2 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderObjectList("Room Tags", "roomTags", [
          { name: "id", placeholder: "ID (e.g. fitness)" },
          { name: "label", placeholder: "Label" },
          { name: "emoji", placeholder: "Emoji" }
        ], { id: '', label: '', emoji: '' })}

        {renderObjectList("Meetup Categories", "meetupCategories", [
          { name: "id", placeholder: "ID" },
          { name: "label", placeholder: "Label" },
          { name: "emoji", placeholder: "Emoji" }
        ], { id: '', label: '', emoji: '' })}

        {renderStringList("User Badge Presets", "badgePresets", "Badge Name (e.g. Top Contributor)")}
        
        {renderStringList("Moods (Emojis)", "moods", "Emoji (e.g. 😄)")}
        
        {renderStringList("Popular Tags", "popularTags", "Tag (e.g. #local)")}
        
        {renderStringList("Post Report Reasons", "reportReasons", "Reason")}
        
        {renderStringList("Community Report Reasons", "communityReportReasons", "Reason")}
        
        {renderStringList("Professions", "professions", "Profession (e.g. Software Engineer)")}
      </div>
    </div>
  );
};

export default DynamicListsEditor;
