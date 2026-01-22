
import React, { useState, useEffect } from 'react';

interface Props {
  onSuccess: () => void;
}

const SecretKeyForm: React.FC<Props> = ({ onSuccess }) => {
  const [key, setKey] = useState('');
  const [error, setError] = useState(false);
  const [isAIStudio, setIsAIStudio] = useState(false);

  useEffect(() => {
    if (window.aistudio) {
      setIsAIStudio(true);
      // Check if key is already selected
      window.aistudio.hasSelectedApiKey().then(hasKey => {
        if (hasKey) {
          onSuccess();
        }
      });
    }
  }, [onSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (key === 'chat2024') {
      onSuccess();
    } else {
      setError(true);
      setKey('');
    }
  };

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // As per instructions, assume success to mitigate race conditions
        onSuccess();
      } catch (e) {
        console.error("Failed to select key", e);
        setError(true);
      }
    }
  };

  if (isAIStudio) {
    return (
      <div className="w-full max-w-md transform transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
        <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
          
          <div className="text-center space-y-4 mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <i className="fas fa-gem text-white text-2xl"></i>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
              Premium Access
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              To use Veo Video Generation and Image Editing, please connect a paid Google Cloud API Key.
            </p>
          </div>

          <div className="space-y-6">
            <button 
              onClick={handleSelectKey}
              className="w-full relative group overflow-hidden bg-slate-900 dark:bg-blue-600 text-white font-semibold py-4 rounded-2xl transition-all duration-300 transform active:scale-95 shadow-xl hover:shadow-blue-500/25"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                <i className="fas fa-key"></i> Connect API Key
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>

            <div className="text-center">
              <a 
                href="https://ai.google.dev/gemini-api/docs/billing" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-400 underline underline-offset-2"
              >
                Learn about Billing Requirements
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md transform transition-all duration-700 animate-in fade-in slide-in-from-bottom-8">
      <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-3xl p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500"></div>
        
        <div className="text-center space-y-4 mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-6 hover:rotate-0 transition-transform duration-300">
            <i className="fas fa-shield-halved text-white text-2xl"></i>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800 dark:text-white">
            Secure Entry
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Please enter your private access key to continue to the premium lounge.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative group">
            <input 
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError(false);
              }}
              className="w-full bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-4 pl-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 shadow-inner group-hover:border-blue-500/50"
              placeholder="Enter Access Key..."
              required
            />
            <i className="fas fa-key absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"></i>
          </div>

          <button 
            type="submit"
            className="w-full relative group overflow-hidden bg-slate-900 dark:bg-blue-600 text-white font-semibold py-4 rounded-2xl transition-all duration-300 transform active:scale-95 shadow-xl hover:shadow-blue-500/25"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              Unlock Terminal <i className="fas fa-arrow-right text-xs"></i>
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </button>
        </form>

        {error && (
          <p className="mt-4 text-rose-500 text-xs text-center flex items-center justify-center gap-1.5 animate-bounce">
            <i className="fas fa-circle-exclamation"></i> Invalid access key. Please try again.
          </p>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-400">
            Hint: Default key is <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-500">chat2024</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SecretKeyForm;
