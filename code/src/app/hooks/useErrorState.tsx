'use client';
import { useEffect, useState } from 'react';
import useNetworkStatus from './useNetworkStatus';

const SLOW_LOADING_TIMEOUT = 5000;

export default function useErrorState(loading: boolean) {
  const isOnline = useNetworkStatus();
  const [slowLoading, setSlowLoading] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (loading) {
      timer = setTimeout(() => setSlowLoading(true), SLOW_LOADING_TIMEOUT);
    } else {
      setSlowLoading(false);
    }

    return () => clearTimeout(timer);
  }, [loading]);

  return {
    isOnline,
    slowLoading,
  };
}
