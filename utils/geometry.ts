
import { Point } from '../types';
import { BUBBLE_CORNER_RADIUS, TAIL_WIDTH_AT_BASE } from '../constants';

/**
 * Generates an SVG path data string for a rounded rectangle with a tail pointing to an anchor.
 */
export const generateBubblePath = (
  x: number,
  y: number,
  w: number,
  h: number,
  anchor: Point,
  radius: number = BUBBLE_CORNER_RADIUS
): string => {
  const cx = x + w / 2;
  const cy = y + h / 2;

  // 1. Calculate intersection of the line (Center -> Anchor) with the Rectangle
  // We use a slightly inset rectangle to determine the "side" so the tail base sits nicely.
  const dx = anchor.x - cx;
  const dy = anchor.y - cy;

  // Normalize direction
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = len === 0 ? 0 : dx / len;
  const ny = len === 0 ? 0 : dy / len;

  // Find intersection with the bounding box
  // Logic: Parametric line P = C + t*D. Find min positive t for x=left, x=right, y=top, y=bottom.
  // For a box centered at cx,cy with half-extents hw, hh:
  const hw = w / 2;
  const hh = h / 2;

  // Avoid divide by zero
  const tX = nx !== 0 ? (nx > 0 ? hw : -hw) / nx : Infinity;
  const tY = ny !== 0 ? (ny > 0 ? hh : -hh) / ny : Infinity;

  // The closest intersection determines which "face" the anchor is facing
  const t = Math.min(Math.abs(tX), Math.abs(tY));
  
  // The point on the rectangular boundary (ignoring corners for a moment)
  let px = cx + nx * t;
  let py = cy + ny * t;

  // Determine which side we are on to clamp the base
  // Side indices: 0: Top, 1: Right, 2: Bottom, 3: Left
  let side = -1; 
  
  if (Math.abs(t - Math.abs(tX)) < 0.1) {
    side = nx > 0 ? 1 : 3;
  } else {
    side = ny > 0 ? 2 : 0;
  }

  // Clamp px, py to be within the straight edges (minus radius)
  // This prevents the tail from breaking the rounded corners visually
  const r = radius;
  // Ensure radius doesn't exceed half dimensions
  const maxR = Math.min(w, h) / 2;
  const safeR = Math.min(r, maxR);

  // Clamp points so the tail doesn't spawn on the rounded corner
  if (side === 0 || side === 2) {
    // Top/Bottom: Clamp X
    px = Math.max(x + safeR, Math.min(x + w - safeR, px));
    // Snap Y to edge
    py = side === 0 ? y : y + h;
  } else {
    // Left/Right: Clamp Y
    py = Math.max(y + safeR, Math.min(y + h - safeR, py));
    // Snap X to edge
    px = side === 3 ? x : x + w;
  }

  // Calculate Base Points of the tail
  // The tail base is perpendicular to the side.
  let bx1 = px, by1 = py, bx2 = px, by2 = py;
  const halfBase = TAIL_WIDTH_AT_BASE / 2;

  if (side === 0 || side === 2) {
    // Horizontal Edge -> Base spreads in X
    bx1 = px - halfBase;
    bx2 = px + halfBase;
  } else {
    // Vertical Edge -> Base spreads in Y
    by1 = py - halfBase;
    by2 = py + halfBase;
  }

  // Construct Path
  // We start top-left (after corner) and move clockwise.
  // When we reach the side with the tail, we inject the tail vertices.

  const ops: string[] = [];
  
  // Start Top-Left (after radius)
  ops.push(`M ${x + safeR} ${y}`);

  // TOP EDGE
  if (side === 0) {
    ops.push(`L ${bx1} ${by1}`); // To tail start
    ops.push(`L ${anchor.x} ${anchor.y}`); // To anchor
    ops.push(`L ${bx2} ${by2}`); // To tail end
  }
  ops.push(`L ${x + w - safeR} ${y}`);
  ops.push(`Q ${x + w} ${y} ${x + w} ${y + safeR}`); // Top-Right Corner

  // RIGHT EDGE
  if (side === 1) {
    ops.push(`L ${bx1} ${by1}`);
    ops.push(`L ${anchor.x} ${anchor.y}`);
    ops.push(`L ${bx2} ${by2}`);
  }
  ops.push(`L ${x + w} ${y + h - safeR}`);
  ops.push(`Q ${x + w} ${y + h} ${x + w - safeR} ${y + h}`); // Bottom-Right Corner

  // BOTTOM EDGE
  if (side === 2) {
    // For Bottom (Right to Left), bx2 (larger X) comes first if we follow clockwise rect but path logic needs points in order
    // Let's ensure correct order based on coordinates.
    const p1 = {x: bx1, y: by1};
    const p2 = {x: bx2, y: by2};
    // Swap if needed to match direction (Right to Left)
    const first = p1.x > p2.x ? p1 : p2;
    const second = p1.x > p2.x ? p2 : p1;
    
    ops.push(`L ${first.x} ${first.y}`);
    ops.push(`L ${anchor.x} ${anchor.y}`);
    ops.push(`L ${second.x} ${second.y}`);
  }
  ops.push(`L ${x + safeR} ${y + h}`);
  ops.push(`Q ${x} ${y + h} ${x} ${y + h - safeR}`); // Bottom-Left Corner

  // LEFT EDGE
  if (side === 3) {
    // Moving Bottom to Top. Larger Y first.
    const p1 = {x: bx1, y: by1};
    const p2 = {x: bx2, y: by2};
    const first = p1.y > p2.y ? p1 : p2;
    const second = p1.y > p2.y ? p2 : p1;

    ops.push(`L ${first.x} ${first.y}`);
    ops.push(`L ${anchor.x} ${anchor.y}`);
    ops.push(`L ${second.x} ${second.y}`);
  }
  ops.push(`L ${x} ${y + safeR}`);
  ops.push(`Q ${x} ${y} ${x + safeR} ${y}`); // Top-Left Corner (Close)

  ops.push("Z");

  return ops.join(" ");
};

