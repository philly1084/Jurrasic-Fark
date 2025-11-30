import React from 'react';
import { GeneratedImage, ProcessingState } from '../types';
import { Aperture, RefreshCw, Radio, ChevronLeft, ChevronRight } from 'lucide-react';

interface VisualFeedProps {
  imageHistory: GeneratedImage[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  processingState: ProcessingState;
  onGenerateRequest: () => void;
  lastTopic: string;
}

export const VisualFeed: React.FC<VisualFeedProps> = ({ 
  imageHistory, 
  selectedIndex, 
  onSelectIndex,
  processingState, 
  onGenerateRequest, 
  lastTopic 
}) => {
  const currentImage = imageHistory[selectedIndex];
  const hasHistory = imageHistory.length > 0;

  const handlePrev = () => {
    if (selectedIndex < imageHistory.length - 1) {
      onSelectIndex(selectedIndex + 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex > 0) {
      onSelectIndex(selectedIndex - 1);
    }
  };

  return (
    <div className="flex flex-col h-full bg-jurassic-dark border-2 border-jurassic-amber rounded-lg overflow-hidden relative shadow-[0_0_15px_rgba(251,191,36,0.2)]">
      {/* Header */}
      <div className="bg-jurassic-amber/10 p-2 md:p-3 border-b-2 border-jurassic-amber flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-jurassic-amber">
          <Aperture size={18} className={processingState === ProcessingState.GeneratingImage ? "animate-spin" : ""} />
          <span className="font-tech tracking-wider uppercase text-sm md:text-lg glow-text">Visual Canvas</span>
        </div>
        <div className="flex gap-2 md:gap-4 items-center">
             <div className="flex items-center gap-1.5 px-2 py-0.5 border border-jurassic-amber/50 rounded-full bg-black/40">
                <Radio size={10} className="text-jurassic-amber animate-pulse" />
                <span className="text-[8px] md:text-[10px] font-tech text-jurassic-amber uppercase tracking-wider">Auto-Sync</span>
             </div>
             {hasHistory && (
               <span className="font-mono text-[10px] text-slate-400 hidden sm:inline-block">
                 REC {imageHistory.length - selectedIndex}/{imageHistory.length}
               </span>
             )}
        </div>
      </div>

      {/* Image Display Area */}
      <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden group min-h-0">
        
        {/* Grid Overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none opacity-20" 
             style={{backgroundImage: 'linear-gradient(rgba(251, 191, 36, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(251, 191, 36, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px'}}>
        </div>
        
        {/* Navigation Controls (Overlay) */}
        {hasHistory && (
            <>
                <button 
                    onClick={handlePrev}
                    disabled={selectedIndex >= imageHistory.length - 1}
                    className="absolute left-2 z-30 p-2 bg-black/50 text-jurassic-amber border border-jurassic-amber/30 hover:bg-jurassic-amber hover:text-black transition-colors rounded-full disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur-sm"
                >
                    <ChevronLeft size={24} />
                </button>
                <button 
                    onClick={handleNext}
                    disabled={selectedIndex <= 0}
                    className="absolute right-2 z-30 p-2 bg-black/50 text-jurassic-amber border border-jurassic-amber/30 hover:bg-jurassic-amber hover:text-black transition-colors rounded-full disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur-sm"
                >
                    <ChevronRight size={24} />
                </button>
            </>
        )}

        {/* Loading State */}
        {processingState === ProcessingState.GeneratingImage && selectedIndex === 0 ? (
            <div className="text-center z-20 p-4">
                <div className="inline-block w-12 h-12 md:w-16 md:h-16 border-4 border-t-jurassic-amber border-r-transparent border-b-jurassic-amber border-l-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-tech text-jurassic-amber text-lg md:text-xl tracking-widest animate-pulse">RENDERING...</p>
                <p className="font-mono text-slate-500 text-xs mt-2">Connecting to Nano Banana Model...</p>
            </div>
        ) : currentImage ? (
            <div className="relative w-full h-full p-2 flex items-center justify-center">
                 {/* Main Image - strictly contained */}
                 <img 
                    src={currentImage.dataUrl} 
                    alt={currentImage.prompt} 
                    className="w-full h-full object-contain z-0 shadow-2xl"
                 />
                 
                 {/* Image Info Overlay */}
                 <div className="absolute bottom-4 left-4 right-14 z-20 pointer-events-none">
                     <div className="bg-black/80 p-2 border-l-2 border-jurassic-amber backdrop-blur-md inline-block max-w-full">
                        <p className="font-tech text-jurassic-amber text-[8px] md:text-[10px] uppercase tracking-wider mb-1">Subject Identified</p>
                        <p className="font-mono text-white text-xs md:text-sm capitalize truncate">{currentImage.prompt}</p>
                     </div>
                 </div>
            </div>
        ) : (
            <div className="text-center text-slate-600 z-20 p-4">
                <Aperture size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-tech text-lg uppercase tracking-widest opacity-50">No Visual Data</p>
                <p className="font-mono text-xs opacity-40 max-w-xs mx-auto mt-2">
                    Waiting for agent to transmit visual coordinates...
                </p>
            </div>
        )}
      </div>

      {/* Control Panel / Footer */}
      <div className="bg-slate-900 p-2 md:p-3 border-t-2 border-jurassic-amber/30 shrink-0">
        <div className="flex items-center justify-between gap-4">
             <div className="flex-1 overflow-hidden">
                <p className="font-tech text-[10px] text-jurassic-amber uppercase mb-0.5">Latest Stream Data</p>
                <div className="font-mono text-[10px] md:text-xs text-slate-400 truncate">
                    {lastTopic ? `>> ${lastTopic}` : ">> Waiting for input..."}
                </div>
             </div>
             
             <button 
                onClick={onGenerateRequest}
                disabled={!lastTopic || processingState !== ProcessingState.Idle}
                className="bg-jurassic-green/50 hover:bg-jurassic-green text-jurassic-amber border border-jurassic-amber/50 hover:border-jurassic-amber font-tech uppercase px-2 py-1 md:px-3 md:py-1.5 flex items-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-[10px] md:text-xs shrink-0"
                title="Manual Override"
             >
                <RefreshCw size={12} />
                <span className="hidden sm:inline">Override</span>
             </button>
        </div>
      </div>
    </div>
  );
};