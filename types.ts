
export enum Sender {
  User = 'user',
  System = 'system',
  Agent = 'agent'
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: number;
  isError?: boolean;
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  dataUrl: string; // Base64
  timestamp: number;
}

export enum ProcessingState {
  Idle = 'idle',
  Thinking = 'thinking',
  GeneratingImage = 'generating_image',
  UpdatingAvatar = 'updating_avatar'
}

export type AvatarMood = 'listening' | 'speaking' | 'alert' | 'happy' | 'thinking' | 'angry' | 'surprised';

export interface CharacterAvatar {
  contactId: string;
  mood: AvatarMood;
  dataUrl: string;
  timestamp: number;
}

export interface Contact {
  id: string;
  name: string;
  role: string;
  description: string; // Visual description for image gen
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Aoede';
  systemInstruction: string;
  avatarQuery: string; // Short query for the avatar gen (e.g. "Alan Grant")
  themeColor: string;
}
