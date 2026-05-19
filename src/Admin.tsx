import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "./lib/firebase";
import { Loader2, Users, Settings as SettingsIcon, Trash2, Edit2, ShieldBan, ShieldCheck, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const [users, setUsers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({ popupText: "", popupImageUrl: "", vipPrice: 0, adminPasscode: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const [isAuthenticatedAdmin, setIsAuthenticatedAdmin] = useState(false);

  const fetchData = async () => {
    try {
      if (!auth.currentUser) throw new Error("Not authenticated");
      
      const settingsSnap = await getDoc(doc(db, "settings", "global"));
      let fetchedSettings = { popupText: "", popupImageUrl: "", vipPrice: 0, adminPasscode: "" };
      if (settingsSnap.exists()) {
        fetchedSettings = settingsSnap.data() as any;
        setSettings(fetchedSettings);
      }

      if (fetchedSettings.adminPasscode) {
         const pass = prompt("Enter Admin Passcode:");
         if (pass !== fetchedSettings.adminPasscode) {
           setError("Incorrect passcode.");
           setLoading(false);
           return;
         }
      }

      setIsAuthenticatedAdmin(true);
      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      setLoading(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load admin data. Are you an admin?");
      setLoading(false);
    }
  };

  const handleUpdateUserLimit = async (userId: string, currentMax: number) => {
    const newMax = prompt("Enter new daily views max:", currentMax.toString());
    if (newMax && !isNaN(Number(newMax))) {
      try {
        await updateDoc(doc(db, "users", userId), { dailyViewsMax: Number(newMax) });
        fetchData();
      } catch (e: any) {
        alert("Failed to update limit: " + e.message);
      }
    }
  };

  const handleToggleBan = async (userId: string, isBanned: boolean) => {
    if (confirm(`Are you sure you want to ${isBanned ? "unban" : "ban"} this user?`)) {
      try {
        await updateDoc(doc(db, "users", userId), { isBanned: !isBanned });
        fetchData();
      } catch (e: any) {
        alert("Failed to toggle ban: " + e.message);
      }
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to permanently delete this user?")) {
      try {
        await deleteDoc(doc(db, "users", userId));
        fetchData();
      } catch (e: any) {
        alert("Failed to delete user: " + e.message);
      }
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, "settings", "global"), settings);
      alert("Settings saved!");
    } catch (e: any) {
      alert("Failed to save settings: " + e.message);
    }
  };

  if (loading) return <div className="w-full h-screen flex items-center justify-center bg-zinc-950 text-gold-500"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  if (error) return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
      <div className="bg-red-500/10 p-4 rounded-full mb-4"><Lock className="w-8 h-8 text-red-500" /></div>
      <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
      <p className="text-zinc-400 mb-6">{error}</p>
      <button onClick={() => navigate("/")} className="px-6 py-2 bg-gold-500 text-black font-semibold rounded-full hover:bg-gold-400">Back to Home</button>
    </div>
  );

  return (
    <div className="w-full min-h-[100dvh] bg-zinc-950 text-white font-sans flex flex-col md:flex-row overflow-hidden">
      
      {/* Sidebar */}
      <div className="w-full md:w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-600 mb-8 mt-2 px-2">FYP Admin</h2>
        <div className="flex flex-col gap-2 flex-1">
          <button className="flex items-center gap-3 px-4 py-3 bg-gold-500/10 text-gold-500 rounded-xl font-medium"><Users className="w-5 h-5"/> Users</button>
          <button className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors font-medium"><SettingsIcon className="w-5 h-5"/> Settings</button>
        </div>
        <button onClick={() => navigate("/")} className="mt-auto px-4 py-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 rounded-xl transition-colors text-sm font-semibold">Exit Admin</button>
      </div>

      {/* Main Content */}
      <div className="flex-1 h-[100dvh] overflow-y-auto p-4 md:p-8 space-y-8">
        
        {/* Users Table */}
        <section className="bg-black border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-gold-500"/> Manage Users</h3>
            <span className="bg-zinc-900 text-zinc-400 text-xs px-3 py-1 rounded-full font-medium">{users.length} Total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="text-xs uppercase bg-zinc-900/50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg text-white">User</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Views Limit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                         <img src={u.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} className="w-8 h-8 rounded-full" />
                         <div>
                           <p className="font-medium text-white truncate max-w-[120px]">{u.displayName || "Unknown"}</p>
                           <p className="text-[10px] text-zinc-500 truncate max-w-[120px]">{u.email}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${u.accountTier === 'vip' ? 'bg-gold-500/20 text-gold-400' : 'bg-zinc-800 text-zinc-300'}`}>{u.accountTier?.toUpperCase() || 'FREE'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleUpdateUserLimit(u.id, u.dailyViewsMax)} className="flex items-center gap-1 hover:text-gold-400 transition-colors">
                        {u.dailyViews || 0} / {u.dailyViewsMax || 42} <Edit2 className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {u.isBanned ? <span className="text-red-400 font-medium text-xs flex items-center gap-1"><ShieldBan className="w-3 h-3"/> Banned</span> : <span className="text-green-400 font-medium text-xs flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Active</span>}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                       <button onClick={() => handleToggleBan(u.id, u.isBanned)} className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors" title={u.isBanned ? "Unban" : "Ban"}>
                         {u.isBanned ? <ShieldCheck className="w-4 h-4 text-green-400" /> : <ShieldBan className="w-4 h-4 text-orange-400" />}
                       </button>
                       <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md transition-colors" title="Delete">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                   <tr>
                     <td colSpan={5} className="text-center py-6 text-zinc-500">No users found.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Global Settings */}
        <section className="bg-black border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-2xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6"><SettingsIcon className="w-5 h-5 text-gold-500"/> Global Settings</h3>
          <div className="space-y-4">
             <div>
               <label className="block text-xs font-medium text-zinc-400 mb-1">Popup Text Content</label>
               <textarea 
                 value={settings.popupText} 
                 onChange={e => setSettings({...settings, popupText: e.target.value})}
                 className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white placeholder:text-zinc-600 outline-none focus:border-gold-500/50 min-h-[80px]"
                 placeholder="Welcome to our app..."
               />
             </div>
             <div>
               <label className="block text-xs font-medium text-zinc-400 mb-1">Popup Image URL</label>
               <input 
                 type="text" 
                 value={settings.popupImageUrl} 
                 onChange={e => setSettings({...settings, popupImageUrl: e.target.value})}
                 className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white placeholder:text-zinc-600 outline-none focus:border-gold-500/50"
                 placeholder="https://example.com/banner.jpg"
               />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs font-medium text-zinc-400 mb-1">VIP Upgrade Price (Rp)</label>
                 <input 
                   type="number" 
                   value={settings.vipPrice} 
                   onChange={e => setSettings({...settings, vipPrice: Number(e.target.value)})}
                   className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white outline-none focus:border-gold-500/50"
                 />
               </div>
               <div>
                 <label className="block text-xs font-medium text-zinc-400 mb-1">Admin Passcode (Custom)</label>
                 <input 
                   type="text" 
                   value={settings.adminPasscode} 
                   onChange={e => setSettings({...settings, adminPasscode: e.target.value})}
                   className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-white outline-none focus:border-gold-500/50"
                   placeholder="Default is empty (Google Only)"
                 />
               </div>
             </div>
             <button onClick={handleSaveSettings} className="px-6 py-2 bg-text border border-gold-500 text-gold-500 bg-gold-500/10 font-semibold rounded-xl hover:bg-gold-500 hover:text-black transition-colors">
                Save Parameters
             </button>
          </div>
        </section>

      </div>
    </div>
  );
}
