import React, { useState, useRef, useEffect } from 'react';
import { TimestampedWord } from '../types';
import { Search, Edit3, Trash2, PlusCircle, Play, Check, Clock } from 'lucide-react';

interface Props {
  transcript: TimestampedWord[];
  onTranscriptChange: (newTranscript: TimestampedWord[]) => void;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function SubtitleManager({ transcript, onTranscriptChange, currentTime, onSeek }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editWord, setEditWord] = useState('');
  const [editStart, setEditStart] = useState(0);
  const [editEnd, setEditEnd] = useState(0);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active word into view within the manager list
  const activeIndex = transcript.findIndex(
    (w) => currentTime >= w.start && currentTime <= w.end
  );

  useEffect(() => {
    if (activeIndex !== -1 && listContainerRef.current) {
      const activeElement = listContainerRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }
    }
  }, [activeIndex]);

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditWord(transcript[index].word);
    setEditStart(transcript[index].start);
    setEditEnd(transcript[index].end);
  };

  const handleSave = (index: number) => {
    const updated = [...transcript];
    updated[index] = {
      word: editWord.trim(),
      start: Number(editStart),
      end: Number(editEnd),
    };
    // Ensure chronological ordering after edit
    updated.sort((a, b) => a.start - b.start);
    onTranscriptChange(updated);
    setEditingIndex(null);
  };

  const handleDelete = (index: number) => {
    const updated = transcript.filter((_, i) => i !== index);
    onTranscriptChange(updated);
  };

  const handleAddWord = () => {
    // Adds a placeholder word at the current playhead time
    const newWord: TimestampedWord = {
      word: 'NewWord',
      start: Math.round(currentTime * 100) / 100,
      end: Math.round((currentTime + 0.8) * 100) / 100,
    };
    const updated = [...transcript, newWord].sort((a, b) => a.start - b.start);
    onTranscriptChange(updated);
    
    // Find the newly added index to set it in edit mode immediately
    const newIdx = updated.findIndex((w) => w.start === newWord.start && w.word === 'NewWord');
    if (newIdx !== -1) {
      handleEdit(newIdx);
    }
  };

  const filteredTranscript = transcript.map((item, originalIndex) => ({
    ...item,
    originalIndex,
  })).filter((item) => 
    item.word.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-zinc-900/80 backdrop-blur-xl border-l border-white/10 h-full flex flex-col items-stretch overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-zinc-900/90 z-10 backdrop-blur-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <Clock className="w-5 h-5 text-indigo-400" />
            Word-by-Word Editor
          </h2>
          <button
            onClick={handleAddWord}
            className="flex items-center gap-1.5 text-xs bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white px-2.5 py-1.5 rounded-lg border border-indigo-500/30 transition-all font-semibold"
          >
            <PlusCircle className="w-4 h-4" /> Add Word
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search words..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Word list */}
      <div 
        ref={listContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar max-h-full"
      >
        {filteredTranscript.length === 0 ? (
          <div className="text-center py-12 text-white/40 text-sm">
            {searchQuery ? 'No matching words found.' : 'No words generated yet. Generate subtitles above.'}
          </div>
        ) : (
          filteredTranscript.map(({ word, start, end, originalIndex }) => {
            const isActive = activeIndex === originalIndex;
            const isEditing = editingIndex === originalIndex;

            return (
              <div
                key={originalIndex}
                data-index={originalIndex}
                className={`group flex flex-col gap-2 p-3 rounded-xl border transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/10 border-indigo-500/40 shadow-md shadow-indigo-950/20'
                    : 'bg-black/20 hover:bg-black/40 border-white/5'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Spelling</label>
                      <input
                        type="text"
                        value={editWord}
                        onChange={(e) => setEditWord(e.target.value)}
                        className="w-full bg-zinc-800 border border-white/10 rounded px-2.5 py-1.5 text-sm text-white font-medium outline-none focus:border-indigo-500"
                        placeholder="Word"
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">Start (sec)</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={editStart}
                          onChange={(e) => setEditStart(Number(e.target.value))}
                          className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-white/40 block mb-1">End (sec)</label>
                        <input
                          type="number"
                          step="0.05"
                          min="0"
                          value={editEnd}
                          onChange={(e) => setEditEnd(Number(e.target.value))}
                          className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-xs text-white font-mono outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end pt-1">
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="text-xs text-white/60 hover:text-white px-2.5 py-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSave(originalIndex)}
                        className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded font-medium transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-white break-words">
                        {word}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-white/40 font-mono">
                        <span>{start.toFixed(2)}s</span>
                        <span>→</span>
                        <span>{end.toFixed(2)}s</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => onSeek(start)}
                        className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Seek player here"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEdit(originalIndex)}
                        className="p-1.5 text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                        title="Edit word & dates"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(originalIndex)}
                        className="p-1.5 text-white/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete word"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
