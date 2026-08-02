import { LayoutChangeEvent, NativeSyntheticEvent, StyleSheet, TextInputContentSizeChangeEventData, TextInputScrollEventData, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useRef, useState } from 'react';

const MIN_THUMB_HEIGHT = 36;
const MAX_THUMB_HEIGHT = 88;
const TRACK_INSET = 28;
const THUMB_ANIMATION_MS = 120;

function nonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
}

export function useNoteScrollbar() {
  const metrics = useRef({ contentHeight: 0, viewportHeight: 0, scrollOffset: 0 });
  const thumbTranslateY = useSharedValue(0);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateY: thumbTranslateY.value }] }));
  const thumbHeightRef = useRef(0);
  const scrollbarVisibleRef = useRef(false);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);

  const syncThumb = (animate = false) => {
    const contentHeight = nonNegative(metrics.current.contentHeight);
    const viewportHeight = nonNegative(metrics.current.viewportHeight);
    const trackHeight = Math.max(viewportHeight - TRACK_INSET * 2, 0);
    const maxScrollOffset = Math.max(contentHeight - viewportHeight, 0);
    const thumbHeight = contentHeight <= viewportHeight
      ? trackHeight
      : clamp(trackHeight * (viewportHeight / contentHeight), Math.min(MIN_THUMB_HEIGHT, trackHeight), Math.min(MAX_THUMB_HEIGHT, trackHeight));
    const maxThumbTranslateY = Math.max(trackHeight - thumbHeight, 0);
    const visible = contentHeight > viewportHeight + 1 && trackHeight > 0;

    metrics.current.scrollOffset = clamp(metrics.current.scrollOffset, 0, maxScrollOffset);
    if (thumbHeightRef.current !== thumbHeight) {
      thumbHeightRef.current = thumbHeight;
      setThumbHeight(thumbHeight);
    }
    if (scrollbarVisibleRef.current !== visible) {
      scrollbarVisibleRef.current = visible;
      setScrollbarVisible(visible);
    }

    // Height follows the visible-content ratio; offset follows the native TextInput scroll offset.
    const nextTranslateY = maxScrollOffset === 0
      ? 0
      : clamp((metrics.current.scrollOffset / maxScrollOffset) * maxThumbTranslateY, 0, maxThumbTranslateY);
    thumbTranslateY.value = animate ? withTiming(nextTranslateY, { duration: THUMB_ANIMATION_MS }) : nextTranslateY;
  };

  return {
    thumbHeight,
    scrollbarVisible,
    thumbStyle,
    onContentSizeChange: (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      metrics.current.contentHeight = nonNegative(event.nativeEvent.contentSize.height);
      syncThumb();
    },
    onLayout: (event: LayoutChangeEvent) => {
      metrics.current.viewportHeight = nonNegative(event.nativeEvent.layout.height);
      syncThumb();
    },
    onScroll: (event: NativeSyntheticEvent<TextInputScrollEventData>) => {
      metrics.current.scrollOffset = nonNegative(event.nativeEvent.contentOffset.y);
      syncThumb(true);
    },
  };
}

export function NoteScrollbar({ scrollbar, right = 14 }: { scrollbar: ReturnType<typeof useNoteScrollbar>; right?: number }) {
  if (!scrollbar.scrollbarVisible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.track, { right }]}>
      <View style={styles.rail} />
      <Animated.View style={[styles.thumb, { height: scrollbar.thumbHeight }, scrollbar.thumbStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { position: 'absolute', top: TRACK_INSET, bottom: TRACK_INSET, width: 10, alignItems: 'center' },
  rail: { position: 'absolute', top: 0, bottom: 0, alignSelf: 'center', width: 3, borderRadius: 999, backgroundColor: 'rgba(88, 112, 92, 0.18)' },
  thumb: { position: 'absolute', top: 0, alignSelf: 'center', width: 5, borderRadius: 999, backgroundColor: 'rgba(70, 103, 77, 0.78)' },
});
