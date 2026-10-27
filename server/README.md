# Servidor de salas — Elemental World

Cloudflare Workers + Durable Objects. Cada sala é um Durable Object; uma lista de salas fica em outro.
Não guarda progresso: só repassa posição, aparência e nome entre os jogadores de cada sala.

## Publicar (uma vez)

Na pasta `server/`, com Node.js 18+ instalado e uma conta gratuita no Cloudflare Workers:

    npm install
    npx wrangler login
    npx wrangler deploy

O `deploy` mostra a URL do servidor, algo como `https://elemental-world-mp.SEU-USUARIO.workers.dev`.
Troque `https://` por `wss://` e cole em `web/js/mpconfig.js`, em `window.MP_SERVER`.

## Testes (sem conta)

    npm test

## Limites
- Plano gratuito do Workers: Durable Objects com SQLite são gratuitos, com cota diária de uso.
- Máximo de 8 jogadores por sala e 200 salas abertas.
- Limite de 25 mensagens por segundo por conexão.
