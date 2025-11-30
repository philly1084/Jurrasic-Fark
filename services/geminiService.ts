
import { GoogleGenAI, Chat, GenerateContentResponse, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { AvatarMood, Contact } from "../types";

const apiKey = process.env.API_KEY || '';

// Initialize the client
const ai = new GoogleGenAI({ apiKey });

// Model Configuration
const CHAT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image'; 
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// Tool Definition
const visualTool: FunctionDeclaration = {
  name: "update_visual_feed",
  description: "Generates and displays an image of a dinosaur or prehistoric scene on the main dashboard.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "Detailed visual description of the dinosaur, environment, and action. E.g. 'A T-Rex roaring in the rain next to a jeep'."
      }
    },
    required: ["description"]
  }
};

// Map to store active chat sessions per contact ID
const chatSessions = new Map<string, Chat>();
let audioContext: AudioContext | null = null;
let currentTTSSource: AudioBufferSourceNode | null = null;

// --- Shared Audio Helpers ---

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  return audioContext;
};

const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const encodeBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> => {
  let processData = data;
  if (processData.byteLength % 2 !== 0) {
      const newData = new Uint8Array(processData.byteLength + 1);
      newData.set(processData);
      processData = newData;
  }

  const dataInt16 = new Int16Array(processData.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

// --- Services ---

export const getChatSession = (contact: Contact): Chat => {
  if (!chatSessions.has(contact.id)) {
    const chat = ai.chats.create({
      model: CHAT_MODEL,
      config: {
        systemInstruction: contact.systemInstruction,
        tools: [{ functionDeclarations: [visualTool] }],
      },
    });
    chatSessions.set(contact.id, chat);
  }
  return chatSessions.get(contact.id)!;
};

export const sendMessageToAgent = async (contact: Contact, message: string): Promise<{ text: string; visualPrompt?: string }> => {
  try {
    const chat = getChatSession(contact);
    const result: GenerateContentResponse = await chat.sendMessage({ message });
    
    let visualPrompt: string | undefined;
    const functionCalls = result.functionCalls;
    
    if (functionCalls && functionCalls.length > 0) {
        const visualCall = functionCalls.find(fc => fc.name === 'update_visual_feed');
        if (visualCall) {
            visualPrompt = visualCall.args['description'] as string;
        }
    }

    return {
        text: result.text || "Connection signal weak. Please repeat.",
        visualPrompt
    };
  } catch (error) {
    console.error("Agent Error:", error);
    throw error;
  }
};

export const stopAudioPlayback = () => {
  if (currentTTSSource) {
    try {
      currentTTSSource.stop();
    } catch (e) {
      console.warn("Could not stop audio source", e);
    }
    currentTTSSource = null;
  }
};

export const playTextAsSpeech = async (text: string, voiceName: string = 'Kore'): Promise<void> => {
  try {
    stopAudioPlayback(); // Stop any currently playing audio

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }

    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const audioBuffer = await decodeAudioData(
      decodeBase64(base64Audio),
      ctx,
      24000,
      1
    );

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = 1.0; 
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    currentTTSSource = source;
    
    source.addEventListener('ended', () => {
        if (currentTTSSource === source) {
            currentTTSSource = null;
        }
    });

    source.start();

  } catch (error) {
    console.error("TTS Error:", error);
  }
};

export const generateDinosaurImage = async (prompt: string): Promise<string> => {
  try {
    const enhancedPrompt = `A photorealistic, high-quality image of ${prompt} in a prehistoric jungle environment. Cinematic lighting, detailed textures.`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [{ text: enhancedPrompt }],
      },
      config: {
        imageConfig: {
            aspectRatio: "4:3",
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
         if (part.inlineData && part.inlineData.data) {
             return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
         }
      }
    }
    
    throw new Error("No image data received from the satellite feed.");

  } catch (error) {
    console.error("Visualizer Error:", error);
    throw error;
  }
};

export const generateAvatar = async (contact: Contact, mood: AvatarMood): Promise<string> => {
  try {
    let expression = "neutral, listening";
    if (mood === 'speaking') expression = "speaking, mouth slightly open, engaging expression";
    if (mood === 'happy') expression = "smiling, laughing, enthusiastic";
    if (mood === 'alert') expression = "concerned, serious, intense gaze, warning";
    if (mood === 'thinking') expression = "pensive, looking down, thoughtful";
    if (mood === 'angry') expression = "angry, frustrated, shouting";
    if (mood === 'surprised') expression = "shocked, eyes wide, surprised";

    // Use the contact's generic description instead of name-based description
    const prompt = `${contact.description}. ${expression}. Cinematic lighting, shallow depth of field, 4k resolution.`;

    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
         if (part.inlineData && part.inlineData.data) {
             return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
         }
      }
    }

    // If we get here, the model likely returned text (refusal) instead of an image
    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart) {
        console.warn("Avatar gen returned text:", textPart.text);
    }

    throw new Error("Failed to generate avatar - No image data returned.");
  } catch (error) {
    console.error("Avatar Gen Error:", error);
    throw error;
  }
};

