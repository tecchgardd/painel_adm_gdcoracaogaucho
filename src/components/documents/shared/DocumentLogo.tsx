import { Image, StyleSheet } from 'react-native';

export function DocumentLogo({ size = 92 }: { size?: number }) {
  return (
    <Image source={require('../../../../assets/logo-oficial.jpeg')} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]} resizeMode="cover" />
  );
}

const styles = StyleSheet.create({
  image: { alignSelf: 'center' }
});
