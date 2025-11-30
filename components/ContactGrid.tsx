
import React from 'react';
import { Contact } from '../types';
import { User, Shield, Radio, Code, Leaf } from 'lucide-react';

interface ContactGridProps {
  contacts: Contact[];
  currentContactId: string;
  onSelectContact: (contact: Contact) => void;
}

export const ContactGrid: React.FC<ContactGridProps> = ({ contacts, currentContactId, onSelectContact }) => {
  const getIcon = (role: string) => {
      if (role.includes('Paleontologist')) return <User size={16} />;
      if (role.includes('Botanist')) return <Leaf size={16} />;
      if (role.includes('Warden')) return <Shield size={16} />;
      if (role.includes('Programmer')) return <Code size={16} />;
      return <Radio size={16} />;
  };

  return (
    <div className="bg-jurassic-dark border-2 border-jurassic-green rounded-lg p-2 h-full flex flex-col shadow-[0_0_15px_rgba(30,41,59,0.5)]">
      <div className="bg-jurassic-green/50 p-2 mb-2 border-b border-white/10">
        <h3 className="font-tech uppercase text-jurassic-amber text-xs tracking-widest flex items-center gap-2">
            <Radio size={12} className="animate-pulse" />
            Park Directory
        </h3>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 overflow-y-auto">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onSelectContact(contact)}
            className={`flex items-center gap-3 p-3 rounded border transition-all text-left group ${
              currentContactId === contact.id
                ? 'bg-jurassic-amber/20 border-jurassic-amber'
                : 'bg-black/40 border-slate-700 hover:bg-slate-800 hover:border-slate-500'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 shrink-0 ${
                currentContactId === contact.id ? 'border-jurassic-amber bg-jurassic-amber text-black' : 'border-slate-600 bg-slate-900 text-slate-400 group-hover:border-slate-400'
            }`}>
                {getIcon(contact.role)}
            </div>
            <div className="min-w-0">
                <div className={`font-display text-lg leading-none mb-1 truncate ${currentContactId === contact.id ? 'text-jurassic-amber' : 'text-slate-300'}`}>
                    {contact.name}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wide text-slate-500 truncate">
                    {contact.role}
                </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
