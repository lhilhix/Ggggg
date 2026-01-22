
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Message, Role, UserProfile } from '../types';
import { GeminiService } from '../services/geminiService';

interface Props {
  message: Message;
  profile: UserProfile;
  highlight?: string;
}

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  
  // Decodes common HTML entities that might have been accidentally encoded
  const rawCode = useMemo(() => {
    const doc = new DOMParser().parseFromString(code, 'text/html');
    return doc.documentElement.textContent || code;
  }, [code]);

  const highlightedCode = useMemo(() => {
    if ((window as any).Prism && (window as any).Prism.languages[language]) {
      return (window as any).Prism.highlight(rawCode, (window as any).Prism.languages[language], language);
    }
    return rawCode.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
  }, [rawCode, language]);

  const handleCopy = () => {
    // Explicitly copy the raw code, not the highlighted HTML or the rendered elements
    navigator.clipboard.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy code:', err);
    });
  };

  return (
    <div className="my-5 rounded-2xl overflow-hidden bg-[#0d1117] border border-slate-800 shadow-xl group/code">
      <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <i className="fas fa-code text-blue-500"></i>
          {language || 'code'}
        </span>
        <button 
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          className={`text-[11px] flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-medium border ${
            copied 
              ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
              : 'text-slate-200 border-slate-700 bg-slate-800/50 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-5 overflow-x-auto custom-scrollbar">
        <code className={`language-${language} text-sm`} dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
};

const InlineMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|https?:\/\/[^\s]+)/g;
  const segments = text.split(inlineRegex);
  return (
    <>
      {segments.map((segment, i) => {
        if (!segment) return null;
        if (segment.startsWith('**') && segment.endsWith('**')) return <strong key={i} className="font-bold text-slate-900 dark:text-white">{segment.slice(2, -2)}</strong>;
        if (segment.startsWith('*') && segment.endsWith('*')) return <em key={i} className="italic">{segment.slice(1, -1)}</em>;
        if (segment.startsWith('`') && segment.endsWith('`')) return <code key={i} className="bg-slate-200/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-md text-blue-600 dark:text-blue-300 fira-code text-[0.9em]">{segment.slice(1, -1)}</code>;
        if (segment.startsWith('http')) return <a key={i} href={segment} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-600 underline underline-offset-2 transition-colors">{segment}</a>;
        return segment;
      })}
    </>
  );
};

const MessageBubble: React.FC<Props> = ({ message, profile }) => {
  const isUser = message.role === Role.USER;
  const [playbackState, setPlaybackState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  const handlePlayPause = async () => {
    if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const ctx = audioContextRef.current;
    
    if (playbackState === 'idle') {
      setPlaybackState('loading');
      const audioData = await GeminiService.generateAudio(message.content);
      if (audioData) {
        audioBufferRef.current = await GeminiService.decodeAudio(audioData, ctx);
        startPlayback(0);
      } else {
        setPlaybackState('idle');
      }
    } else if (playbackState === 'playing') {
      offsetRef.current += ctx.currentTime - startTimeRef.current;
      sourceNodeRef.current?.stop();
      sourceNodeRef.current = null;
      setPlaybackState('paused');
    } else {
      startPlayback(offsetRef.current);
    }
  };

  const handleStop = () => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
    }
    offsetRef.current = 0;
    setPlaybackState('idle');
  };

  const startPlayback = (offset: number) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(audioContextRef.current.destination);
    
    source.onended = () => {
      if (sourceNodeRef.current === source) {
        setPlaybackState('idle');
        offsetRef.current = 0;
        sourceNodeRef.current = null;
      }
    };
    
    sourceNodeRef.current = source;
    startTimeRef.current = audioContextRef.current.currentTime;
    
    const startAt = Math.min(offset, audioBufferRef.current.duration - 0.01);
    source.start(0, Math.max(0, startAt));
    setPlaybackState('playing');
  };

  const renderContent = () => {
    const parts = message.content.split(/```(\w+)?\n([\s\S]*?)```/g);
    if (parts.length === 1) return <div className="leading-relaxed"><InlineMarkdown text={message.content} /></div>;
    const results = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 3 === 0) results.push(<div key={i} className="mb-4 last:mb-0"><InlineMarkdown text={parts[i]} /></div>);
      else if (i % 3 === 1) {
        // parts[i] is language, parts[i+1] is code
        results.push(<CodeBlock key={i} language={parts[i] || 'js'} code={parts[i+1] || ''} />);
      }
    }
    return results;
  };

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
      <div className={`flex flex-col max-w-[90%] md:max-w-[80%] ${isUser ? 'items-end' : 'items-start'} space-y-2`}>
        {!isUser && <div className="flex items-center gap-2 ml-1"><div className="w-6 h-6 bg-blue-600 rounded-lg flex items-center justify-center text-[10px] text-white shadow-lg"><i className="fas fa-sparkles"></i></div><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lumina AI</span></div>}
        <div className="flex items-end gap-2 group/message">
          <div className={`relative group px-6 py-4 rounded-[2rem] transition-all ${isUser ? 'bg-slate-900 dark:bg-blue-600 text-white rounded-tr-sm shadow-xl' : 'bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-tl-sm shadow-sm border border-slate-200 dark:border-slate-700'}`}>
            {message.image && <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-slate-50 dark:bg-slate-900/50"><img src={message.image} className="w-full max-h-[500px] object-contain" alt="Result" /></div>}
            {message.video && <div className="mb-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl bg-black"><video src={message.video} controls className="w-full aspect-video" autoPlay loop muted /></div>}
            <div className="text-sm md:text-base">{renderContent()}</div>
            {message.grounding && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
                {message.grounding.map((chunk: any, i: number) => {
                  if (chunk.maps) {
                    return (
                      <a key={`maps-${i}`} href={chunk.maps.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold border border-blue-500/20 hover:bg-blue-500/20 transition-all">
                        <i className="fas fa-location-dot"></i> {chunk.maps.title || "View on Maps"}
                      </a>
                    );
                  }
                  if (chunk.web) {
                    return (
                      <a key={`web-${i}`} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold border border-indigo-500/20 hover:bg-indigo-500/20 transition-all">
                        <i className="fas fa-globe"></i> {chunk.web.title || "Search Source"}
                      </a>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
          {!isUser && message.content && (
            <div className="flex flex-col gap-2 opacity-0 group-hover/message:opacity-100 transition-all">
              <button 
                onClick={handlePlayPause} 
                disabled={playbackState === 'loading'}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg border border-slate-200 dark:border-slate-700 ${playbackState === 'playing' ? 'bg-blue-600 text-white animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-500 hover:text-blue-600 active:scale-95'}`}
                title={playbackState === 'playing' ? 'Pause' : 'Play'}
              >
                {playbackState === 'loading' ? (
                  <i className="fas fa-circle-notch fa-spin text-xs"></i>
                ) : (
                  // Fixed the className by removing stray syntax characters.
                  <i className={`fas ${playbackState === 'playing' ? 'fa-pause' : 'fa-play'} text-xs`}></i>
                )}
              </button>

              {(playbackState === 'playing' || playbackState === 'paused') && (
                <button 
                  onClick={handleStop}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-rose-500 active:scale-95"
                  title="Stop"
                >
                  <i className="fas fa-stop text-[10px]"></i>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
