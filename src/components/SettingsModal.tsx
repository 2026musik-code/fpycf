import { X, Key, Shield } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

interface SettingsModalProps {
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string;
}

export default function SettingsModal({ onClose, onSave, currentKey }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(currentKey);

  const handleSave = () => {
    onSave(apiKey);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl overflow-hidden"
      >
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gold-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative">
          <div className="flex items-center gap-2 text-gold-400">
            <Shield className="w-5 h-5" />
            <h2 className="text-lg font-medium text-zinc-100 mt-1">API Key Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 relative">
          <div>
            <p className="text-sm text-zinc-400 mb-2 font-light">
              Enter your Freereels API key to access the video feed.
            </p>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="x-api-key"
                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 transition-all font-mono text-sm placeholder:text-zinc-600"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-zinc-100 text-zinc-950 font-medium py-3 rounded-xl hover:bg-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all shadow-lg shadow-gold-500/10"
          >
            Save Key
          </button>
        </div>
      </motion.div>
    </div>
  );
}
