
export interface Point {
  x: number;
  y: number;
}

export interface BubbleData {
  id: string;
  x: number;      // Top-left X of the bubble text box
  y: number;      // Top-left Y of the bubble text box
  width: number;  // Width of the text box
  height: number; // Height of the text box
  anchor: Point;  // Absolute position of the speech bubble tail tip
  text: string;   // Content text
  borderRadius: number; // Corner radius
}

export interface CutData {
  id: string;
  p1: Point;
  p2: Point;
  t1: number; // Thickness at p1
  t2: number; // Thickness at p2
}

export interface FrameData {
  id: string;
  p1: Point; // Top Left
  p2: Point; // Top Right
  p3: Point; // Bottom Right
  p4: Point; // Bottom Left
  color: string;
}

export interface ImageData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  src: string | null;
  isLocked: boolean;
  lockedCutIds: string[];
}

export type DragMode = 
  | 'BODY' | 'ANCHOR' | 'RESIZE' | 'RADIUS' 
  | 'P1' | 'P2' 
  | 'FRAME_BODY' | 'FRAME_P1' | 'FRAME_P2' | 'FRAME_P3' | 'FRAME_P4' 
  | 'IMAGE_BODY' | 'IMAGE_RESIZE' | 'IMAGE_SCALE'
  | 'TOOLBAR'
  | null;

export interface DragState {
  type: 'BUBBLE' | 'CUT' | 'FRAME' | 'IMAGE' | 'TOOLBAR';
  id: string;
  mode: DragMode;
  startX: number;
  startY: number;
  originalData: BubbleData | CutData | FrameData | ImageData | Point;
}
