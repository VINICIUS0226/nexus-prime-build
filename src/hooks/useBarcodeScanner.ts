import { useEffect, useRef, useCallback } from 'react';

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxDelay?: number; // max ms between keystrokes to be considered scanner input
}

/**
 * Detects physical barcode scanner input (rapid keystrokes ending with Enter).
 * Scanners typically "type" the barcode and press Enter within ~50-100ms per char.
 */
export const useBarcodeScanner = ({
  onScan,
  enabled = true,
  minLength = 3,
  maxDelay = 80,
}: BarcodeScannerOptions) => {
  const bufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const resetBuffer = useCallback(() => {
    bufferRef.current = '';
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea (except if it's very fast = scanner)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // If too much time passed, reset buffer
      if (timeSinceLastKey > maxDelay && bufferRef.current.length > 0) {
        // If user was typing in an input slowly, just reset
        bufferRef.current = '';
      }

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim();
        if (code.length >= minLength) {
          e.preventDefault();
          e.stopPropagation();
          onScanRef.current(code);
        }
        bufferRef.current = '';
        return;
      }

      // Only accumulate printable single characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // If this is the first char or fast enough, accumulate
        if (bufferRef.current.length === 0 || timeSinceLastKey <= maxDelay) {
          bufferRef.current += e.key;
        } else {
          bufferRef.current = e.key;
        }

        // Auto-clear buffer after a delay (in case Enter never comes)
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, minLength, maxDelay]);

  return { resetBuffer };
};
