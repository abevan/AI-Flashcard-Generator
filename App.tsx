

import React, { useState, useRef, useEffect } from 'react';
import { getVideoTitle } from './services/youtube';
import { generateFlashcards } from './services/gemini';
import { AppState, LearningContent, InputMode, AdvancedSettings, DifficultyLevel } from './types';
import { RenderView } from './components/RenderView';
import { LoadingState } from './components/LoadingState';
import { InteractiveBackground } from './components/InteractiveBackground';
import { MagneticButton } from './components/MagneticButton';

function App() {
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  
  // Advanced Settings State
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    cardCount: 15,
    difficulty: 'medium',
    customInstructions: ''
  });
  
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [content, setContent] = useState<LearningContent | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Fake progress for the button bar
  const [progress, setProgress] = useState(0);
  
  // UI Enhancements
  const [shakeButton, setShakeButton] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  
  // Typing Effect
  const fullTitle = "AI Flashcard Generator";
  const [displayedTitle, setDisplayedTitle] = useState("");
  
  // Mouse position for spotlight
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Typewriter Effect
  useEffect(() => {
    if (displayedTitle.length < fullTitle.length) {
      const timeout = setTimeout(() => {
        setDisplayedTitle(fullTitle.slice(0, displayedTitle.length + 1));
      }, 50); // Speed
      return () => clearTimeout(timeout);
    }
  }, [displayedTitle]);

  // Dynamic Title
  useEffect(() => {
    if (appState === AppState.GENERATING) document.title = "Generating... | AI Flashcards";
    else document.title = "AI Flashcard Generator";
  }, [appState]);

  useEffect(() => {
    // Extract Video ID
    if (inputMode === 'youtube') {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      setVideoId((match && match[2].length === 11) ? match[2] : null);
    } else {
      setVideoId(null);
    }
  }, [url, inputMode]);

  useEffect(() => {
    let interval: any;
    if (appState === AppState.FETCHING_INFO || appState === AppState.GENERATING) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) return 95;
          return prev + Math.random() * 5; 
        });
      }, 500);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [appState]);

  const processFile = (selectedFile: File) => {
    if (selectedFile) {
      setFile(selectedFile);
      setErrorMsg('');
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFileBase64(base64String.split(',')[1]);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };
  
  const handleClearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setFileBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleGenerate = async () => {
    if (!isInputReady) {
      setShakeButton(true);
      if (navigator.vibrate) navigator.vibrate(50);
      setTimeout(() => setShakeButton(false), 300);
      return;
    }

    setAppState(AppState.FETCHING_INFO);
    setErrorMsg('');
    setContent(null);

    try {
      if (inputMode === 'youtube') {
        if (!url.trim()) throw new Error("Please enter a valid YouTube URL");
        const title = await getVideoTitle(url);
        setAppState(AppState.GENERATING);
        const generatedContent = await generateFlashcards({ 
          type: 'youtube', 
          data: title,
          settings: advancedSettings 
        });
        setContent(generatedContent);
      } else {
        if (!file || !fileBase64) throw new Error("Please upload a file first");
        setAppState(AppState.GENERATING);
        const generatedContent = await generateFlashcards({ 
          type: 'file', 
          data: fileBase64, 
          mimeType: file.type,
          settings: advancedSettings
        });
        setContent(generatedContent);
        setFile(null);
        setFileBase64('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      setAppState(AppState.COMPLETED);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unknown error occurred.");
      setAppState(AppState.ERROR);
    }
  };

  const isInputReady = (inputMode === 'youtube' && url.trim().length > 0) || (inputMode === 'file' && file !== null);
  const isProcessing = appState === AppState.FETCHING_INFO || appState === AppState.GENERATING;

  // Calculate parallax tilt for Sidebar
  const sidebarTilt = {
    x: (mousePos.y - window.innerHeight / 2) / 500, // Very subtle
    y: (mousePos.x - window.innerWidth / 2) / 500,
  };

  return (
    <div 
      className="min-h-screen w-full bg-[#020617] text-white font-sans selection:bg-indigo-500/30 flex flex-col md:flex-row relative overflow-hidden"
      onMouseMove={handleMouseMove}
      ref={containerRef}
    >
      <InteractiveBackground isGenerating={isProcessing} />

      {/* Spotlight Effect */}
      <div 
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(99, 102, 241, 0.07), transparent 40%)`
        }}
      />
      
      {/* Sidebar / Control Panel */}
      <div 
        className="w-full md:w-[420px] md:h-screen md:sticky md:top-0 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-slate-900/40 backdrop-blur-xl z-20 transition-transform duration-100 ease-out"
        style={{
          transform: `perspective(1000px) rotateX(${-sidebarTilt.x}deg) rotateY(${sidebarTilt.y}deg)`
        }}
      >
        
        {/* Branding */}
        <div className="p-5 pb-2 relative overflow-hidden flex-shrink-0 mb-1">
          <div className="relative z-10 flex flex-col gap-2">
            <div className="flex flex-col items-start gap-2">
                <MagneticButton className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </MagneticButton>
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 leading-[1.1]">
                  {displayedTitle}
                  <span className="animate-blink ml-1 text-indigo-400">|</span>
                </h1>
            </div>
            <p className="text-indigo-200/80 text-lg font-serif italic leading-relaxed">
                Turn your documents or any YouTube video into printable flashcards for students.
            </p>
          </div>
        </div>

        {/* Input Controls */}
        <div className="p-5 pt-0 flex-1 flex flex-col gap-4 overflow-y-auto">
            
            {/* Sliding Toggle */}
            <div className="relative bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/60 flex-shrink-0 grid grid-cols-2 gap-1">
                <div 
                  className={`absolute top-1.5 bottom-1.5 w-[calc(50%-4px)] bg-slate-800 rounded-lg shadow-md transition-all duration-300 ease-out z-0 border border-slate-700`}
                  style={{ left: inputMode === 'file' ? '6px' : 'calc(50% - 2px)' }}
                />
                <button
                    onClick={() => setInputMode('file')}
                    className={`relative z-10 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${inputMode === 'file' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    File Upload
                </button>
                <button
                    onClick={() => setInputMode('youtube')}
                    className={`relative z-10 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 ${inputMode === 'youtube' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    YouTube Link
                </button>
            </div>

            {/* Forms */}
            <div className="space-y-4 flex-shrink-0 min-h-[120px]">
              {inputMode === 'youtube' ? (
                <div className="animate-fadeIn space-y-4">
                    <div className="relative group">
                        <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste YouTube URL here..."
                        className={`w-full bg-slate-950/50 border rounded-xl px-4 py-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 transition-all shadow-sm
                          ${videoId ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-emerald-500' : 'border-slate-700/60 focus:border-indigo-500 focus:ring-indigo-500'}
                        `}
                        />
                        <div className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${videoId ? 'text-emerald-500' : 'text-slate-600'}`}>
                             {videoId ? (
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                             ) : (
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                             )}
                        </div>
                    </div>
                    {/* YouTube Preview */}
                    {videoId && (
                      <div className="relative rounded-xl overflow-hidden aspect-video shadow-lg border border-slate-700/50 animate-fadeIn">
                        <img 
                          src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`} 
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }}
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                <div className="animate-fadeIn">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl h-48 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group relative overflow-hidden
                            ${isDragging 
                                ? 'border-indigo-400 bg-indigo-500/10 scale-[1.02]' 
                                : file 
                                    ? 'border-emerald-500/50 bg-emerald-500/5' 
                                    : 'border-slate-700 hover:border-indigo-400 hover:bg-slate-800/50'}
                        `}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            className="hidden" 
                            accept=".pdf,.txt,.md"
                        />
                        {file ? (
                            <div className="relative z-10 text-center px-4 w-full">
                                <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-1 text-emerald-400">
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <span className="block text-sm font-semibold text-emerald-300 truncate max-w-[200px] mx-auto">{file.name}</span>
                                <button 
                                  onClick={handleClearFile}
                                  className="absolute top-1 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors"
                                  title="Remove file"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        ) : (
                            <div className="relative z-10 text-center pointer-events-none">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 transition-all
                                    ${isDragging ? 'bg-indigo-500 text-white scale-110' : 'bg-slate-800 text-slate-400 group-hover:scale-110 group-hover:text-indigo-400'}`}>
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                 </div>
                                 <span className={`block text-sm font-medium transition-colors ${isDragging ? 'text-indigo-300' : 'text-slate-300 group-hover:text-white'}`}>
                                    {isDragging ? 'Drop to upload' : 'Drop your file here'}
                                 </span>
                            </div>
                        )}
                    </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 animate-shake">
                  <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span className="text-red-300 text-sm font-medium">{errorMsg}</span>
                </div>
              )}

              {/* Advanced Options Dropdown */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                <button 
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-400 hover:text-indigo-300 hover:bg-slate-900/50 transition-colors uppercase tracking-wider"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Advanced Options
                  </div>
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isAdvancedOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {isAdvancedOpen && (
                  <div className="p-4 pt-0 space-y-4 animate-fadeIn">
                    <div className="h-px bg-slate-800 mb-4"></div>
                    
                    {/* Card Count Slider */}
                    <div>
                      <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                        <span>Card Count</span>
                        <span className="text-indigo-400">{advancedSettings.cardCount} cards</span>
                      </div>
                      <input 
                        type="range" 
                        min="5" 
                        max="30" 
                        step="1" 
                        value={advancedSettings.cardCount}
                        onChange={(e) => setAdvancedSettings({...advancedSettings, cardCount: parseInt(e.target.value)})}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>

                    {/* Difficulty Select */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">Difficulty</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
                          <button
                            key={level}
                            onClick={() => setAdvancedSettings({...advancedSettings, difficulty: level})}
                            className={`px-2 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all
                              ${advancedSettings.difficulty === level 
                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' 
                                : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-slate-600'}`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Instructions Input */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">(Optional) Customize Flashcards</label>
                      <input 
                        type="text" 
                        value={advancedSettings.customInstructions}
                        onChange={(e) => setAdvancedSettings({...advancedSettings, customInstructions: e.target.value})}
                        placeholder="e.g. Single word terms, equations only, Spanish to English..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

              <MagneticButton strength={10}>
                <button
                    onClick={handleGenerate}
                    disabled={isProcessing}
                    className={`w-full py-4 rounded-xl font-black text-sm tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 mt-4 relative overflow-hidden group active:scale-[0.98] active:shadow-inner flex-shrink-0
                    ${!isInputReady ? 'cursor-pointer' : ''}
                    ${shakeButton ? 'animate-shake' : ''}
                    ${(!isInputReady)
                        ? 'bg-slate-800/50 text-slate-500 border border-slate-800'
                        : 'bg-gradient-to-r from-indigo-400 via-fuchsia-500 to-indigo-400 bg-[length:200%_auto] text-white animate-shimmer border border-white/10 shadow-[0_0_15px_rgba(167,139,250,0.3)] hover:shadow-[0_0_25px_rgba(167,139,250,0.4)] drop-shadow-md'
                    }`}
                >
                    {/* Progress Bar Background */}
                    {isProcessing && (
                    <div 
                        className="absolute left-0 top-0 bottom-0 bg-white/20 transition-all duration-300 ease-out z-0"
                        style={{ width: `${progress}%` }}
                    />
                    )}

                    {/* Button Content */}
                    <span className="relative z-10 flex items-center gap-2 font-black text-white">
                        {appState === AppState.FETCHING_INFO ? 'Connecting...' : 
                        appState === AppState.GENERATING ? 'Generating Flashcards...' : 
                        <>
                            Create Flashcards
                            <svg className={`w-5 h-5 transition-transform ${isInputReady ? 'group-hover:translate-x-1' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </>
                        }
                    </span>
                </button>
              </MagneticButton>
            </div>
            
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-80px)] md:h-screen relative z-10">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 scroll-smooth">
          
          {/* Initial State */}
          {appState === AppState.IDLE && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto animate-fadeIn select-none">
              <MagneticButton strength={30}>
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-3xl flex items-center justify-center mb-8 border border-white/5 shadow-lg backdrop-blur-sm transition-transform duration-500">
                    <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
              </MagneticButton>
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Instant Classroom Resources</h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                Upload your curriculum documents or paste an educational video link to instantly generate ready-to-print flashcards for your students.
              </p>
            </div>
          )}

          {/* Loading States */}
          {appState === AppState.FETCHING_INFO && <LoadingState message="Connecting to source..." />}
          {appState === AppState.GENERATING && <LoadingState message="Extracting key concepts and definitions..." />}

          {/* Completed State */}
          {appState === AppState.COMPLETED && content && (
            <RenderView data={content} />
          )}

          {appState === AppState.ERROR && (
             <div className="h-full flex flex-col items-center justify-center text-center animate-fadeIn">
                 <div className="p-4 bg-red-500/10 rounded-full mb-4">
                     <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <h3 className="text-xl font-bold text-white">Generation Failed</h3>
                 <p className="text-slate-400 mt-2">Please check your input and try again.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;