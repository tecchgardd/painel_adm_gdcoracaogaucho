import { StyleSheet, Text, View } from 'react-native';

export function DocumentFooter({ lines }: { lines: string[] }) {
  return (
    <View style={styles.footer}>
      {lines.map((line, index) => (
        <Text key={index} style={styles.line}>{line}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { backgroundColor: '#5C1414', paddingHorizontal: 18, paddingVertical: 12, gap: 2 },
  line: { color: '#fff', fontSize: 10, textAlign: 'center', opacity: 0.85 }
});
