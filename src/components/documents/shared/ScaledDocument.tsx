import { useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

export function ScaledDocument({ width, children }: { width: number; children: ReactNode }) {
  const [containerWidth, setContainerWidth] = useState(width);
  const [contentHeight, setContentHeight] = useState(0);
  const scale = Math.min(1, containerWidth / width);

  function onContainerLayout(event: LayoutChangeEvent) {
    setContainerWidth(event.nativeEvent.layout.width);
  }

  function onContentLayout(event: LayoutChangeEvent) {
    setContentHeight(event.nativeEvent.layout.height);
  }

  return (
    <View style={styles.outer} onLayout={onContainerLayout}>
      <View style={{ width, height: contentHeight * scale }}>
        <View onLayout={onContentLayout} style={[styles.content, { width, transform: [{ scale }] }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { width: '100%', alignItems: 'center' },
  content: { transformOrigin: 'top left' }
});
