
import React, { useMemo } from 'react';
import { BubbleData, FrameData, ImageData, CutData } from '../types';
import { generateBubblePath, segmentIntersectsRect, generateHalfPlaneMask } from '../utils/geometry';
import { Trash2, Move, Palette, Plus, Minus, Upload, Lock, Unlock } from 'lucide-react';

interface BubbleRendererProps {
  data: BubbleData;
  isSelected: boolean;
  onMouseDownBody: (e: React.MouseEvent) => void;
  onMouseDownAnchor: (e: React.MouseEvent) => void;
  onDelete: () => void;
}

export const BubbleRenderer: React.FC<BubbleRendererProps> = ({
  data,
}) => {
  useMemo(() => {
    return generateBubblePath(data.x, data.y, data.width, data.height, data.anchor, data.borderRadius);
  }, [data.x, data.y, data.width, data.height, data.anchor, data.borderRadius]);

  return (
    <></>
  );
};

interface BubbleOverlayProps {
  data: BubbleData;
  onMouseDown: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  isEditing: boolean;
  onEditStart: () => void;
  onEditEnd: () => void;
  onTextChange: (text: string) => void;
  previewMode: boolean;
}

export const BubbleOverlay: React.FC<BubbleOverlayProps> = ({
  data,
  onMouseDown,
  onDelete,
  isEditing,
  onEditStart,
  onEditEnd,
  onTextChange,
  previewMode,
}) => {
  return (
    <div
      className="absolute flex flex-col group"
      style={{
        left: data.x,
        top: data.y,
        width: data.width,
        height: data.height,
        pointerEvents: previewMode ? 'none' : 'initial', 
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={(e) => { 
        if (previewMode) return;
        e.stopPropagation(); 
        onEditStart(); 
      }}
    >
      {/* Text Container */}
      <div className="flex-1 p-4 flex items-center justify-center text-center overflow-hidden relative z-10">
        {isEditing ? (
          <textarea
            autoFocus
            className="w-full h-full bg-transparent text-slate-900 font-medium leading-snug resize-none outline-none overflow-y-auto pointer-events-auto"
            value={data.text}
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={onEditEnd}
            onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking textarea
          />
        ) : (
          <p className="text-slate-900 font-medium leading-snug select-none pointer-events-none">
            {data.text}
          </p>
        )}
      </div>

      {/* Hover Controls - Only show if not editing AND not in preview mode */}
      {!isEditing && !previewMode && (
        <div className="absolute -top-10 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow flex items-center gap-1 pointer-events-auto cursor-grab active:cursor-grabbing" onMouseDown={onMouseDown}>
            <Move size={12} /> Move
          </div>
          <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow flex items-center gap-1 pointer-events-none">
            Dbl Click to Edit
          </div>
          <button 
            className="bg-red-600 text-white text-xs px-2 py-1 rounded shadow flex items-center gap-1 pointer-events-auto hover:bg-red-700"
            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

interface FrameControlsProps {
  data: FrameData;
  onMouseDownMove: (e: React.MouseEvent) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
}

export const FrameControls: React.FC<FrameControlsProps> = ({
  data,
  onMouseDownMove,
  onColorChange,
  onDelete
}) => {
  // Calculate bounds for positioning controls
  const minX = Math.min(data.p1.x, data.p2.x, data.p3.x, data.p4.x);
  const minY = Math.min(data.p1.y, data.p2.y, data.p3.y, data.p4.y);

  return (
    <div
      className="absolute pointer-events-none group"
      style={{
        left: minX,
        top: minY,
        width: 0,
        height: 0,
      }}
    >
      {/* Controls Container */}
      <div className="absolute -top-12 left-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
        <div 
          className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow flex items-center gap-1 cursor-move"
          onMouseDown={onMouseDownMove}
        >
          <Move size={12} /> Move Frame
        </div>
        
        <div className="relative overflow-hidden bg-slate-800 text-white rounded shadow flex items-center w-8 h-6 justify-center cursor-pointer hover:bg-slate-700">
           <Palette size={12} className="absolute pointer-events-none" />
           <input 
            type="color" 
            value={data.color}
            onChange={(e) => onColorChange(e.target.value)}
            className="opacity-0 w-full h-full cursor-pointer"
            title="Change Wall Color"
           />
        </div>

        <button 
            className="bg-red-600 text-white text-xs px-2 py-1 rounded shadow flex items-center gap-1 hover:bg-red-700"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 size={12} />
          </button>
      </div>
    </div>
  );
};

interface CutPointControlsProps {
  x: number;
  y: number;
  thickness: number;
  onChange: (newThickness: number) => void;
}

export const CutPointControls: React.FC<CutPointControlsProps> = ({ x, y, thickness, onChange }) => {
  return (
    <div 
      className="absolute pointer-events-auto transform -translate-x-1/2"
      style={{ left: x, top: y + 15 }} 
    >
      <div className="flex items-center bg-slate-800/90 text-white rounded-full shadow-lg border border-slate-600 overflow-hidden scale-75 hover:scale-100 transition-transform origin-top">
        <button 
          className="p-1 hover:bg-slate-700 active:bg-slate-600"
          onClick={(e) => { e.stopPropagation(); onChange(Math.max(1, thickness - 1)); }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Minus size={12} />
        </button>
        <span className="text-[10px] font-bold w-4 text-center select-none">
          {Math.round(thickness)}
        </span>
        <button 
          className="p-1 hover:bg-slate-700 active:bg-slate-600"
          onClick={(e) => { e.stopPropagation(); onChange(thickness + 1); }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  );
};

interface HandleProps {
  x: number;
  y: number;
  onMouseDown: (e: React.MouseEvent) => void;
}

export const AnchorHandle: React.FC<HandleProps> = ({
  x,
  y,
  onMouseDown
}) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-auto" style={{ cursor: 'crosshair' }} onMouseDown={onMouseDown}>
      <circle r="6" fill="#3b82f6" stroke="white" strokeWidth="2" className="shadow-sm hover:scale-125 transition-transform" />
      <circle r="20" fill="transparent" /> {/* Larger Hit area */}
    </g>
  );
};

export const RadiusHandle: React.FC<HandleProps> = ({
  x,
  y,
  onMouseDown
}) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-auto" style={{ cursor: 'ew-resize' }} onMouseDown={onMouseDown}>
      <rect x="-6" y="-6" width="12" height="12" rx="3" fill="#10b981" stroke="white" strokeWidth="2" className="hover:scale-125 transition-transform" />
      <circle r="20" fill="transparent" /> {/* Hit area */}
    </g>
  );
};

export const ResizeHandle: React.FC<HandleProps> = ({
  x,
  y,
  onMouseDown
}) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-auto" style={{ cursor: 'nwse-resize' }} onMouseDown={onMouseDown}>
      <rect x="-6" y="-6" width="12" height="12" fill="#a855f7" stroke="white" strokeWidth="2" className="hover:scale-125 transition-transform" />
      <circle r="20" fill="transparent" /> {/* Hit area */}
    </g>
  );
};

export const CutHandle: React.FC<HandleProps> = ({
  x,
  y,
  onMouseDown
}) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-auto" style={{ cursor: 'move' }} onMouseDown={onMouseDown}>
      <circle r="5" fill="#ef4444" stroke="white" strokeWidth="2" className="hover:scale-125 transition-transform" />
      <circle r="20" fill="transparent" /> {/* Larger Hit area */}
    </g>
  );
};

