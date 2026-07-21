# Publicacao com Expo e EAS

## Estado do projeto

O app ja esta vinculado ao projeto Expo `@techgards-team/gabriel`, ID
`c1cb189c-e22d-4fb9-99da-fbc8e95bd079`. Nao e necessario criar ou importar
outro projeto. A conta que publicar precisa participar da organizacao
`techgards-team`.

O mesmo codigo gera:

- painel web estatico, hospedavel no EAS Hosting;
- APK Android interno para homologacao;
- AAB Android para a Play Store;
- build iOS interno ou para TestFlight/App Store;
- atualizacoes OTA dos bundles JavaScript nos canais `preview` e `production`.

## Web

Validar e publicar em producao:

```bash
npm run validate
npm test
npm run deploy:web:production
```

Depois do primeiro deploy, cadastrar o dominio `https://<projeto>.expo.app` no
CORS e nas origens confiaveis da autenticacao do backend. Camera no navegador
exige HTTPS, fornecido pelo EAS Hosting.

## Android

```bash
npm run build:android:preview
npm run build:android:production
```

O perfil `preview` gera APK instalavel diretamente. O perfil `production` gera
AAB para a Play Store.

## iPhone e iPad

Para testar rapidamente sem distribuir um binario proprio, instalar o Expo Go
no iPhone e abrir o projeto iniciado por `npm start`. Esse caminho serve para
desenvolvimento, nao para a operacao final de um baile.

Um aplicativo iOS proprio precisa de uma inscricao ativa no Apple Developer
Program. Para distribuicao interna, registrar o aparelho e gerar o build:

```bash
eas device:create
npm run build:ios:preview
```

Para TestFlight ou App Store:

```bash
npm run build:ios:production
eas submit --platform ios --profile production
```

O EAS executa o build iOS na nuvem mesmo quando o comando e iniciado no
Windows. Durante o primeiro build, ele solicita o Apple ID, o time Apple e a
criacao ou selecao dos certificados e perfis de provisionamento.

## Atualizacoes OTA

Alteracoes apenas em JavaScript, TypeScript e assets podem ser publicadas sem
novo binario. Alteracoes em permissoes, plugins ou dependencias nativas exigem
novo build.

```bash
npm run update:preview -- --message "Descricao da versao"
npm run update:production -- --message "Descricao da versao"
```

## Dados e acessos necessarios

1. Acesso definitivo a organizacao Expo `techgards-team`.
2. Confirmacao do nome, slug e identificadores `br.com.coracaogaucho.admin`.
3. Conta Apple Developer e acesso ao App Store Connect para iOS distribuivel.
4. Conta Google Play Console para publicar o AAB Android.
5. Acesso ao backend para cadastrar o dominio web no CORS/trusted origins.
6. Confirmacao de que `https://backend-coracaogaucho.vercel.app/api` e a API de producao.

Variaveis com prefixo `EXPO_PUBLIC_` ficam embutidas no aplicativo. Elas podem
conter URLs e flags publicas, mas nunca senhas, tokens privados ou chaves
secretas.

## Antes de usar em um baile

- Fazer teste de carga e garantir validacao atomica/idempotente no backend.
- Testar camera, flash, sessao e rede em aparelhos reais.
- Definir um procedimento para queda de internet. O scanner atual e online e
  depende da API para cada leitura.
- Levar uma segunda conexao e aparelhos reserva ate existir modo offline com
  sincronizacao e resolucao de conflitos.