// --- Live API Implementation ---

export class LiveSession {
  private nextStartTime = 0;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  private active = false;
  private isMuted = true; // Default to muted for PTT

  private currentInputTranscription = '';
  private currentOutputTranscription = '';

  constructor(
    private contact: Contact,
    private onTranscript: (text: string, sender: 'user' | 'agent', isFinal: boolean) => void,
    private onVisualPrompt: (prompt: string) => void,
    private onError: (error: string) => void
  ) {}

  async start() {
    if (this.active) return;

    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      if (this.inputAudioContext.state === 'suspended') await this.inputAudioContext.resume();
      if (this.outputAudioContext.state === 'suspended') await this.outputAudioContext.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.active = true;
      this.isMuted = true; 
      
      this.sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: this.contact.voiceName } },
          },
          systemInstruction: this.contact.systemInstruction,
          inputAudioTranscription: {}, 
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: [visualTool] }],
        },
        callbacks: {
          onopen: () => {
            console.log(`Voice Comms Link Established: ${this.contact.name}`);
            this.setupAudioInput(stream);
          },
          onmessage: async (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onclose: () => {
             console.log('Voice Comms Link Closed');
             this.stop();
          },
          onerror: (err) => {
             console.error("Live API Error", err);
             // Often 503 if overloaded or 400 if model doesn't support options
             this.onError("Link disrupted (Service Unavailable).");
             this.stop();
          }
        }
      });

    } catch (error) {
      console.error("Failed to start live session:", error);
      this.onError("Could not initialize voice uplink.");
      this.stop();
    }
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    
    // Attempt to close session if promise resolved
    this.sessionPromise?.then(session => {
        try { session.close(); } catch(e) { /* ignore */ }
    }).catch(() => {});

    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    this.sources.forEach(source => source.stop());
    this.sources.clear();
    this.nextStartTime = 0;
  }

  setMuted(muted: boolean) {
      this.isMuted = muted;
  }

  private setupAudioInput(stream: MediaStream) {
    if (!this.inputAudioContext) return;

    const source = this.inputAudioContext.createMediaStreamSource(stream);
    const scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    scriptProcessor.onaudioprocess = (e) => {
      if (!this.active || this.isMuted) return;
      
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createBlob(inputData);
      
      this.sessionPromise?.then((session) => {
          session.sendRealtimeInput({ media: pcmBlob });
      }).catch(e => {
          // Swallow errors here to prevent flooding logs if session failed
      });
    };

    source.connect(scriptProcessor);
    scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    if (!this.active) return;

    if (message.toolCall) {
        const functionCalls = message.toolCall.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
             const visualCall = functionCalls.find(fc => fc.name === 'update_visual_feed');
             if (visualCall) {
                 const prompt = visualCall.args['description'] as string;
                 if (prompt) {
                     this.onVisualPrompt(prompt);
                 }
                 this.sessionPromise?.then((session) => {
                     session.sendToolResponse({
                         functionResponses: functionCalls.map(fc => ({
                             id: fc.id,
                             name: fc.name,
                             response: { result: "Visual feed updated successfully." }
                         }))
                     });
                 });
             }
        }
    }

    if (message.serverContent?.inputTranscription) {
        const text = message.serverContent.inputTranscription.text;
        if (text) this.currentInputTranscription += text;
    }
    
    if (message.serverContent?.outputTranscription) {
         const text = message.serverContent.outputTranscription.text;
         if (text) this.currentOutputTranscription += text;
    }

    if (message.serverContent?.turnComplete) {
         if (this.currentInputTranscription.trim()) {
             this.onTranscript(this.currentInputTranscription, 'user', true);
             this.currentInputTranscription = '';
         }
         if (this.currentOutputTranscription.trim()) {
             this.onTranscript(this.currentOutputTranscription, 'agent', true);
             this.currentOutputTranscription = '';
         }
    }

    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext) {
        if (this.outputAudioContext.state === 'suspended') {
            await this.outputAudioContext.resume();
        }

        this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
        
        try {
            const audioBuffer = await decodeAudioData(
                decodeBase64(base64Audio),
                this.outputAudioContext,
                24000,
                1
            );
            
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            const gainNode = this.outputAudioContext.createGain();
            gainNode.gain.value = 1.2; // Boost volume slightly for voice

            source.connect(gainNode);
            gainNode.connect(this.outputAudioContext.destination);

            source.addEventListener('ended', () => {
                this.sources.delete(source);
            });

            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
        } catch (e) {
            console.error("Audio decode error", e);
        }
    }

    const interrupted = message.serverContent?.interrupted;
    if (interrupted) {
        this.sources.forEach(source => source.stop());
        this.sources.clear();
        this.nextStartTime = 0;
        this.currentOutputTranscription = '';
    }
  }

  private createBlob(data: Float32Array): any {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encodeBase64(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }
}
