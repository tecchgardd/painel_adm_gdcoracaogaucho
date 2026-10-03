import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import QRCode from 'qrcode';

const qrCache = new Map<string, string>();

export function DocumentQRCode({ value, size = 90 }: { value: string; size?: number }) {
  const [uri, setUri] = useState<string | null>(qrCache.get(value) ?? null);

  useEffect(() => {
    const cached = qrCache.get(value);
    if (cached) {
      setUri(cached);
      return;
    }
    let active = true;
    QRCode.toDataURL(value, { errorCorrectionLevel: 'M', margin: 1, width: 240 }).then((dataUrl) => {
      qrCache.set(value, dataUrl);
      if (active) setUri(dataUrl);
    });
    return () => {
      active = false;
    };
  }, [value]);

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {uri ? <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="contain" /> : <ActivityIndicator size="small" />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignSelf: 'center', backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }
});
