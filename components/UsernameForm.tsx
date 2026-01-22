
import React, { useState } from 'react';
import { UserProfile } from '../types';

interface Props {
  profile: UserProfile;
  onSet: (name: string) => void;
}

const UsernameForm: React.FC<Props> = ({ profile, onSet }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length >= 2) {
      onSet(name.trim());
    }
  };

  return (
    <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
      <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-3xl p-8 shadow-2xl relative">
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
          <img src={profile.avatar} className="w-24 h-24 rounded-3xl border-4 border-white dark:border-slate-800 shadow-2xl object-cover" alt="Avatar" />
        </div>
        
        <div className="text-center space-y-4 mb-8 mt-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            Identify Yourself
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            How should Lumina address you? Your identity is kept private.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <input 
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 pl-12 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all duration-300 shadow-inner group-hover:border-emerald-500/50"
              placeholder="Your handle..."
              required
            />
            <i className="fas fa-signature absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"></i>
          </div>

          <button 
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-4 rounded-2xl transition-all duration-300 transform active:scale-95 shadow-xl hover:shadow-emerald-500/20"
          >
            Start Conversation
          </button>
        </form>
      </div>
    </div>
  );
};

export default UsernameForm;
