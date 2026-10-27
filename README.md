# Fnaf de IA

Jogo de terror no navegador (e APK), com dois modos:

- **New Game / Continue** — FNAF clássico em imagens: portas, luzes, câmeras com mapa clicável, energia, noites 1–5.
- **Multiplayer** — cria ou entra numa sala e todos caem na pizzaria 3D: andar livre, animatrônicos que patrulham, portas, câmeras, energia e Foxy que corre.

A capa é a imagem `web/img/titulo.jpg`; os botões são invisíveis e ficam em cima de "New Game", "Continue" e "Multiplayer" (`web/css/fnaf-de-ia.css`, `web/js/fnaf-title.js`).

## Jogar no navegador
- GitHub Pages: o workflow `pages.yml` publica a pasta `web/` (em repositório privado exige plano pago do GitHub).
- Local: `cd web && python3 -m http.server 8000` e abra http://localhost:8000.

## Controles no PC
| Onde | Tecla |
|---|---|
| Capa | N / Enter / 1 = New Game · C / 2 = Continue · M / 3 = Multiplayer |
| Clássico | A / D portas · Z / X luz (segurar) · W câmeras · Q / E trocar câmera · ← / → olhar de lado · Esc sair |
| Pizzaria | WASD andar · mouse/setas olhar · J / L portas · K câmeras · ← / → trocar câmera · Esc pausa |

No celular, os mesmos botões aparecem na tela.

## APK
Cada push gera um APK (workflow `build.yml`) e o publica em **Releases**.

## Multiplayer
O servidor de salas está em `server/` (Cloudflare Workers + Durable Objects); o endereço fica em `web/js/mpconfig.js`.

## Testes
`node tests/smoke.js` abre o jogo num Chromium sem tela e confere capa, clássico, sala, andar na pizzaria e sair.

> O motor vem do jogo Elemental World; os arquivos não usados pelo FNAF continuam na pasta `web/js` porque a pizzaria 3D roda em cima dele.
