
import React from 'react';
import { Plus, Scissors, Square, GripVertical, Image as ImageIcon, Download } from 'lucide-react';
import { Point } from '../types';

interface ToolbarProps {
  position: Point;
  onMouseDown: (e: React.MouseEvent) => void;
  onAddBubble: () => void;
  onAddCut: () => void;
  onAddFrame: () => void;
  onAddImage: () => void;
  onDownload: () => void;
  previewMode: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({ 
  position, 
  onMouseDown, 
  onAddBubble, 
  onAddCut, 
  onAddFrame,
  onAddImage,
  onDownload,
  previewMode
}) => {
  return (
    <div 
      className={`absolute z-50 bg-slate-800/90 backdrop-blur p-2 rounded-full border border-slate-700 shadow-2xl flex items-center gap-2 transition-opacity duration-300 ${previewMode ? 'opacity-50 hover:opacity-100' : 'opacity-100'}`}
      style={{ left: position.x, top: position.y }}
    >
      <div 
        className="cursor-move text-slate-400 hover:text-white px-1 active:cursor-grabbing group relative"
        onMouseDown={onMouseDown}
        title="Drag to move, Click to toggle Preview"
      >
        <GripVertical size={20} />
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
          {previewMode ? 'Edit' : 'Preview'}
        </span>
      </div>
      
      {!previewMode && (
        <>
          <div className="h-6 w-px bg-slate-600 mx-1" />

          <button
            onClick={onAddBubble}
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors active:scale-95"
            title="Add Bubble"
          >
            <Plus size={20} />
          </button>
          
          <button
            onClick={onAddCut}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-colors active:scale-95 border border-slate-600"
            title="Add Slash Line"
          >
            <Scissors size={20} />
          </button>
          
          <button
            onClick={onAddFrame}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-colors active:scale-95 border border-slate-600"
            title="Add Frame Window"
          >
            <Square size={20} />
          </button>

          <button
            onClick={onAddImage}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full transition-colors active:scale-95 border border-slate-600"
            title="Add Image Container"
          >
            <ImageIcon size={20} />
          </button>
        </>
      )}

      <div className="h-6 w-px bg-slate-600 mx-1" />

      <button
        onClick={onDownload}
        className="p-2 bg-green-600 hover:bg-green-500 text-white rounded-full transition-colors active:scale-95"
        title="Download Image"
      >
        <Download size={20} />
      </button>
    </div>
  );
};
