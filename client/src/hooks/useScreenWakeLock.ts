import { useCallback, useEffect, useRef, useState } from "react";

type ScreenWakeLockSentinel = EventTarget & {
  release: () => Promise<void>;
};

type ScreenWakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<ScreenWakeLockSentinel>;
  };
};

function getWakeLock() {
  if (typeof navigator === "undefined") return undefined;
  return (navigator as ScreenWakeLockNavigator).wakeLock;
}

export function useScreenWakeLock() {
  const sentinelRef = useRef<ScreenWakeLockSentinel | null>(null);
  const wantsLockRef = useRef(false);
  const [isSupported, setIsSupported] = useState(() => !!getWakeLock());
  const [isActive, setIsActive] = useState(false);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const releaseLock = useCallback(async () => {
    wantsLockRef.current = false;
    const sentinel = sentinelRef.current;
    sentinelRef.current = null;
    setIsActive(false);

    if (sentinel) {
      await sentinel.release().catch(() => undefined);
    }
  }, []);

  const requestLock = useCallback(async () => {
    const wakeLock = getWakeLock();
    setIsSupported(!!wakeLock);

    if (!wakeLock) {
      wantsLockRef.current = false;
      setIsActive(false);
      setIsUnavailable(true);
      return;
    }

    try {
      const sentinel = await wakeLock.request("screen");
      sentinelRef.current = sentinel;
      setIsActive(true);
      setIsUnavailable(false);

      sentinel.addEventListener("release", () => {
        if (sentinelRef.current === sentinel) {
          sentinelRef.current = null;
          setIsActive(false);
        }
      });
    } catch {
      wantsLockRef.current = false;
      sentinelRef.current = null;
      setIsActive(false);
      setIsUnavailable(true);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (sentinelRef.current || isActive) {
      await releaseLock();
      return;
    }

    wantsLockRef.current = true;
    await requestLock();
  }, [isActive, releaseLock, requestLock]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        wantsLockRef.current &&
        !sentinelRef.current
      ) {
        void requestLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wantsLockRef.current = false;
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel) {
        void sentinel.release().catch(() => undefined);
      }
    };
  }, [requestLock]);

  return {
    isActive,
    isSupported,
    isUnavailable,
    toggle,
  };
}
