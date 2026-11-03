"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A boolean persisted in `localStorage`, read the way React actually wants
 * external state read.
 *
 * The obvious implementation — `useState` plus an effect that reads storage on
 * mount — sets state during the mount effect, which causes a second render
 * pass on every load and is what `react-hooks/set-state-in-effect` is warning
 * about. `useSyncExternalStore` exists precisely for this: it reads the
 * browser value directly, returns a defined server snapshot so SSR and
 * hydration agree, and re-renders only when the value genuinely changes.
 *
 * Returns `null` when nothing has been stored, so callers can distinguish
 * "the visitor chose false" from "the visitor hasn't chosen".
 */
export const useStoredFlag = (
  key: string,
): [boolean | null, (value: boolean) => void] => {
  const subscribe = useCallback(
    (onChange: () => void) => {
      // `storage` covers other tabs; the custom event covers this one, since
      // writing to localStorage does not notify the tab that wrote it.
      const handler = () => onChange();
      window.addEventListener("storage", handler);
      window.addEventListener(`stored-flag:${key}`, handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(`stored-flag:${key}`, handler);
      };
    },
    [key],
  );

  const getSnapshot = useCallback((): boolean | null => {
    const raw = localStorage.getItem(key);
    return raw === null ? null : raw === "1";
  }, [key]);

  // On the server nothing is stored, so nothing has been chosen.
  const getServerSnapshot = useCallback((): boolean | null => null, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next: boolean) => {
      localStorage.setItem(key, next ? "1" : "0");
      window.dispatchEvent(new Event(`stored-flag:${key}`));
    },
    [key],
  );

  return [value, set];
};
