import type { ComponentPropsWithoutRef } from "react";

/**
 * Hand-written types for the vendored `GradientASCII.jsx` (React Bits,
 * JS-CSS variant).
 *
 * Without this, `allowJs` infers the prop type straight from the JS
 * destructuring — and because `dpr` and `style` are declared there with no
 * default value, TypeScript treats them as *required*. Declaring the surface
 * explicitly keeps every prop optional and leaves the registry source
 * byte-for-byte as shipped, so re-adding the component never conflicts.
 */

export type GradientASCIIShape = "horizon" | "pinch" | "rise" | "eclipse";
export type GradientASCIIClickEffect = "none" | "wave" | "burst";

export interface GradientASCIIProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  /** Up to 8 hex stops forming the gradient ramp. */
  colors?: string[];
  shape?: GradientASCIIShape;
  /** Glyph ramp, darkest → brightest. */
  characters?: string;
  /** Cell edge in px, clamped 6–64. */
  cellSize?: number;
  density?: number;
  glyphOpacity?: number;
  glow?: number;
  depthOfField?: number;
  flicker?: number;
  softness?: number;
  /** Clamped 0.4–2.5. */
  scale?: number;
  flow?: number;
  speed?: number;
  gradientOpacity?: number;
  grain?: number;
  variation?: number;
  mouseInteraction?: boolean;
  scrambleRadius?: number;
  clickEffect?: GradientASCIIClickEffect;
  intro?: boolean;
  lightMode?: boolean;
  fontFamily?: string;
  /** Device pixel ratio override; defaults to the display's. */
  dpr?: number;
}

declare const GradientASCII: (props: GradientASCIIProps) => React.JSX.Element;

export default GradientASCII;
