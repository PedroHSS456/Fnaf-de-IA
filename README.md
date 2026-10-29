# Fnaf de IA

Jogo de terror no navegador (e APK), com dois modos:

- **New Game / Continue** — FNAF clássico em imagens: portas, luzes, câmeras com mapa clicável, energia, noites 1–5.
- **Multiplayer** — cria ou entra numa sala e todos caem na pizzaria 3D: andar livre numa pizzaria grande (salão, cozinha, bastidores, depósito, banheiros, cinema, fliperama, garagem), animatrônicos que patrulham, portas, câmeras, energia e Foxy que corre.

A capa é a imagem `web/img/titulo.jpg`; os botões são invisíveis e ficam em cima de "New Game", "Continue" e "Multiplayer" (`web/css/fnaf-de-ia.css`, `web/js/fnaf-title.js`).

## Jogar no navegador
- GitHub Pages: o workflow `pages.yml` publica a pasta `web/` (em repositório privado exige plano pago do GitHub).
- Local: `cd web && python3 -m http.server 8000` e abra http://localhost:8000.

## Controles no PC
| Onde | Tecla |
|---|---|
| Capa | N / Enter / 1 = New Game · C / 2 = Continue · M / 3 = Multiplayer |
| Clássico | A / D portas · Z / X luz (segurar) · W câmeras · Q / E trocar câmera · ← / → olhar de lado · Esc sair |
| Pizzaria | WASD andar · Shift trava o mouse (como no Roblox) e ele gira a câmera · setas olhar · J / L portas (só perto do painel da porta) · K câmeras · ← / → trocar câmera · botão SAIR · Esc pausa |

No celular, os mesmos botões aparecem na tela.

## APK
Cada push gera um APK (workflow `build.yml`) e o publica em **Releases**.

## Multiplayer
O servidor de salas está em `server/` (Cloudflare Workers + Durable Objects); o endereço fica em `web/js/mpconfig.js`.

## Testes
`node tests/smoke.js` abre o jogo num Chromium sem tela e confere capa, clássico, sala, andar na pizzaria e sair.

> O motor vem do jogo Elemental World; os arquivos não usados pelo FNAF continuam na pasta `web/js` porque a pizzaria 3D roda em cima dele.

## Noites e reanimação (multiplayer)
- Na tela de salas, escolha **FNAF 1** e a **noite**. A Noite 1 já vem liberada; concluir uma noite (6 da manhã) libera a próxima. Cada sala carrega a noite escolhida por quem a criou (aparece como "· N3" no nome).
- Cada noite deixa os animatrônicos mais rápidos, mais ativos e mais espertos (enxergam de mais longe, perseguem por mais tempo, miram mais o escritório; a Raposa corre com mais frequência).
- Quando um animatrônico pega você, você cai: seu corpo fica no chão, marcado em vermelho, e você pode olhar as câmeras. Um colega vivo chega perto do corpo e **segura REANIMAR** (botão na tela ou tecla **E**) por 4 segundos. Quem é reanimado levanta com 3 segundos de proteção. Quem pegou volta para o palco.
- Se todos caírem, ou o único jogador da sala cair, a noite acaba e é preciso recomeçar.
