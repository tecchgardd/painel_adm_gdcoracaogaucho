import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Input, Logo } from '@/components/ui';
import { useAuthStore } from '@/stores/auth.store';
import { colors } from '@/theme/colors';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);

  async function entrar() {
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.replace('/(admin)/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Não foi possível entrar.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return <LinearGradient colors={['#fff', '#fff', '#f7f7f7']} style={styles.container}>
    <View style={styles.top} />
    <Logo size={132} />
    <Text style={styles.title}>Bem-vindo(a) de volta!</Text>
    <Text style={styles.sub}>Acesse sua conta para continuar</Text>
    <View style={styles.form}>
      <Text style={styles.label}>E-mail</Text><Input value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Text style={styles.label}>Senha</Text><Input value={password} onChangeText={setPassword} secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.row}><Text style={styles.remember}>Lembrar de mim</Text><TouchableOpacity><Text style={styles.link}>Esqueci minha senha</Text></TouchableOpacity></View>
      <Button title={loading ? 'ENTRANDO...' : 'ENTRAR'} onPress={loading ? undefined : entrar} />
    </View>
    <Text style={styles.help}>Precisa de ajuda? <Text style={styles.link}>Fale com o suporte</Text></Text>
    <View style={styles.bottom} />
  </LinearGradient>;
}
const styles = StyleSheet.create({ container:{flex:1,alignItems:'center',padding:26,justifyContent:'center'}, top:{position:'absolute',top:0,left:0,right:0,height:28,backgroundColor:colors.green,borderBottomLeftRadius:28,borderBottomRightRadius:28,borderBottomWidth:8,borderBottomColor:colors.red}, bottom:{position:'absolute',bottom:0,left:0,right:0,height:28,backgroundColor:colors.red,borderTopLeftRadius:28,borderTopRightRadius:28,borderTopWidth:8,borderTopColor:colors.green}, title:{fontSize:21,fontWeight:'900',marginTop:18,color:'#111'}, sub:{color:'#555',marginTop:4}, form:{width:'100%',marginTop:24}, label:{color:'#222',fontWeight:'700',marginTop:10}, row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:14}, remember:{color:'#555'}, link:{color:colors.red,fontWeight:'800'}, help:{marginTop:20,color:'#555'}, error:{color:colors.red,fontWeight:'800',marginTop:10} });
