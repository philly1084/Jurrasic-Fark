
import React from 'react';
import { CharacterAvatar, ProcessingState, Contact } from '../types';
import { Video, Signal, Loader, User } from 'lucide-react';

interface RangerFeedProps {
  avatar: CharacterAvatar | null;
  processingState: ProcessingState;
  isVoiceActive: boolean;
  isTransmitting?: boolean;
  contact: Contact;
}

export const RangerFeed: React.FC<RangerFeedProps> = ({ avatar, processingState, isVoiceActive, isTransmitting, contact }) => {
  const isUpdating = processingState === ProcessingState.UpdatingAvatar;

  return (
    <div className="flex flex-col h-48 sm:h-64 bg-jurassic-dark border-2 border-jurassic-green rounded-lg overflow-hidden relative shadow-[0_0_15px_rgba(30,41,59,0.5)] mb-4">
      {/* Header */}
      <div className="bg-jurassic-green px-3 py-1 border-b border-jurassic-amber/20 flex items-center justify-between z-20">
        <div className="flex items-center gap-2 text-jurassic-amber truncate mr-2">
          <Video size={16} className="shrink-0" />
          <span className={`font-tech tracking-wider uppercase text-xs sm:text-sm truncate ${contact.themeColor}`}>
            Uplink: {contact.name.split(' ')[1] || contact.name}
          </span>
        </div>
        <div className="flex gap-2 items-center shrink-0">
             <Signal size={14} className={`${isVoiceActive ? 'text-green-500' : 'text-slate-500'} ${isVoiceActive ? 'animate-pulse' : ''}`} />
             <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">SECURE-CH</span>
        </div>
      </div>

      {/* Video Area */}
      <div className="relative flex-1 bg-black w-full overflow-hidden">
        
        {/* Scanlines Effect */}
        <div className="absolute inset-0 pointer-events-none z-10 opacity-30 video-scanlines"></div>
        <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-transparent to-black/40"></div>

        {/* Avatar Image */}
        {avatar && avatar.contactId === contact.id ? (
            <img 
                src={avatar.dataUrl} 
                alt={contact.name} 
                className={`w-full h-full object-cover object-center transition-opacity duration-500 ${isUpdating ? 'opacity-80' : 'opacity-100'}`}
            />
        ) : (
             <div className="w-full h-full flex flex-col items-center justify-center text-jurassic-green bg-black animate-pulse">
                  <User size={32} className="mb-2 opacity-50" />
                  <span className="font-tech text-xs tracking-widest opacity-70">ESTABLISHING FEED...</span>
             </div>
        )}

        {/* Overlays */}
        <div className="absolute top-2 left-2 z-10">
            <div className={`bg-black/50 border px-2 py-0.5 rounded backdrop-blur-sm transition-colors ${isTransmitting ? 'border-jurassic-amber' : 'border-green-500/30'}`}>
                <span className={`text-[10px] font-mono uppercase flex items-center gap-1 ${isTransmitting ? 'text-jurassic-amber' : 'text-green-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isTransmitting ? 'bg-jurassic-amber' : 'bg-green-500'}`}></span>
                    {isTransmitting ? 'TX: SENDING AUDIO' : 'LIVE FEED'}
                </span>
            </div>
        </div>

        {/* Status Text (Simulating video data) */}
        <div className="absolute bottom-2 right-2 z-10 flex flex-col items-end text-[8px] font-mono text-white/50">
             <span>ISO 800</span>
             <span>F/1.8</span>
             <span>{avatar?.timestamp || '000000'}</span>
        </div>
      </div>
    </div>
  );
};
