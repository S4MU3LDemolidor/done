# Done ✦

App de tarefas 100% local para macOS, com barra de adição rápida estilo Raycast.

- **⌥ Espaço** abre a barra flutuante em qualquer lugar: digite `limpar casa, sexta, casa` e aperte Enter.
- A janela principal mostra Hoje, Grupos, Agenda, Concluídas e Perfil — com XP, níveis, sequência 🔥 e conquistas.
- Cada tarefa é um arquivo `.json` em `~/FocusBar/tasks/`. Sem conta, sem nuvem, funciona offline para sempre.

## Rodar em desenvolvimento

Pré-requisitos: Node 20+, Rust (instale com `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`).

```bash
npm install
npm run tauri dev
```

## Gerar o app (.app)

```bash
npm run tauri build
```

## Testes

```bash
npm test
```

Cobrem o parser de linguagem natural em PT-BR (`dd/mm`, `dd/mm/yyyy`, `hoje`,
`amanhã`, dias da semana) e a lógica de XP, níveis, sequência e conquistas.

## Ícone

O ícone vem de `app-icon.svg` (desenhado no design system do app). Para
regenerar todos os formatos depois de editar o SVG:

```bash
node -e "require('sharp')('app-icon.svg',{density:144}).resize(1024,1024).png().toFile('app-icon.png')"
npx tauri icon app-icon.png
```

## Estrutura

| Caminho | O que é |
|---|---|
| `src/lib/parser.ts` | Parser do texto livre → título, data, grupo |
| `src/lib/game.ts` | XP, níveis, sequência, conquistas (funções puras) |
| `src/lib/store.ts` | Leitura/escrita dos `.json` + observador da pasta |
| `src/windows/QuickAdd.tsx` | Barra flutuante (⌥ Espaço) |
| `src/windows/main/` | Janela principal (views, sidebar, toasts, perfil) |
| `src-tauri/` | Shell nativo: atalho global, janelas, escopo de arquivos |
| `docs/superpowers/specs/` | Documento de design |

## Dados

- Tarefas: `~/FocusBar/tasks/<uuid>.json`
- Conquistas: `~/FocusBar/achievements.json`

Apague a pasta `~/FocusBar` para recomeçar do zero.
