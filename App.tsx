
import React, { useState, useEffect, useCallback } from 'react';
import { AppStep, UserProfile, Role, Message } from './types';
import SecretKeyForm from './components/SecretKeyForm';
import UsernameForm from './components/UsernameForm';
import ChatInterface from './components/ChatInterface';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SECRET_KEY);
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('lumina_profile');
    return saved ? JSON.parse(saved) : {
      username: '',
      avatar: `https://picsum.photos/seed/${Math.random()}/100/100`,
      isAuth: false,
      theme: 'dark'
    };
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('lumina_messages');
    return saved ? JSON.parse(saved).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : [];
  });

  useEffect(() => {
    localStorage.setItem('lumina_profile', JSON.stringify(profile));
    if (profile.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('lumina_messages', JSON.stringify(messages));
  }, [messages]);

  const handleAuthSuccess = useCallback(() => {
    setProfile(prev => ({ ...prev, isAuth: true }));
    setStep(AppStep.USERNAME);
  }, []);

  const handleUsernameSet = useCallback((name: string) => {
    setProfile(prev => ({ ...prev, username: name }));
    setStep(AppStep.CHAT);
  }, []);

  const toggleTheme = useCallback(() => {
    setProfile(prev => ({ ...prev, theme: prev.theme === 'light' ? 'dark' : 'light' }));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('lumina_messages');
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center transition-colors duration-500 bg-slate-100 dark:bg-[#0a0f1d] overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-600/5 blur-[120px] rounded-full floating-bg"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 dark:bg-purple-600/5 blur-[120px] rounded-full floating-bg" style={{ animationDelay: '-5s' }}></div>
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-emerald-500/10 dark:bg-emerald-600/5 blur-[120px] rounded-full floating-bg" style={{ animationDelay: '-10s' }}></div>
      </div>

      <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
        {step === AppStep.SECRET_KEY && (
          <SecretKeyForm onSuccess={handleAuthSuccess} />
        )}
        
        {step === AppStep.USERNAME && (
          <UsernameForm profile={profile} onSet={handleUsernameSet} />
        )}

        {step === AppStep.CHAT && (
          <ChatInterface 
            profile={profile} 
            messages={messages} 
            setMessages={setMessages} 
            toggleTheme={toggleTheme}
            clearChat={clearChat}
          />
        )}
      </div>
    </div>
  );
};

export default App;
