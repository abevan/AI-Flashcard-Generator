import React from 'react';
import { LearningContent } from '../types';
import { FlashcardDeck } from './FlashcardDeck';

interface RenderViewProps {
  data: LearningContent;
}

export const RenderView: React.FC<RenderViewProps> = ({ data }) => {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-2 animate-fadeIn relative z-10">
      {/* Badge */}
      <div className="flex justify-center pb-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider shadow-sm backdrop-blur-sm animate-pulse">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
             <span>{data.flashcards.length} Cards Generated</span>
        </div>
      </div>

      {/* Flashcards Section */}
      {data.flashcards && data.flashcards.length > 0 ? (
        <FlashcardDeck cards={data.flashcards} title={data.title} />
      ) : (
        <div className="text-center py-12 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed backdrop-blur-md">
            No flashcards generated.
        </div>
      )}
    </div>
  );
};