import { PropsWithChildren } from 'react';
import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111111" />
        <meta name="application-name" content="Coração Gaúcho Admin" />
        <meta name="description" content="Painel administrativo e scanner de ingressos do Coração Gaúcho." />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Coração Gaúcho" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:site_name" content="Coração Gaúcho" />
        <meta property="og:title" content="Coração Gaúcho Admin" />
        <meta property="og:description" content="Painel administrativo e scanner de ingressos do Coração Gaúcho." />
        <meta property="og:url" content="https://gabriel.expo.app" />
        <meta property="og:image" content="https://gabriel.expo.app/logo-coracao-gaucho.png" />
        <meta property="og:image:width" content="1024" />
        <meta property="og:image:height" content="1024" />
        <meta property="og:image:alt" content="Logo do Coração Gaúcho" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Coração Gaúcho Admin" />
        <meta name="twitter:description" content="Painel administrativo e scanner de ingressos do Coração Gaúcho." />
        <meta name="twitter:image" content="https://gabriel.expo.app/logo-coracao-gaucho.png" />
        <title>Coração Gaúcho Admin</title>
        <link rel="canonical" href="https://gabriel.expo.app" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #root {
            width: 100%;
            max-width: 100%;
            height: 100%;
            min-height: 100%;
            overflow-x: hidden;
            overscroll-behavior-x: none;
            background: #111111;
          }
          html { background: #111111; }
          body {
            box-sizing: border-box;
            margin: 0;
            padding-top: 0;
            padding-right: 0;
            padding-bottom: 0;
            padding-left: 0;
            background: #111111;
          }
          #root { min-width: 0; }
          @supports (height: 100dvh) {
            html, body, #root { height: 100dvh; min-height: 100dvh; }
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
