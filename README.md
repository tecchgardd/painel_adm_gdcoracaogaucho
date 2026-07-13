# Coração Gaúcho Admin

Painel administrativo Expo/React Native integrado ao backend real.

## Configuração

Copie `.env.example` para `.env` e configure `EXPO_PUBLIC_API_URL`. Use `http://localhost:3333/api` na web, `http://10.0.2.2:3333/api` no emulador Android ou o IP local do computador em um dispositivo físico.

## Comandos

```bash
npm install
npm run start
npm run web
npm run typecheck
npm run lint
```

A autenticação utiliza Better Auth em `/api/auth/sign-in/email`, sem fallback administrativo mock. O usuário inicial é definido pelas variáveis `ADMIN_EMAIL` e `ADMIN_PASSWORD` do backend durante o seed; credenciais não ficam gravadas na tela.

Tokens são armazenados no SecureStore em Android/iOS. Na web, a sessão também utiliza os cookies enviados pelo backend.
