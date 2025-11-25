
import React, { useState, useEffect, useRef } from 'react';
import { Flashcard } from '../types';
import { jsPDF } from "jspdf";
import confetti from 'canvas-confetti';

interface FlashcardDeckProps {
  cards: Flashcard[];
  title?: string;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ cards: initialCards, title }) => {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Touch handling
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    // Trigger Confetti on Mount
    const end = Date.now() + 1000;
    const colors = ['#818cf8', '#c084fc', '#e879f9'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped, isFullscreen]);

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleNext = () => {
    triggerHaptic();
    setIsFlipped(false);
    setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % cards.length);
    }, 150);
  };

  const handlePrev = () => {
    triggerHaptic();
    setIsFlipped(false);
    setTimeout(() => {
        setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }, 150);
  };
  
  const handleShuffle = () => {
    triggerHaptic();
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleReset = () => {
    triggerHaptic();
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleFlip = () => {
    if (navigator.vibrate) navigator.vibrate(5);
    setIsFlipped(!isFlipped);
  };

  // 3D Tilt Logic
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isFullscreen) return; // Disable tilt in fullscreen for cleanliness
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (max 10 degrees)
    const rotateX = ((y - centerY) / centerY) * -5; 
    const rotateY = ((x - centerX) / centerX) * 5;
    
    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Swipe Gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) { // Threshold
      if (diff > 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };
  
  const getFontSizeClass = (text: string) => {
    if (text.length > 200) return isFullscreen ? 'text-2xl' : 'text-sm md:text-base';
    if (text.length > 100) return isFullscreen ? 'text-3xl' : 'text-base md:text-lg';
    return isFullscreen ? 'text-4xl' : 'text-lg md:text-xl';
  };

  const downloadPDF = () => {
    setIsGeneratingPdf(true);
    try {
        const doc = new jsPDF();
        // 2 cols x 4 rows = 8 cards per page
        const cardsPerPage = 8; 
        const rows = 4;
        const cols = 2;
        
        const pageWidth = 210; 
        const pageHeight = 297; 
        const margin = 12; 
        
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);
        
        const cardWidth = availableWidth / cols;
        const cardHeight = availableHeight / rows;

        for (let i = 0; i < cards.length; i += cardsPerPage) {
            const chunk = cards.slice(i, i + cardsPerPage);
            
            // --- Front Page ---
            if (i > 0) doc.addPage();
            
            // Header Info (Date/Name) on first page only
            if (i === 0) {
              doc.setFontSize(8);
              doc.setTextColor(150);
              const dateStr = new Date().toLocaleDateString();
              doc.text(`Created: ${dateStr}`, margin, margin - 4);
              doc.text(`Name: __________________________`, pageWidth - margin - 50, margin - 4);
            }

            doc.setDrawColor(200);
            doc.setLineWidth(0.1);
            
            chunk.forEach((card, idx) => {
                const row = Math.floor(idx / cols);
                const col = idx % cols;
                const x = margin + (col * cardWidth);
                const y = margin + (row * cardHeight);
                
                doc.rect(x, y, cardWidth, cardHeight);
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text("TERM", x + cardWidth/2, y + 8, { align: "center" });
                
                doc.setFontSize(12);
                doc.setTextColor(0);
                const splitTitle = doc.splitTextToSize(card.front, cardWidth - 10);
                const textBlockHeight = splitTitle.length * 5; 
                const startY = y + (cardHeight / 2) - (textBlockHeight / 2) + 2;
                doc.text(splitTitle, x + cardWidth/2, startY, { align: "center" });
            });
            
            // --- Back Page ---
            doc.addPage();
            chunk.forEach((card, idx) => {
                const row = Math.floor(idx / cols);
                const frontCol = idx % cols;
                const backCol = (cols - 1) - frontCol; // Mirror column for double-sided
                
                const x = margin + (backCol * cardWidth);
                const y = margin + (row * cardHeight);
                
                doc.rect(x, y, cardWidth, cardHeight);
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text("DEFINITION", x + cardWidth/2, y + 8, { align: "center" });
                
                doc.setFontSize(10);
                doc.setTextColor(0);
                const splitDef = doc.splitTextToSize(card.back, cardWidth - 10);
                const textBlockHeight = splitDef.length * 4; 
                const startY = y + (cardHeight / 2) - (textBlockHeight / 2) + 2;
                doc.text(splitDef, x + cardWidth/2, startY, { align: "center" });
            });
        }
        
        const cleanTitle = title ? title.replace(/[^a-z0-9]/gi, '_').substring(0, 30) : 'flashcards';
        doc.save(`${cleanTitle}.pdf`);
    } catch (e) {
        console.error("PDF Generation failed", e);
        alert("Could not generate PDF.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="flex flex-col gap-4 w-full">
      
      {/* Fullscreen Overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fadeIn">
            <button 
                onClick={() => setIsFullscreen(false)}
                className="absolute top-6 right-6 p-3 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition-colors"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="w-full max-w-4xl h-[70vh] relative perspective-1000">
                <div 
                    className="w-full h-full cursor-pointer transition-transform duration-500 transform-style-3d relative"
                    style={{ 
                        transformStyle: 'preserve-3d',
                        transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
                    }}
                    onClick={handleFlip}
                >
                     {/* Front Side Fullscreen */}
                    <div 
                        className="absolute inset-0 w-full h-full bg-[#f8fafc] rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-2xl backface-hidden"
                        style={{ backfaceVisibility: 'hidden' }}
                    >
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-10">Term</span>
                        <h3 className="text-5xl md:text-6xl font-serif font-medium text-slate-900 leading-tight">
                            {currentCard.front}
                        </h3>
                         <div className="absolute bottom-10 text-sm font-medium text-slate-400">
                             Click to flip
                         </div>
                    </div>

                    {/* Back Side Fullscreen */}
                    <div 
                        className="absolute inset-0 w-full h-full bg-slate-900 rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-2xl backface-hidden border border-slate-700"
                        style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)'
                        }}
                    >
                        <span className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-10">Definition</span>
                        <p className={`${getFontSizeClass(currentCard.back)} font-serif text-slate-200 leading-relaxed max-w-3xl`}>
                            {currentCard.back}
                        </p>
                    </div>
                </div>
            </div>

            {/* Floating Navigation in Fullscreen */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-8">
                <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="p-4 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition-all active:scale-95">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="text-slate-400 font-mono text-xl">{currentIndex + 1} / {cards.length}</span>
                <button onClick={(e) => { e.stopPropagation(); handleNext(); }} className="p-4 bg-slate-800 rounded-full hover:bg-slate-700 text-white transition-all active:scale-95">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
      )}

      {/* Primary Action */}
      <div className="flex justify-center w-full">
         <button 
            onClick={downloadPDF}
            disabled={isGeneratingPdf}
            className="group relative inline-flex items-center gap-3 px-8 py-3.5 bg-slate-50 hover:bg-white text-slate-900 rounded-full font-bold text-base transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed border border-slate-200 overflow-hidden"
        >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-200%] animate-shimmer" />
            
            {isGeneratingPdf ? (
                <span className="animate-spin w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full"></span>
            ) : (
                <svg className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            )}
            <span className="relative z-10">Download Flashcards</span>
        </button>
      </div>

      {/* Deck Container */}
      <div className="relative max-w-lg mx-auto w-full select-none"
           onMouseMove={handleMouseMove}
           onMouseLeave={handleMouseLeave}
           onTouchStart={handleTouchStart}
           onTouchEnd={handleTouchEnd}
      >
        
        {/* Expand Button */}
        <button 
            onClick={() => setIsFullscreen(true)}
            className="absolute -top-3 -right-3 z-30 w-10 h-10 bg-slate-800 text-slate-400 hover:text-white hover:bg-indigo-500 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 border border-slate-700 group"
            title="Fullscreen Practice Mode"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
        </button>

        {/* Active Card */}
        <div 
          className="relative w-full aspect-[5/3] perspective-1000 z-10" 
          style={{ perspective: '1200px' }}
        >
            <div 
            ref={cardRef}
            className="relative w-full h-full cursor-pointer transition-transform duration-500 transform-style-3d"
            style={{ 
                transformStyle: 'preserve-3d',
                transform: `rotateY(${isFlipped ? 180 : 0}deg) rotateX(${tilt.x}deg) rotateZ(${tilt.y * 0.1}deg)`,
                transitionTimingFunction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Springy bounce
            }}
            onClick={handleFlip}
            >
            {/* Front Side */}
            <div 
                className="absolute inset-0 w-full h-full bg-[#f8fafc] rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-md backface-hidden border-2 border-slate-200"
                style={{ backfaceVisibility: 'hidden' }}
            >
                <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-xl"></div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Term</span>
                <h3 className="text-2xl md:text-3xl font-serif font-medium text-slate-900 leading-tight">
                    {currentCard.front}
                </h3>
                <div className="absolute bottom-4 text-xs font-medium text-slate-400 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity delay-100">
                    <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-500">SPACE</span> to flip
                </div>
            </div>

            {/* Back Side */}
            <div 
                className="absolute inset-0 w-full h-full bg-slate-900 rounded-xl p-8 flex flex-col items-center justify-center text-center shadow-md backface-hidden border border-slate-700"
                style={{ 
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)'
                }}
            >
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-6">Definition</span>
                <p className={`${getFontSizeClass(currentCard.back)} font-serif text-slate-200 leading-relaxed`}>
                    {currentCard.back}
                </p>
            </div>
            </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 mt-4 relative z-50">
        
        {/* Main Controls Pill */}
        <div className="flex items-center gap-6 bg-slate-900/40 backdrop-blur-md border border-slate-700/60 p-2 rounded-full">
            <button 
            onClick={handlePrev}
            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 group relative"
            title="Previous (Left Arrow)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            
            {/* Counter between arrows */}
            <div className="px-2 text-sm font-mono font-medium text-slate-300 min-w-[60px] text-center tracking-wide select-none">
                {currentIndex + 1} / {cards.length}
            </div>

            <button 
            onClick={handleNext}
            className="w-10 h-10 flex items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-95 group relative"
            title="Next (Right Arrow)"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>

        {/* Secondary Controls (Shuffle / Reset) */}
        <div className="flex gap-4">
           <button onClick={handleShuffle} className="text-xs font-medium text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5 py-1 px-2 rounded hover:bg-white/5">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             Shuffle
           </button>
           <button onClick={handleReset} className="text-xs font-medium text-slate-500 hover:text-indigo-400 transition-colors flex items-center gap-1.5 py-1 px-2 rounded hover:bg-white/5">
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
             Reset
           </button>
        </div>

        {/* Progress Dots */}
        <div className="flex gap-1.5 mt-2 flex-wrap justify-center max-w-md">
            {cards.map((_, idx) => (
                <div 
                    key={idx}
                    onClick={() => { setIsFlipped(false); setTimeout(() => setCurrentIndex(idx), 150); }}
                    className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-700 hover:bg-slate-600 hover:scale-125'}`}
                />
            ))}
        </div>
      </div>
    </div>
  );
};
