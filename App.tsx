
import React, { useState, useEffect, useRef } from 'react';
import { sendMessageToAgent, generateDinosaurImage, generateAvatar, LiveSession, playTextAsSpeech, stopAudioPlayback } from './services/geminiService';
import { ChatInterface } from './components/ChatInterface';
import { VisualFeed } from './components/VisualFeed';
import { RangerFeed } from './components/RangerFeed';
import { ContactGrid } from './components/ContactGrid';
import { Message, Sender, GeneratedImage, ProcessingState, CharacterAvatar, AvatarMood, Contact } from './types';
import { PARK_CONTACTS } from './data/contacts';
import { Disc, X } from 'lucide-react';

export default function App() {
  const [currentContact, setCurrentContact] = useState<Contact>(PARK_CONTACTS[0]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [processingState, setProcessingState] = useState<ProcessingState>(ProcessingState.Idle);
  const [currentSubject, setCurrentSubject] = useState<string>(''); 
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  
  // Store avatars per contact to avoid regenerating when switching back
  const [avatars, setAvatars] = useState<Record<string, CharacterAvatar>>({});
  const [showMobileContacts, setShowMobileContacts] = useState(false);
  
  const liveSessionRef = useRef<LiveSession | null>(null);

  // Initialize selected contact (Avatar & Welcome Msg) if empty
  useEffect(() => {
    initContact(currentContact);
  }, [currentContact]);

  const initContact = async (contact: Contact) => {
      let welcomeText = "";
      
      // 1. Set Welcome Message if none
      if (!messages[contact.id] || messages[contact.id].length === 0) {
          welcomeText = `This is ${contact.name}. ${contact.role}. How can I help you?`;
          setMessages(prev => ({
              ...prev,
              [contact.id]: [{
                  id: Date.now().toString(),
                  sender: Sender.Agent,
                  text: welcomeText,
                  timestamp: Date.now(),
              }]
          }));
      }

      // 2. Generate Avatar if missing
      if (!avatars[contact.id]) {
          updateAvatar(contact, 'listening');
      }
      
      // 3. Trigger TTS for welcome message if enabled
      // Only play if we just created the message (to avoid re-playing on every render if msg exists)
      // or if the user expects the agent to always announce themselves when switching.
      if (welcomeText && isTTSEnabled && !isVoiceActive) {
          playTextAsSpeech(welcomeText, contact.voiceName);
      }
  };

  const updateAvatar = async (contact: Contact, mood: AvatarMood) => {
    try {
        const dataUrl = await generateAvatar(contact, mood);
        setAvatars(prev => ({
            ...prev,
            [contact.id]: {
                contactId: contact.id,
                mood,
                dataUrl,
                timestamp: Date.now()
            }
        }));
    } catch (e) {
        console.error("Failed to update avatar", e);
    }
  };

  const handleSwitchContact = async (contact: Contact) => {
      if (contact.id === currentContact.id) {
          setShowMobileContacts(false);
          return;
      }

      // Stop voice if active
      if (isVoiceActive && liveSessionRef.current) {
          liveSessionRef.current.stop();
          liveSessionRef.current = null;
          setIsVoiceActive(false);
          setIsTransmitting(false);
      }
      
      // Stop any pending TTS from previous contact
      stopAudioPlayback();

      setCurrentContact(contact);
      setShowMobileContacts(false);
      // initContact effect will trigger
  };

  const addMessage = (contactId: string, msg: Message) => {
      setMessages(prev => ({
          ...prev,
          [contactId]: [...(prev[contactId] || []), msg]
      }));
  };

  const handleSendMessage = async (text: string) => {
    const contactId = currentContact.id;
    
    // Optimistic user message
    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: Sender.User,
      text: text,
      timestamp: Date.now(),
    };

    addMessage(contactId, newUserMsg);
    setProcessingState(ProcessingState.Thinking);
    setCurrentSubject(text); 
    
    try {
      const response = await sendMessageToAgent(currentContact, text);
      
      const newAgentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: Sender.Agent,
        text: response.text,
        timestamp: Date.now(),
      };
      
      addMessage(contactId, newAgentMsg);
      
      // Handle Avatar Mood
      let nextMood: AvatarMood = 'speaking';
      const lowerRes = response.text.toLowerCase();
      if (lowerRes.includes('dangerous') || lowerRes.includes('warning') || lowerRes.includes('run')) {
          nextMood = 'alert';
      } else if (lowerRes.includes('great') || lowerRes.includes('love') || lowerRes.includes('wonderful')) {
          nextMood = 'happy';
      } else if (lowerRes.includes('hmm') || lowerRes.includes('think')) {
          nextMood = 'thinking';
      }
      
      updateAvatar(currentContact, nextMood);

      // Trigger TTS
      if (isTTSEnabled && !isVoiceActive) {
          playTextAsSpeech(response.text, currentContact.voiceName);
      }

      // Handle Automatic Visual Generation
      if (response.visualPrompt) {
          handleGenerateRequest(response.visualPrompt);
      }

    } catch (error) {
      addMessage(contactId, {
          id: Date.now().toString(),
          sender: Sender.Agent,
          text: "ERROR: Signal lost. Connection timed out.",
          timestamp: Date.now(),
          isError: true,
      });
    } finally {
      setProcessingState(ProcessingState.Idle);
    }
  };

  const handleToggleVoice = async () => {
      if (isVoiceActive) {
          // Stop Voice
          if (liveSessionRef.current) {
              liveSessionRef.current.stop();
              liveSessionRef.current = null;
          }
          stopAudioPlayback(); // Ensure everything is quiet
          
          setIsVoiceActive(false);
          setIsTransmitting(false);
          addMessage(currentContact.id, {
              id: Date.now().toString(),
              sender: Sender.System,
              text: "[SYSTEM]: Voice uplink terminated.",
              timestamp: Date.now()
          });
          updateAvatar(currentContact, 'listening');
      } else {
          // Start Voice
          stopAudioPlayback(); // Stop any TTS before starting voice mode
          
          addMessage(currentContact.id, {
            id: Date.now().toString(),
            sender: Sender.System,
            text: `[SYSTEM]: Calling ${currentContact.name}...`,
            timestamp: Date.now()
          });
          
          liveSessionRef.current = new LiveSession(
              currentContact,
              (text, sender) => {
                  addMessage(currentContact.id, {
                      id: Date.now().toString(),
                      sender: sender === 'user' ? Sender.User : Sender.Agent,
                      text: text,
                      timestamp: Date.now()
                  });
                  if (sender === 'user') {
                      setCurrentSubject(text);
                  }
                  if (sender === 'agent') {
                      updateAvatar(currentContact, 'speaking');
                  }
              },
              (visualPrompt) => {
                  handleGenerateRequest(visualPrompt);
              },
              (error) => {
                  addMessage(currentContact.id, {
                      id: Date.now().toString(),
                      sender: Sender.System,
                      text: `[SYSTEM ERROR]: ${error}`,
                      timestamp: Date.now(),
                      isError: true
                  });
                  setIsVoiceActive(false);
                  setIsTransmitting(false);
                  liveSessionRef.current = null;
              }
          );
          
          await liveSessionRef.current.start();
          setIsVoiceActive(true);
          updateAvatar(currentContact, 'listening');
      }
  };

  const handlePushToTalk = (pressed: boolean) => {
      if (!isVoiceActive || !liveSessionRef.current) return;
      setIsTransmitting(pressed);
      liveSessionRef.current.setMuted(!pressed);
  };

  const handleGenerateRequest = async (overridePrompt?: string) => {
    const promptToUse = overridePrompt || currentSubject;
    if (!promptToUse) return;

    setProcessingState(ProcessingState.GeneratingImage);
    setCurrentSubject(promptToUse); 
    
    try {
      const imageData = await generateDinosaurImage(promptToUse);
      
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        prompt: promptToUse,
        dataUrl: imageData,
        timestamp: Date.now(),
      };
      
      setImageHistory(prev => [newImage, ...prev]);
      setSelectedImageIndex(0);
      
      addMessage(currentContact.id, {
        id: Date.now().toString(),
        sender: Sender.System,
        text: `[SYSTEM]: Visual data received for subject "${promptToUse}". Displaying on Visual Feed.`,
        timestamp: Date.now(),
      });

    } catch (error) {
      addMessage(currentContact.id, {
        id: Date.now().toString(),
        sender: Sender.System,
        text: `[SYSTEM ERROR]: Failed to generate visual for "${promptToUse}".`,
        timestamp: Date.now(),
        isError: true,
      });
    } finally {
      setProcessingState(ProcessingState.Idle);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-black text-slate-200 p-2 md:p-6 flex flex-col gap-2 md:gap-6 relative">
      
      {/* Mobile Contact Overlay */}
      {showMobileContacts && (
        <div className="absolute inset-0 z-50 bg-black/90 p-4 flex flex-col lg:hidden">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-display text-jurassic-amber text-2xl">SELECT CHANNEL</h2>
                <button onClick={() => setShowMobileContacts(false)} className="text-white">
                    <X size={24} />
                </button>
            </div>
            <ContactGrid 
                contacts={PARK_CONTACTS} 
                currentContactId={currentContact.id} 
                onSelectContact={handleSwitchContact} 
            />
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between border-b-4 border-jurassic-amber pb-2 shrink-0 h-[10%] md:h-auto min-h-[60px]">
        <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-jurassic-amber rounded-full flex items-center justify-center text-black shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                <Disc size={24} className="md:w-8 md:h-8" />
            </div>
            <div>
                <h1 className="font-display text-2xl md:text-4xl text-jurassic-amber tracking-wider glow-text leading-none">JURASSIC SYSTEMS</h1>
                <p className="font-tech text-[8px] md:text-xs tracking-[0.3em] text-jurassic-amber/70 uppercase">Artificial Intelligence Division</p>
            </div>
        </div>
        <div className="hidden md:block text-right">
             <div className="font-mono text-xs text-slate-500">SECURE TERMINAL #9283</div>
             <div className="font-mono text-xs text-green-500">CONN: ENCRYPTED</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row gap-2 lg:gap-4 min-h-0">
        
        {/* Left Column: Comms */}
        <section className="flex-[1.5] lg:flex-1 flex flex-col gap-2 lg:gap-4 lg:w-1/3 min-h-0">
           <div className="shrink-0 h-32 md:h-64">
             <RangerFeed 
                  avatar={avatars[currentContact.id] || null}
                  processingState={processingState}
                  isVoiceActive={isVoiceActive}
                  isTransmitting={isTransmitting}
                  contact={currentContact}
             />
           </div>
           
           <div className="flex-1 min-h-0">
                <ChatInterface 
                    messages={messages[currentContact.id] || []} 
                    onSendMessage={handleSendMessage} 
                    processingState={processingState} 
                    onToggleVoice={handleToggleVoice}
                    isVoiceActive={isVoiceActive}
                    isTTSEnabled={isTTSEnabled}
                    onToggleTTS={() => setIsTTSEnabled(!isTTSEnabled)}
                    onPushToTalk={handlePushToTalk}
                    isTransmitting={isTransmitting}
                    contact={currentContact}
                    onOpenContacts={() => setShowMobileContacts(true)}
                />
           </div>
        </section>

        {/* Middle Column: Visuals */}
        <section className="flex-1 lg:flex-auto h-full min-h-0">
          <VisualFeed 
            imageHistory={imageHistory}
            selectedIndex={selectedImageIndex}
            onSelectIndex={setSelectedImageIndex}
            processingState={processingState}
            onGenerateRequest={() => handleGenerateRequest(currentSubject)}
            lastTopic={currentSubject}
          />
        </section>

        {/* Right Column: Contacts (Phonebook) - Desktop */}
        <section className="hidden lg:block w-72 h-full">
           <ContactGrid 
               contacts={PARK_CONTACTS} 
               currentContactId={currentContact.id} 
               onSelectContact={handleSwitchContact} 
           />
        </section>

      </main>
    </div>
  );
}
