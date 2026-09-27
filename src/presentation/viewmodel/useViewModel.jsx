import { useEffect, useState, useSyncExternalStore } from 'react';
/**
 * Binds a ViewModel to a React view.
 * The factory runs once per mounted view; state updates trigger re-renders.
 */
export const useViewModel = factory => {
  const [viewModel] = useState(factory);
  useSyncExternalStore(viewModel.subscribe, viewModel.getState);
  useEffect(() => {
    viewModel.__initOnce();
    return () => viewModel.onDispose?.();
  }, [viewModel]);
  return viewModel;
};
