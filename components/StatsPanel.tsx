import React from 'react';
import { Activity, ShieldCheck, Wifi, Database } from 'lucide-react';

export const StatsPanel: React.FC = () => {
  return (
    <div className="hidden lg:flex flex-col gap-4 w-64 h-full">
        {/* Status Card */}
        <div className="bg-jurassic-dark border border-jurassic-red/50 rounded p-4 shadow-[0_0_10px_rgba(239,68,68,0.1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-1">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            </div>
            <h3 className="font-display text-jurassic-red text-2xl tracking-wide mb-4">Park Status</h3>
            
            <div className="space-y-4 font-tech text-sm">
                <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500"/> Perimeter</span>
                    <span className="text-green-500">SECURE</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2"><Activity size={14} className="text-jurassic-amber"/> Power Grid</span>
                    <span className="text-jurassic-amber">98.4%</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-2"><Wifi size={14} className="text-blue-500"/> Network</span>
                    <span className="text-blue-500">ONLINE</span>
                </div>
            </div>
            
            <div className="mt-4 border-t border-red-900/50 pt-2">
                <p className="text-[10px] text-red-400 font-mono uppercase">Alert Level: Normal</p>
            </div>
        </div>

        {/* Database Card */}
        <div className="bg-jurassic-dark border border-jurassic-amber/30 rounded p-4 flex-1">
             <h3 className="font-display text-jurassic-amber text-xl tracking-wide mb-4 flex items-center gap-2">
                <Database size={18}/> 
                Dino DNA
             </h3>
             <div className="space-y-2">
                 {[
                     { name: 'Tyrannosaurus', code: 'T-REX', status: 'Active' },
                     { name: 'Velociraptor', code: 'V-RAP', status: 'Active' },
                     { name: 'Triceratops', code: 'TRI-C', status: 'Dormant' },
                     { name: 'Brachiosaurus', code: 'BRAC', status: 'Active' },
                     { name: 'Stegosaurus', code: 'STEG', status: 'Incubating' },
                 ].map((dino, idx) => (
                     <div key={idx} className="flex items-center justify-between bg-black/30 p-2 rounded border-l-2 border-jurassic-green hover:border-jurassic-amber transition-colors group cursor-default">
                         <div>
                            <div className="font-tech text-jurassic-amber text-xs">{dino.code}</div>
                            <div className="font-mono text-slate-400 text-[10px]">{dino.name}</div>
                         </div>
                         <div className={`w-1.5 h-1.5 rounded-full ${dino.status === 'Active' ? 'bg-green-500' : 'bg-yellow-600'}`}></div>
                     </div>
                 ))}
             </div>
             
             <div className="mt-auto pt-8">
                 <div className="bg-black p-2 font-mono text-[10px] text-green-500 border border-green-900 h-32 overflow-hidden opacity-70">
                     <p>> System check complete.</p>
                     <p>> Paddock 4 humidity rising.</p>
                     <p>> Feeder 12 refill required.</p>
                     <p>> Gemini AI link established.</p>
                     <p>> Nano Banana model ready.</p>
                     <p className="animate-pulse">> _</p>
                 </div>
             </div>
        </div>
    </div>
  );
};