

export interface Flashcard {
  front: string;
  back: string;
}

export interface LearningContent {
  title: string;
  summary: string;
  flashcards: Flashcard[];
}

export enum AppState {
  IDLE = 'IDLE',
  FETCHING_INFO = 'FETCHING_INFO',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type InputMode = 'youtube' | 'file';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface AdvancedSettings {
  cardCount: number;
  difficulty: DifficultyLevel;
  customInstructions: string;
}