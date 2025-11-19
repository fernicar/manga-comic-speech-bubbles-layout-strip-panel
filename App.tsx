
import React, { useState, useRef, useCallback } from 'react';
import { BubbleData, CutData, FrameData, ImageData, DragState, DragMode, Point } from './types';
import { DEFAULT_BUBBLE_WIDTH, DEFAULT_BUBBLE_HEIGHT, DEMO_TEXTS, BUBBLE_CORNER_RADIUS } from './constants';
import { generateBubblePath, generateTaperedLinePath, segmentIntersectsRect, generateHalfPlaneMask } from './utils/geometry';
import { Toolbar } from './components/Toolbar';
import { BubbleOverlay, AnchorHandle, RadiusHandle, ResizeHandle, CutHandle, FrameControls, CornerHandle, CutPointControls, ImagePlaceholder, ScaleHandle } from './components/BubbleRenderer';

// Simple ID generator
const simpleId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  const [bubbles, setBubbles] = useState<BubbleData[]>([
    {
      id: '1',
      x: 100,
      y: 150,
      width: 240,
      height: 120,
      anchor: { x: 400, y: 350 },
      text: DEMO_TEXTS[0],
      borderRadius: BUBBLE_CORNER_RADIUS
    },
    {
      id: '2',
      x: 500,
      y: 100,
      width: 200,
      height: 100,
      anchor: { x: 450, y: 250 },
      text: DEMO_TEXTS[2],
      borderRadius: 40
    }
  ]);

  const [cuts, setCuts] = useState<CutData[]>([]);
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [images, setImages] = useState<ImageData[]>([]);
  const [toolbarPos, setToolbarPos] = useState<Point>({ x: 24, y: 24 });
  const [previewMode, setPreviewMode] = useState(false);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  // --- Actions ---

  const addBubble = () => {
    const newId = simpleId();
    const centerX = window.innerWidth / 2 - DEFAULT_BUBBLE_WIDTH / 2;
    const centerY = window.innerHeight / 2 - DEFAULT_BUBBLE_HEIGHT / 2;
    
    const newBubble: BubbleData = {
      id: newId,
      x: centerX + (Math.random() * 40 - 20),
      y: centerY + (Math.random() * 40 - 20),
      width: DEFAULT_BUBBLE_WIDTH,
      height: DEFAULT_BUBBLE_HEIGHT,
      anchor: { x: centerX + DEFAULT_BUBBLE_WIDTH / 2, y: centerY + DEFAULT_BUBBLE_HEIGHT + 50 },
      text: DEMO_TEXTS[Math.floor(Math.random() * DEMO_TEXTS.length)],
      borderRadius: BUBBLE_CORNER_RADIUS
    };

    setBubbles(prev => [...prev, newBubble]);
  };

  const addCut = () => {
    const newId = simpleId();
    const w = window.innerWidth;
    const h = window.innerHeight;
    // Default diagonal cut with thickness
    const newCut: CutData = {
      id: newId,
      p1: { x: w * 0.3, y: h * 0.2 },
      p2: { x: w * 0.7, y: h * 0.8 },
      t1: 10,
      t2: 10
    };
    setCuts(prev => [...prev, newCut]);
  };

  const addFrame = () => {
    const newId = simpleId();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = 100;
    const newFrame: FrameData = {
      id: newId,
      p1: { x: margin, y: margin },
      p2: { x: w - margin, y: margin },
      p3: { x: w - margin, y: h - margin },
      p4: { x: margin, y: h - margin },
      color: '#000000' // Default wall color black
    };
    setFrames(prev => [...prev, newFrame]);
  };

  const addImage = () => {
    const newId = simpleId();
    const centerX = window.innerWidth / 2 - 128;
    const centerY = window.innerHeight / 2 - 128;
    const x = Math.round(centerX / 16) * 16;
    const y = Math.round(centerY / 16) * 16;

    const newImage: ImageData = {
      id: newId,
      x: x,
      y: y,
      width: 256,
      height: 256,
      scale: 1,
      src: null,
      isLocked: false,
      lockedCutIds: []
    };
    setImages(prev => [...prev, newImage]);
  };

  const deleteBubble = (id: string) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
  };

  const deleteFrame = (id: string) => {
    setFrames(prev => prev.filter(f => f.id !== id));
  };

  const deleteImage = (id: string) => {
    setImages(prev => prev.filter(i => i.id !== id));
  };

  const updateBubbleText = (id: string, text: string) => {
    setBubbles(prev => prev.map(b => b.id === id ? { ...b, text } : b));
  };

  const updateFrameColor = (id: string, color: string) => {
    setFrames(prev => prev.map(f => f.id === id ? { ...f, color } : f));
  };

  const updateCutThickness = (id: string, point: 'p1' | 'p2', value: number) => {
    setCuts(prev => prev.map(c => {
        if (c.id !== id) return c;
        if (point === 'p1') return { ...c, t1: value };
        return { ...c, t2: value };
    }));
  };

  const toggleImageLock = (id: string) => {
    setImages(prev => prev.map(img => {
      if (img.id !== id) return img;

      if (img.isLocked) {
        return { ...img, isLocked: false, lockedCutIds: [] };
      } else {
        const rect = { x: img.x, y: img.y, width: img.width, height: img.height };
        const intersectingIds = cuts
          .filter(c => segmentIntersectsRect(c.p1, c.p2, rect))
          .map(c => c.id);
        
        return { ...img, isLocked: true, lockedCutIds: intersectingIds };
      }
    }));
  };

  const handleImageDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setImages(prev => prev.map(img => img.id === id ? { ...img, src: evt.target!.result as string } : img));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Export Logic ---
  
  const handleDownload = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Helper to escape XML special chars
    const escapeXml = (unsafe: string) => {
      return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    // 1. Construct SVG Strings for Images, Cuts, Frames
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <filter id="solid-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="dilated"/>
          <feFlood flood-color="#000" result="color"/>
          <feComposite in="color" in2="dilated" operator="in" result="outline"/>
          <feOffset in="outline" dx="0" dy="0" result="shadow"/>
          <feMerge>
            <feMergeNode in="shadow"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>`;

    // Background
    svgContent += `<rect width="100%" height="100%" fill="#0f172a" />`;

    // Render Images
    images.forEach(img => {
       const maskId = `mask-${img.id}`;
       const clipId = `clip-${img.id}`;
       const cx = img.x + img.width / 2;
       const cy = img.y + img.height / 2;

       // Re-calculate intersections for export
       const intersectingCuts = cuts.filter(cut => {
         const physicallyIntersects = segmentIntersectsRect(cut.p1, cut.p2, { x: img.x, y: img.y, width: img.width, height: img.height });
         if (img.isLocked) {
           return img.lockedCutIds.includes(cut.id) && physicallyIntersects;
         }
         return physicallyIntersects;
       });

       let maskContent = `<mask id="${maskId}"><rect x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" fill="white" />`;
       intersectingCuts.forEach(cut => {
          maskContent += `<path d="${generateHalfPlaneMask(cut.p1, cut.p2, {x: cx, y: cy})}" fill="black" />`;
       });
       maskContent += `</mask>`;
       
       let clipContent = `<clipPath id="${clipId}"><rect x="${img.x}" y="${img.y}" width="${img.width}" height="${img.height}" /></clipPath>`;
       
       svgContent += `<defs>${maskContent}${clipContent}</defs>`;

       if (img.src) {
         const ix = img.x + (img.width - img.width * img.scale) / 2;
         const iy = img.y + (img.height - img.height * img.scale) / 2;
         const iw = img.width * img.scale;
         const ih = img.height * img.scale;
         svgContent += `<image href="${img.src}" x="${ix}" y="${iy}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" mask="url(#${maskId})" />`;
       }
    });

    // Render Cuts
    cuts.forEach(cut => {
      const d = generateTaperedLinePath(cut.p1, cut.p2, cut.t1, cut.t2);
      svgContent += `<path d="${d}" fill="black" />`;
    });

    // Render Frames
    frames.forEach(frame => {
      const screenW = 10000;
      const screenH = 10000;
      const d = `M -${screenW} -${screenH} H ${screenW} V ${screenH} H -${screenW} Z M ${frame.p1.x} ${frame.p1.y} L ${frame.p2.x} ${frame.p2.y} L ${frame.p3.x} ${frame.p3.y} L ${frame.p4.x} ${frame.p4.y} Z`;
      svgContent += `<path d="${d}" fill="${frame.color}" fill-rule="evenodd" />`;
    });

    // Render Bubbles with Text
    bubbles.forEach(b => {
      const d = generateBubblePath(b.x, b.y, b.width, b.height, b.anchor, b.borderRadius);
      svgContent += `<path d="${d}" fill="white" filter="url(#solid-shadow)" />`;
      
      // Embed text using foreignObject
      svgContent += `
        <foreignObject x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; text-align:center; color:#0f172a; font-family:system-ui, sans-serif; font-weight:500; line-height:1.375; padding:1rem; box-sizing:border-box; overflow:hidden; word-wrap:break-word;">
            ${escapeXml(b.text)}
          </div>
        </foreignObject>
      `;
    });

    svgContent += `</svg>`;

    // Convert to Blob and Download directly as SVG to avoid Canvas tainting with foreignObject
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bubblegen-export.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Drag Handlers ---

  const handleMouseDown = (
    e: React.MouseEvent, 
    type: 'BUBBLE' | 'CUT' | 'FRAME' | 'IMAGE' | 'TOOLBAR', 
    mode: DragMode, 
    data: BubbleData | CutData | FrameData | ImageData | Point
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    if (e.target instanceof Element) {
       try {
         e.target.setPointerCapture(e.pointerId);
       } catch (err) {
         // ignore
       }
    }

    let originalData;
    if (type === 'BUBBLE') originalData = { ...(data as BubbleData) };
    else if (type === 'CUT') originalData = { ...(data as CutData) };
    else if (type === 'FRAME') originalData = { ...(data as FrameData) };
    else if (type === 'IMAGE') originalData = { ...(data as ImageData) };
    else if (type === 'TOOLBAR') originalData = { ...(data as Point) };

    setDragState({
      type,
      id: (data as any).id || 'toolbar',
      mode,
      startX: e.clientX,
      startY: e.clientY,
      originalData: originalData as any
    });
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;

    if (dragState.type === 'BUBBLE') {
      const originalBubble = dragState.originalData as BubbleData;
      setBubbles(prev => prev.map(b => {
        if (b.id !== dragState.id) return b;

        if (dragState.mode === 'BODY') {
          return {
            ...b,
            x: originalBubble.x + dx,
            y: originalBubble.y + dy,
            anchor: {
              x: originalBubble.anchor.x + dx,
              y: originalBubble.anchor.y + dy
            }
          };
        } else if (dragState.mode === 'ANCHOR') {
          return {
            ...b,
            anchor: {
              x: originalBubble.anchor.x + dx,
              y: originalBubble.anchor.y + dy
            }
          };
        } else if (dragState.mode === 'RADIUS') {
          const relativeX = (e.clientX - originalBubble.x);
          const maxRadius = Math.min(b.width, b.height) / 2;
          const newRadius = Math.max(0, Math.min(maxRadius, relativeX));
          return { ...b, borderRadius: newRadius };
        } else if (dragState.mode === 'RESIZE') {
          const newWidth = Math.max(100, originalBubble.width + dx);
          const newHeight = Math.max(60, originalBubble.height + dy);
          const safeRadius = Math.min(b.borderRadius, Math.min(newWidth, newHeight) / 2);
          return { ...b, width: newWidth, height: newHeight, borderRadius: safeRadius };
        }
        return b;
      }));
    } else if (dragState.type === 'CUT') {
      const originalCut = dragState.originalData as CutData;
      setCuts(prev => prev.map(c => {
        if (c.id !== dragState.id) return c;

        if (dragState.mode === 'BODY') {
          return {
            ...c,
            p1: { x: originalCut.p1.x + dx, y: originalCut.p1.y + dy },
            p2: { x: originalCut.p2.x + dx, y: originalCut.p2.y + dy }
          };
        } else if (dragState.mode === 'P1') {
          return {
            ...c,
            p1: { x: originalCut.p1.x + dx, y: originalCut.p1.y + dy }
          };
        } else if (dragState.mode === 'P2') {
          return {
            ...c,
            p2: { x: originalCut.p2.x + dx, y: originalCut.p2.y + dy }
          };
        }
        return c;
      }));
    } else if (dragState.type === 'FRAME') {
      const originalFrame = dragState.originalData as FrameData;
      setFrames(prev => prev.map(f => {
        if (f.id !== dragState.id) return f;

        if (dragState.mode === 'FRAME_BODY') {
           return {
             ...f,
             p1: { x: originalFrame.p1.x + dx, y: originalFrame.p1.y + dy },
             p2: { x: originalFrame.p2.x + dx, y: originalFrame.p2.y + dy },
             p3: { x: originalFrame.p3.x + dx, y: originalFrame.p3.y + dy },
             p4: { x: originalFrame.p4.x + dx, y: originalFrame.p4.y + dy },
           };
        } else if (dragState.mode === 'FRAME_P1') {
           return { ...f, p1: { x: originalFrame.p1.x + dx, y: originalFrame.p1.y + dy } };
        } else if (dragState.mode === 'FRAME_P2') {
           return { ...f, p2: { x: originalFrame.p2.x + dx, y: originalFrame.p2.y + dy } };
        } else if (dragState.mode === 'FRAME_P3') {
           return { ...f, p3: { x: originalFrame.p3.x + dx, y: originalFrame.p3.y + dy } };
        } else if (dragState.mode === 'FRAME_P4') {
           return { ...f, p4: { x: originalFrame.p4.x + dx, y: originalFrame.p4.y + dy } };
        }
        return f;
      }));
    } else if (dragState.type === 'IMAGE') {
      const originalImage = dragState.originalData as ImageData;
      setImages(prev => prev.map(img => {
        if (img.id !== dragState.id) return img;

        if (dragState.mode === 'IMAGE_BODY') {
          return {
            ...img,
            x: originalImage.x + dx,
            y: originalImage.y + dy
          };
        } else if (dragState.mode === 'IMAGE_RESIZE') {
          const newW = Math.max(32, Math.round((originalImage.width + dx) / 16) * 16);
          const newH = Math.max(32, Math.round((originalImage.height + dy) / 16) * 16);
          return {
            ...img,
            width: newW,
            height: newH
          };
        } else if (dragState.mode === 'IMAGE_SCALE') {
          const newScale = Math.max(0.1, originalImage.scale - dy * 0.01);
          return {
            ...img,
            scale: newScale
          };
        }
        return img;
      }));
    } else if (dragState.type === 'TOOLBAR') {
      const originalPos = dragState.originalData as Point;
      setToolbarPos({
        x: originalPos.x + dx,
        y: originalPos.y + dy
      });
    }
  }, [dragState]);

  const handleMouseUp = (e: React.MouseEvent) => {
    // Check for Click on Toolbar Grip to toggle Preview
    if (dragState && dragState.type === 'TOOLBAR') {
       const dx = Math.abs(e.clientX - dragState.startX);
       const dy = Math.abs(e.clientY - dragState.startY);
       // If moved less than 5px, treat as click
       if (dx < 5 && dy < 5) {
         setPreviewMode(prev => !prev);
       }
    }
    setDragState(null);
  };

  return (
    <div 
      className="w-screen h-screen bg-slate-900 overflow-hidden relative select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Toolbar 
        position={toolbarPos}
        onMouseDown={(e) => handleMouseDown(e, 'TOOLBAR', 'TOOLBAR', toolbarPos)}
        onAddBubble={addBubble} 
        onAddCut={addCut} 
        onAddFrame={addFrame}
        onAddImage={addImage}
        onDownload={handleDownload}
        previewMode={previewMode}
      />

      {/* 
         Layer 1: SVG Canvas for Shapes and Cuts
         Order: Images (Bottom) -> Cuts -> Frames -> Bubbles (Top)
      */}
      <svg 
        ref={svgRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <defs>
          <filter id="solid-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="dilated"/>
            <feFlood floodColor="#000" result="color"/>
            <feComposite in="color" in2="dilated" operator="in" result="outline"/>
            <feOffset in="outline" dx="0" dy="0" result="shadow"/>
            <feMerge>
              <feMergeNode in="shadow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Render Images (Bottom Layer) */}
        {images.map(img => (
          <ImagePlaceholder 
            key={img.id}
            data={img}
            cuts={cuts}
            onMouseDown={(e) => handleMouseDown(e, 'IMAGE', 'IMAGE_BODY', img)}
            onDrop={handleImageDrop}
            onDelete={() => deleteImage(img.id)}
            onToggleLock={() => toggleImageLock(img.id)}
            previewMode={previewMode}
          />
        ))}

        {/* Render Cuts */}
        {cuts.map(cut => {
           const pathD = generateTaperedLinePath(cut.p1, cut.p2, cut.t1, cut.t2);
           return (
             <path 
               key={cut.id}
               d={pathD}
               fill="black"
               className={`${previewMode ? '' : 'cursor-move pointer-events-auto'}`}
               onMouseDown={(e) => !previewMode && handleMouseDown(e, 'CUT', 'BODY', cut)}
             />
           );
        })}

        {/* Render Frames (Walls) */}
        {frames.map(frame => {
          const screenW = 10000; 
          const screenH = 10000;
          const path = `
            M -${screenW} -${screenH} H ${screenW} V ${screenH} H -${screenW} Z 
            M ${frame.p1.x} ${frame.p1.y} 
            L ${frame.p2.x} ${frame.p2.y} 
            L ${frame.p3.x} ${frame.p3.y} 
            L ${frame.p4.x} ${frame.p4.y} 
            Z
          `;

          return (
            <path
              key={frame.id}
              d={path}
              fill={frame.color}
              fillRule="evenodd"
              className={`${previewMode ? '' : 'pointer-events-auto'}`}
            />
          );
        })}

        {/* Render Bubbles */}
        {bubbles.map(bubble => {
            const pathD = generateBubblePath(bubble.x, bubble.y, bubble.width, bubble.height, bubble.anchor, bubble.borderRadius);
            return (
              <g key={bubble.id}>
                 <path
                   d={pathD}
                   fill="white"
                   filter="url(#solid-shadow)"
                   className="transition-colors duration-200"
                 />
              </g>
            );
        })}
      </svg>

      {/* 
         Layer 2: HTML Content Layer (Text, Frame Controls, Cut Controls)
      */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 10 }}>
        {bubbles.map(bubble => (
          <BubbleOverlay
            key={bubble.id}
            data={bubble}
            onMouseDown={(e) => !previewMode && handleMouseDown(e, 'BUBBLE', 'BODY', bubble)}
            onDelete={(e) => deleteBubble(bubble.id)}
            isEditing={editingId === bubble.id}
            onEditStart={() => !previewMode && setEditingId(bubble.id)}
            onEditEnd={() => setEditingId(null)}
            onTextChange={(text) => updateBubbleText(bubble.id, text)}
            previewMode={previewMode}
          />
        ))}

        {!previewMode && frames.map(frame => (
           <FrameControls 
              key={frame.id}
              data={frame}
              onMouseDownMove={(e) => handleMouseDown(e, 'FRAME', 'FRAME_BODY', frame)}
              onColorChange={(color) => updateFrameColor(frame.id, color)}
              onDelete={() => deleteFrame(frame.id)}
           />
        ))}

        {!previewMode && cuts.map(cut => (
           <React.Fragment key={cut.id}>
             <CutPointControls 
               x={cut.p1.x} 
               y={cut.p1.y} 
               thickness={cut.t1} 
               onChange={(v) => updateCutThickness(cut.id, 'p1', v)}
             />
             <CutPointControls 
               x={cut.p2.x} 
               y={cut.p2.y} 
               thickness={cut.t2} 
               onChange={(v) => updateCutThickness(cut.id, 'p2', v)}
             />
           </React.Fragment>
        ))}
      </div>

      {/* 
         Layer 3: Handles Layer (Hidden in Preview)
      */}
      {!previewMode && (
        <svg 
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 20 }}
        >
            {bubbles.map(bubble => (
                <g key={bubble.id}>
                    <RadiusHandle 
                        x={bubble.x + bubble.borderRadius}
                        y={bubble.y}
                        onMouseDown={(e) => handleMouseDown(e, 'BUBBLE', 'RADIUS', bubble)}
                    />
                    <AnchorHandle 
                    x={bubble.anchor.x} 
                    y={bubble.anchor.y} 
                    onMouseDown={(e) => handleMouseDown(e, 'BUBBLE', 'ANCHOR', bubble)} 
                    />
                    <ResizeHandle
                        x={bubble.x + bubble.width}
                        y={bubble.y + bubble.height}
                        onMouseDown={(e) => handleMouseDown(e, 'BUBBLE', 'RESIZE', bubble)}
                    />
                </g>
            ))}

            {cuts.map(cut => (
            <g key={cut.id}>
                <CutHandle 
                x={cut.p1.x} 
                y={cut.p1.y} 
                onMouseDown={(e) => handleMouseDown(e, 'CUT', 'P1', cut)}
                />
                <CutHandle 
                x={cut.p2.x} 
                y={cut.p2.y} 
                onMouseDown={(e) => handleMouseDown(e, 'CUT', 'P2', cut)}
                />
            </g>
            ))}

            {frames.map(frame => (
            <g key={frame.id}>
                <CornerHandle 
                x={frame.p1.x} 
                y={frame.p1.y} 
                onMouseDown={(e) => handleMouseDown(e, 'FRAME', 'FRAME_P1', frame)} 
                />
                <CornerHandle 
                x={frame.p2.x} 
                y={frame.p2.y} 
                onMouseDown={(e) => handleMouseDown(e, 'FRAME', 'FRAME_P2', frame)} 
                />
                <CornerHandle 
                x={frame.p3.x} 
                y={frame.p3.y} 
                onMouseDown={(e) => handleMouseDown(e, 'FRAME', 'FRAME_P3', frame)} 
                />
                <CornerHandle 
                x={frame.p4.x} 
                y={frame.p4.y} 
                onMouseDown={(e) => handleMouseDown(e, 'FRAME', 'FRAME_P4', frame)} 
                />
            </g>
            ))}

            {images.map(img => (
            <g key={img.id}>
                <ResizeHandle 
                x={img.x + img.width}
                y={img.y + img.height}
                onMouseDown={(e) => handleMouseDown(e, 'IMAGE', 'IMAGE_RESIZE', img)}
                />
                <ScaleHandle 
                x={img.x + img.width}
                y={img.y}
                onMouseDown={(e) => handleMouseDown(e, 'IMAGE', 'IMAGE_SCALE', img)}
                />
            </g>
            ))}
        </svg>
      )}

      {/* Background Grid - Hide in preview */}
      {!previewMode && (
        <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', 
             backgroundSize: '16px 16px' 
           }} 
        />
      )}
    </div>
  );
};

export default App;
