import { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';

export const ScreenActiveContext = createContext(true);

/** Restore the reading position after a retained screen becomes visible again. */
export const ScreenScrollView = ({ onScroll, onLayout, onContentSizeChange, onScrollBeginDrag, ...props }) => {
  const active = useContext(ScreenActiveContext);
  const scroll = useRef(null);
  const offset = useRef({ x: 0, y: 0 });
  const restoring = useRef(true);
  const frame = useRef(null);
  const restore = useCallback(() => {
    if (!active || !restoring.current) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      scroll.current?.scrollTo({ ...offset.current, animated: false });
      restoring.current = false;
      frame.current = null;
    });
  }, [active]);

  useEffect(() => {
    restoring.current = true;
    restore();
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [restore]);

  return <ScrollView
    {...props}
    ref={scroll}
    scrollEventThrottle={16}
    onScroll={event => {
      if (active && !restoring.current) offset.current = event.nativeEvent.contentOffset;
      onScroll?.(event);
    }}
    onLayout={event => { restore(); onLayout?.(event); }}
    onContentSizeChange={(width, height) => { restore(); onContentSizeChange?.(width, height); }}
    onScrollBeginDrag={event => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      restoring.current = false;
      onScrollBeginDrag?.(event);
    }}
  />;
};
