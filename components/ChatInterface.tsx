
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UserProfile, Message, Role } from '../types';
import { GeminiService } from '../services/geminiService';
import MessageBubble from './MessageBubble';

interface Props {
  profile: UserProfile;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  toggleTheme: () => void;
  clearChat: () => void;
}

const AVAILABLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', icon: 'fa-bolt' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', icon: 'fa-brain' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite', icon: 'fa-feather' },
];

const ChatInterface: React.FC<Props> = ({ profile, messages, setMessages, toggleTheme, clearChat }) => {
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [deepThink, setDeepThink] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('lumina_model') || 'gemini-3-flash-preview';
  });
  const [isGenerating, setIsGenerating] = useState<null | 'image' | 'video' | 'edit'>(null);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [currentGrounding, setCurrentGrounding] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('lumina_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => console.log("Geolocation denied")
      );
    }
  }, []);

  // Smooth scroll to bottom effect
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, streamingContent, isGenerating]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedInput = inputValue.trim();
    if ((!trimmedInput && !selectedImage) || isTyping) return;

    // Handle Commands
    if (trimmedInput.startsWith('/draw ')) {
      handleImageGeneration(trimmedInput.slice(6));
      setInputValue('');
      return;
    }
    if (trimmedInput.startsWith('/animate') && selectedImage) {
      handleVideoGeneration(trimmedInput.slice(8).trim() || "Animate this photo beautifully");
      setInputValue('');
      return;
    }
    if (trimmedInput.startsWith('/edit') && selectedImage) {
      handleImageEdit(selectedImage, trimmedInput.slice(5).trim() || "Improve this image");
      setInputValue('');
      return;
    }

    const currentInput = trimmedInput;
    const currentImage = selectedImage;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: Role.USER,
      content: currentInput,
      timestamp: new Date(),
      image: currentImage || undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setSelectedImage(null);
    setIsTyping(true);
    setStreamingContent('');
    setCurrentGrounding([]);

    try {
      const stream = GeminiService.streamChat(
        messages.concat(userMsg), 
        currentInput, 
        currentImage || undefined, 
        deepThink, 
        userLocation,
        selectedModel
      );
      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk.text;
        setStreamingContent(fullContent);
        if (chunk.grounding) setCurrentGrounding(chunk.grounding.groundingChunks || []);
      }
      setMessages(prev => [...prev, { 
        id: `a-${Date.now()}`, 
        role: Role.ASSISTANT, 
        content: fullContent, 
        timestamp: new Date(),
        grounding: currentGrounding.length > 0 ? currentGrounding : undefined
      }]);
      setStreamingContent('');
    } finally {
      setIsTyping(false);
    }
  };

  const handleImageGeneration = async (prompt: string) => {
    setIsGenerating('image');
    const imageUrl = await GeminiService.generateImage(prompt);
    if (imageUrl) {
      setMessages(prev => [...prev, { 
        id: `a-img-${Date.now()}`, role: Role.ASSISTANT, 
        content: `Generated: "${prompt}"`, timestamp: new Date(), image: imageUrl 
      }]);
    }
    setIsGenerating(null);
  };

  const handleImageEdit = async (image: string, prompt: string) => {
    setIsGenerating('edit');
    const imageUrl = await GeminiService.editImage(image, prompt);
    if (imageUrl) {
      setMessages(prev => [...prev, { 
        id: `a-edit-${Date.now()}`, role: Role.ASSISTANT, 
        content: `Edited: "${prompt}"`, timestamp: new Date(), image: imageUrl 
      }]);
    }
    setSelectedImage(null);
    setIsGenerating(null);
  };

  const handleVideoGeneration = async (prompt: string) => {
    if (!selectedImage) return;
    setIsGenerating('video');
    const videoUrl = await GeminiService.generateVideo(selectedImage, prompt);
    if (videoUrl) {
      setMessages(prev => [...prev, { 
        id: `a-vid-${Date.now()}`, role: Role.ASSISTANT, 
        content: `Animation complete: "${prompt}"`, timestamp: new Date(), video: videoUrl 
      }]);
    }
    setSelectedImage(null);
    setIsGenerating(null);
  };

  return (
    <div className="w-full max-w-6xl h-[94vh] flex flex-col bg-white/70 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/20 dark:border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden">
      <header className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={profile.avatar} className="w-11 h-11 rounded-2xl object-cover ring-2 ring-blue-500/20" alt="Avatar" />
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white dark:border-slate-900 rounded-full bg-emerald-500`}></div>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">Lumina AI</h1>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Premium Intelligence</span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700">
            {AVAILABLE_MODELS.map(model => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  selectedModel === model.id 
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title={model.name}
              >
                <i className={`fas ${model.icon}`}></i>
                <span className="hidden lg:inline">{model.name.split(' ')[2] || 'Flash'}</span>
              </button>
            ))}
          </div>

          <button onClick={toggleTheme} className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500 transition-all shadow-sm border border-slate-200 dark:border-slate-700">
            <i className={`fas ${profile.theme === 'light' ? 'fa-moon' : 'fa-sun'}`}></i>
          </button>
          
          <button onClick={clearChat} className="p-3 rounded-2xl hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all">
            <i className="fas fa-trash-can"></i>
          </button>
        </div>
      </header>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 md:px-12 py-8 space-y-8 custom-scrollbar">
        {messages.length === 0 && !streamingContent && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <div className="w-24 h-24 bg-blue-500/5 rounded-[2.5rem] flex items-center justify-center mb-6"><i className="fas fa-sparkles text-4xl text-blue-500/50"></i></div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Hello, {profile.username}</h2>
            <p className="text-sm mt-2 max-w-xs">Ask anything, or use commands like <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/draw</code> or <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">/animate</code>.</p>
          </div>
        )}
        {messages.map((msg) => <MessageBubble key={msg.id} message={msg} profile={profile} />)}
        {streamingContent && <MessageBubble message={{ id: 'streaming', role: Role.ASSISTANT, content: streamingContent, timestamp: new Date(), grounding: currentGrounding.length > 0 ? currentGrounding : undefined }} profile={profile} />}
        {isGenerating && (
          <div className="flex justify-start">
            <div className="bg-slate-900/5 dark:bg-white/5 backdrop-blur-md rounded-3xl p-8 flex flex-col items-center gap-4 animate-pulse border border-blue-500/20">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                <i className={`fas ${isGenerating === 'video' ? 'fa-video' : 'fa-palette'} text-blue-500 text-2xl`}></i>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  {isGenerating === 'video' ? 'Directing Veo Cinema...' : 'Creative Processing...'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-1">This may take a moment to perfect</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <footer className="p-8 pt-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative">
          {selectedImage && !isGenerating && (
            <div className="absolute bottom-full left-0 mb-4 flex items-end gap-3 animate-in slide-in-from-bottom-4">
              <div className="relative group">
                <img src={selectedImage} className="w-32 h-32 object-cover rounded-2xl shadow-2xl border-4 border-white dark:border-slate-800" alt="Preview" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg"><i className="fas fa-times text-xs"></i></button>
              </div>
              <div className="flex flex-col gap-2 mb-2">
                <button type="button" onClick={() => setInputValue('/animate ')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-indigo-500 transition-all"><i className="fas fa-movie"></i> Animate</button>
                <button type="button" onClick={() => setInputValue('/edit ')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 hover:bg-emerald-500 transition-all"><i className="fas fa-wand-magic-sparkles"></i> Edit</button>
              </div>
            </div>
          )}

          <div className={`flex items-center gap-2 p-2 rounded-[2.5rem] transition-all bg-white dark:bg-slate-950 border-2 shadow-xl border-slate-100 dark:border-slate-800`}>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-12 h-12 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-500"><i className="fas fa-image"></i></button>
            <input type="file" ref={fileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => setSelectedImage(reader.result as string);
                reader.readAsDataURL(file);
              }
            }} className="hidden" accept="image/*" />
            <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder={selectedImage ? "Describe edit or animation..." : "Ask Lumina anything... (Try /draw)"} className="flex-1 bg-transparent py-4 px-2 outline-none text-slate-800 dark:text-white" />
            <button type="submit" disabled={isTyping} className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-white transition-all bg-blue-600 disabled:opacity-20`}><i className="fas fa-paper-plane text-sm"></i></button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default ChatInterface;
