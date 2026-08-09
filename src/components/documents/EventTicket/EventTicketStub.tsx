import { Text, View } from 'react-native';
import { DocumentBarcode } from '../shared/DocumentBarcode';
import { styles } from './styles';

export function EventTicketStub({ codigo }: { codigo: string }) {
  return (
    <View style={styles.stub}>
      <DocumentBarcode value={codigo} orientation="vertical" height={50} unitWidth={1.6} />
      <Text style={styles.stubCode}>{codigo}</Text>
    </View>
  );
}
