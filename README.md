# Coração Gaúcho Admin

Painel administrativo em Expo/React Native integrado ao backend do Coração Gaúcho.

Produção web: https://gabriel.expo.app

O roteiro completo de hospedagem web, builds Android/iOS e atualizações OTA
está em [`docs/EXPO_DEPLOY.md`](docs/EXPO_DEPLOY.md).

## Requisitos

- Node.js 22.13.0 ou superior
- npm 10 ou superior
- Android Studio para emulador Android (opcional)
- Xcode em macOS para simulador iOS (opcional)

## Desenvolvimento local

Copie `.env.example` para `.env` e informe a URL da API:

```env
EXPO_PUBLIC_API_URL=http://localhost:3333/api
```

Na web use `localhost`; no emulador Android o app converte `localhost` para `10.0.2.2` automaticamente. Em dispositivo físico, use o IP da máquina na rede local. Para builds distribuídos, use obrigatoriamente uma API HTTPS acessível pela internet.

```bash
npm install
npx expo start
```

Comandos de qualidade:

```bash
npm run typecheck
npm run lint
npm run doctor
npm run validate
```

## EAS Build

Instale a CLI e autentique sua conta Expo:

```bash
npm install --global eas-cli
eas login
```

No primeiro uso, vincule o projeto à conta Expo. O EAS poderá fazer isso automaticamente ao iniciar o primeiro build ou explicitamente com:

```bash
eas init
```

Cadastre `EXPO_PUBLIC_API_URL` nos ambientes `preview` e `production` do EAS, usando a URL HTTPS correspondente:

```bash
eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value https://api-preview.exemplo.com/api --visibility plaintext
eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://api.exemplo.com/api --visibility plaintext
```

Gere o APK interno de homologação:

```bash
eas build --platform android --profile preview
```

Depois da homologação, gere o Android App Bundle para a Play Store:

```bash
eas build --platform android --profile production
```

O perfil `production` usa versionamento remoto e incrementa o número de versão automaticamente. O EAS pode gerar e armazenar a chave Android na primeira execução. A publicação na Play Store exige conta de desenvolvedor e credenciais próprias.

## Autenticação

A autenticação usa Better Auth em `/api/auth/sign-in/email`, sem fallback administrativo mock. O usuário inicial é definido no seed do backend; credenciais não ficam gravadas no aplicativo. Tokens são armazenados no SecureStore em Android/iOS. Na web, a sessão também utiliza os cookies enviados pelo backend.