export const CornerHandle: React.FC<HandleProps> = ({
  x,
  y,
  onMouseDown
}) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-auto cursor-move" onMouseDown={onMouseDown}>
      <rect x="-5" y="-5" width="10" height="10" fill="#a855f7" stroke="white" strokeWidth="2" className="hover:scale-125 transition-transform" />
      <circle r="15" fill="transparent" />
    </g>
  );
};

// Image Components

interface ImagePlaceholderProps {
  data: ImageData;
  cuts: CutData[];
  onMouseDown: (e: React.MouseEvent) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  onDelete: () => void;
  onToggleLock: () => void;
  previewMode: boolean;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  data,
  cuts,
  onMouseDown,
  onDrop,
  onDelete,
  onToggleLock,
  previewMode
}) => {
  const maskId = `mask-${data.id}`;
  const clipId = `clip-${data.id}`; 
  
  // Filter cuts based on lock state
  const intersectingCuts = cuts.filter(cut => {
    const physicallyIntersects = segmentIntersectsRect(cut.p1, cut.p2, { x: data.x, y: data.y, width: data.width, height: data.height });
    if (data.isLocked) {
      return data.lockedCutIds.includes(cut.id) && physicallyIntersects;
    }
    return physicallyIntersects;
  });

  const cx = data.x + data.width / 2;
  const cy = data.y + data.height / 2;

  return (
    <g 
      onMouseDown={(e) => !previewMode && onMouseDown(e)} 
      className={`group ${previewMode ? '' : 'pointer-events-auto'}`}
    >
      <defs>
        <mask id={maskId}>
          <rect x={data.x} y={data.y} width={data.width} height={data.height} fill="white" />
          {intersectingCuts.map(cut => (
            <path 
              key={cut.id}
              d={generateHalfPlaneMask(cut.p1, cut.p2, {x: cx, y: cy})}
              fill="black"
            />
          ))}
        </mask>

        <clipPath id={clipId}>
           <rect x={data.x} y={data.y} width={data.width} height={data.height} />
        </clipPath>
      </defs>

      {/* Container Background / Border - Only show in edit mode */}
      {!previewMode && (
        <rect 
          x={data.x} 
          y={data.y} 
          width={data.width} 
          height={data.height} 
          fill="transparent"
          stroke={data.isLocked ? "rgba(249, 115, 22, 0.5)" : "rgba(255,255,255,0.3)"}
          strokeDasharray="4 4"
          strokeWidth={data.isLocked ? 2 : 1}
        />
      )}

      {/* Image Content */}
      {data.src ? (
        <image 
          href={data.src} 
          x={data.x + (data.width - data.width * data.scale) / 2}
          y={data.y + (data.height - data.height * data.scale) / 2}
          width={data.width * data.scale} 
          height={data.height * data.scale} 
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`} 
          mask={`url(#${maskId})`}     
        />
      ) : (
        !previewMode && (
            <foreignObject x={data.x} y={data.y} width={data.width} height={data.height} style={{ pointerEvents: 'none' }}>
            <div className="w-full h-full flex items-center justify-center text-white/50 flex-col gap-1 p-2">
                <Upload size={24} />
                <span className="text-[10px] text-center">Drop Image</span>
            </div>
            </foreignObject>
        )
      )}

      {/* Drop Zone Overlay - Only active in edit mode */}
      {!previewMode && (
        <rect 
            x={data.x} 
            y={data.y} 
            width={data.width} 
            height={data.height} 
            fill="transparent"
            className="cursor-move"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); onDrop(e, data.id); }}
        />
      )}
      
      {/* Controls Layer (HTML Overlay for buttons) - Only show in edit mode */}
      {!previewMode && (
        <foreignObject 
            x={data.x} 
            y={data.y - 40} 
            width={data.width} 
            height={data.height + 40} 
            className="overflow-visible pointer-events-none"
        >
            <div className="relative w-full h-full">
                <button 
                    className="absolute -top-0 left-0 bg-red-600 text-white p-1 rounded shadow hover:bg-red-700 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    title="Delete Container"
                >
                    <Trash2 size={14} />
                </button>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <button
                        className={`
                            p-2 rounded-full shadow-lg transition-all pointer-events-auto transform 
                            ${data.isLocked 
                                ? 'bg-orange-600 text-white opacity-100 scale-100' 
                                : 'bg-slate-800/80 text-white/80 opacity-0 group-hover:opacity-100 hover:bg-slate-700 scale-90 hover:scale-100'
                            }
                        `}
                        onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title={data.isLocked ? "Unlock Cuts" : "Lock Current Cuts"}
                    >
                        {data.isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                    </button>
                </div>
            </div>
        </foreignObject>
      )}
    </g>
  );
};

export const ScaleHandle: React.FC<HandleProps> = ({
  x,
  y,
  onMouseDown
}) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-auto" style={{ cursor: 'ns-resize' }} onMouseDown={onMouseDown}>
      <circle r="6" fill="#f97316" stroke="white" strokeWidth="2" className="hover:scale-125 transition-transform" />
      <circle r="15" fill="transparent" />
    </g>
  );
};