/**
 * Generates an SVG path for a line with variable thickness at endpoints (tapered).
 */
export const generateTaperedLinePath = (p1: Point, p2: Point, t1: number, t2: number): string => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len === 0) return "";

  // Normalized Direction Vector
  const ux = dx / len;
  const uy = dy / len;

  // Perpendicular Vector (-y, x)
  const px = -uy;
  const py = ux;

  // Half thicknesses
  const h1 = t1 / 2;
  const h2 = t2 / 2;

  // Calculate 4 corners of the trapezoid
  const p1_left_x = p1.x + px * h1;
  const p1_left_y = p1.y + py * h1;
  
  const p1_right_x = p1.x - px * h1;
  const p1_right_y = p1.y - py * h1;

  const p2_left_x = p2.x + px * h2;
  const p2_left_y = p2.y + py * h2;

  const p2_right_x = p2.x - px * h2;
  const p2_right_y = p2.y - py * h2;

  // Draw path: P1L -> P2L -> P2R -> P1R -> Close
  return `M ${p1_left_x} ${p1_left_y} L ${p2_left_x} ${p2_left_y} L ${p2_right_x} ${p2_right_y} L ${p1_right_x} ${p1_right_y} Z`;
};


// --- Intersection & Masking Helpers ---

const isPointInRect = (p: Point, rect: { x: number, y: number, width: number, height: number }): boolean => {
  return p.x >= rect.x && p.x <= rect.x + rect.width &&
         p.y >= rect.y && p.y <= rect.y + rect.height;
};

const onSegment = (p: Point, a: Point, b: Point): boolean => {
  return p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) &&
         p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
}

const linesIntersect = (p1: Point, p2: Point, p3: Point, p4: Point): boolean => {
  const d1 = (p2.x - p1.x) * (p3.y - p1.y) - (p3.x - p1.x) * (p2.y - p1.y);
  const d2 = (p2.x - p1.x) * (p4.y - p1.y) - (p4.x - p1.x) * (p2.y - p1.y);
  const d3 = (p4.x - p3.x) * (p1.y - p3.y) - (p1.x - p3.x) * (p4.y - p3.y);
  const d4 = (p4.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p4.y - p3.y);

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  return false;
};

/**
 * Checks if line segment p1-p2 intersects with rectangle.
 */
export const segmentIntersectsRect = (p1: Point, p2: Point, rect: { x: number, y: number, width: number, height: number }): boolean => {
  // 1. Check endpoints inside
  if (isPointInRect(p1, rect) || isPointInRect(p2, rect)) return true;

  // 2. Check intersection with edges
  const tl = { x: rect.x, y: rect.y };
  const tr = { x: rect.x + rect.width, y: rect.y };
  const bl = { x: rect.x, y: rect.y + rect.height };
  const br = { x: rect.x + rect.width, y: rect.y + rect.height };

  if (linesIntersect(p1, p2, tl, tr)) return true; // Top
  if (linesIntersect(p1, p2, tr, br)) return true; // Right
  if (linesIntersect(p1, p2, br, bl)) return true; // Bottom
  if (linesIntersect(p1, p2, bl, tl)) return true; // Left

  return false;
};

/**
 * Generates a path string for a huge polygon covering the side of the line (p1-p2) 
 * that is OPPOSITE to the keepPoint (image center).
 * This creates a "mask out" region.
 */
export const generateHalfPlaneMask = (p1: Point, p2: Point, keepPoint: Point): string => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  
  // Normal vector to line (-dy, dx)
  const nx = -dy;
  const ny = dx;

  // Vector from p1 to keepPoint
  const vcx = keepPoint.x - p1.x;
  const vcy = keepPoint.y - p1.y;

  // Dot product N . VC
  const dot = nx * vcx + ny * vcy;

  // We want the direction that points AWAY from keepPoint.
  // If dot > 0, normal points to keepPoint. We want -Normal.
  // If dot < 0, normal points away. We want Normal.
  const sign = dot > 0 ? -1 : 1;
  
  const huge = 20000; // Large number to cover screen
  const mx = nx * sign * huge;
  const my = ny * sign * huge;

  // Also extend the line segment directionally to simulate infinite line
  const lx = (dx / (Math.sqrt(dx*dx + dy*dy) || 1)) * huge;
  const ly = (dy / (Math.sqrt(dx*dx + dy*dy) || 1)) * huge;

  // Construct polygon points
  // Start at P1 far extension -> P2 far extension -> P2 projected out -> P1 projected out
  // P1_far = P1 - L
  // P2_far = P2 + L
  
  const P1x = p1.x - lx;
  const P1y = p1.y - ly;
  const P2x = p2.x + lx;
  const P2y = p2.y + ly;

  return `M ${P1x} ${P1y} L ${P2x} ${P2y} L ${P2x + mx} ${P2y + my} L ${P1x + mx} ${P1y + my} Z`;
};
