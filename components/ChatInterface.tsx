
import React, { useRef, useEffect } from 'react';
import { Message, Sender, ProcessingState, Contact } from '../types';
import { Terminal, Send, Cpu, User, Mic, MicOff, Volume2, VolumeX, Radio, Power, PowerOff, Phone } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  processingState: ProcessingState;
  onToggleVoice: () => void;
  isVoiceActive: boolean;
  isTTSEnabled: boolean;
  onToggleTTS: () => void;
  onPushToTalk: (pressed: boolean) => void;
  isTransmitting: boolean;
  contact: Contact;
  onOpenContacts: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  messages, 
  onSendMessage, 
  processingState,
  onToggleVoice,
  isVoiceActive,
  isTTSEnabled,
  onToggleTTS,
  onPushToTalk,
  isTransmitting,
  contact,
  onOpenContacts
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputText, setInputText] = React.useState('');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && processingState === ProcessingState.Idle) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-jurassic-dark border-2 border-jurassic-green rounded-lg overflow-hidden relative shadow-[0_0_15px_rgba(30,41,59,0.5)]">
      {/* Header */}
      <div className="bg-jurassic-green p-3 border-b-2 border-jurassic-amber/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Terminal size={18} className="text-jurassic-amber shrink-0" />
          <div className="flex flex-col min-w-0">
              <span className={`font-tech tracking-wider uppercase text-lg leading-none ${contact.themeColor} truncate`}>
                {contact.name}
              </span>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide truncate">
                {contact.role}
              </span>
          </div>
        </div>
        
        <div className="flex gap-2 items-center shrink-0">
           {/* Mobile Contact Switcher Trigger */}
           <button 
             onClick={onOpenContacts}
             className="lg:hidden p-1.5 rounded bg-slate-800 text-jurassic-amber hover:bg-slate-700"
             title="Switch Contact"
           >
             <Phone size={16} />
           </button>

           <div className="h-6 w-px bg-white/10 mx-1"></div>

           <button 
             onClick={onToggleTTS} 
             className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${isTTSEnabled ? 'text-jurassic-amber' : 'text-slate-500'}`}
             title={isTTSEnabled ? "Mute Speaker" : "Enable Speaker"}
           >
             {isTTSEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
           </button>
           
           <div className={`w-2.5 h-2.5 rounded-full ${processingState !== ProcessingState.Idle ? 'bg-jurassic-amber animate-pulse' : isVoiceActive ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500'}`}></div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm scroll-smooth min-h-0" ref={scrollRef}>
        {messages.length === 0 && (
            <div className="text-center text-slate-500 mt-10 font-tech uppercase tracking-widest opacity-50">
                Connection Established.<br/>
                {contact.name} is online.
            </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === Sender.User ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] p-3 rounded-sm border-l-4 shadow-lg ${
                msg.sender === Sender.User
                  ? 'bg-slate-800 border-jurassic-amber text-slate-100'
                  : 'bg-slate-900 text-slate-300'
              }`}
              style={{
                  borderColor: msg.sender !== Sender.User ? (contact.themeColor.replace('text-', '') === 'white' ? '#fff' : undefined) : undefined
              }}
            >
              <div className="flex items-center gap-2 mb-1 border-b border-white/10 pb-1 text-xs font-tech uppercase tracking-wider opacity-70">
                {msg.sender === Sender.User ? <User size={12} /> : <Cpu size={12} />}
                <span className={msg.sender !== Sender.User ? contact.themeColor : 'text-jurassic-amber'}>
                    {msg.sender === Sender.User ? 'YOU' : contact.name.split(' ').pop()?.toUpperCase()}
                </span>
                <span className="ml-auto opacity-50">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed font-mono">{msg.text}</p>
            </div>
          </div>
        ))}
        
        {processingState === ProcessingState.Thinking && (
          <div className="flex justify-start animate-pulse">
             <div className="bg-slate-900 border-l-4 border-slate-600 p-3 text-slate-400 font-tech text-xs">
                INCOMING TRANSMISSION...
             </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-jurassic-green/50 border-t-2 border-jurassic-amber/20 p-4 shrink-0">
        
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isVoiceActive ? "Voice Channel Open..." : `Message ${contact.name.split(' ').pop()}...`}
            className="flex-1 bg-black/50 border border-jurassic-amber/30 text-jurassic-amber p-3 font-mono focus:outline-none focus:border-jurassic-amber focus:ring-1 focus:ring-jurassic-amber transition-all placeholder-slate-600 disabled:opacity-50 text-sm sm:text-base"
            disabled={processingState !== ProcessingState.Idle && !isVoiceActive}
          />
          <button
            type="submit"
            disabled={processingState !== ProcessingState.Idle || !inputText.trim()}
            className="bg-jurassic-amber hover:bg-jurassic-amber-glow text-black font-bold font-tech px-4 py-2 uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </form>
        
        {/* Voice Control Bar */}
        <div className="flex items-center justify-between border-t border-white/5 pt-3 gap-3">
            <button
              type="button"
              onClick={onToggleVoice}
              className={`flex items-center gap-2 px-3 py-2 font-tech uppercase tracking-wider text-xs transition-all rounded-sm border shrink-0 ${
                isVoiceActive 
                  ? 'bg-red-500/10 text-red-400 border-red-900 hover:bg-red-500/30' 
                  : 'bg-green-600/10 text-green-400 border-green-800 hover:bg-green-600/30'
              }`}
            >
              {isVoiceActive ? <PowerOff size={14} /> : <Power size={14} />}
              {isVoiceActive ? 'Terminate' : 'Call'}
            </button>

            {isVoiceActive && (
                 <button
                    onMouseDown={() => onPushToTalk(true)}
                    onMouseUp={() => onPushToTalk(false)}
                    onMouseLeave={() => onPushToTalk(false)}
                    onTouchStart={(e) => { e.preventDefault(); onPushToTalk(true); }}
                    onTouchEnd={(e) => { e.preventDefault(); onPushToTalk(false); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 font-tech uppercase tracking-widest text-sm transition-all rounded-sm border-2 select-none active:scale-95 ${
                        isTransmitting 
                        ? 'bg-jurassic-amber text-black border-jurassic-amber shadow-[0_0_15px_#fbbf24]' 
                        : 'bg-black/50 text-slate-400 border-slate-600 hover:bg-slate-800 hover:border-slate-400'
                    }`}
                    style={{
                        background: isTransmitting 
                            ? '#fbbf24' 
                            : 'repeating-linear-gradient(45deg, #1e293b, #1e293b 10px, #0f172a 10px, #0f172a 20px)'
                    }}
                 >
                    <Radio size={18} className={isTransmitting ? "animate-pulse" : ""} />
                    {isTransmitting ? 'TRANSMITTING...' : 'HOLD TO TALK'}
                 </button>
            )}
            
            {!isVoiceActive && (
                <div className="flex-1 text-center font-mono text-[10px] text-slate-500 py-2 border border-dashed border-slate-800 rounded">
                    VOICE UPLINK OFFLINE
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
