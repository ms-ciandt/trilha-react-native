# Design System — Trilha React Native

Referência visual completa para toda a plataforma: home, navbar, páginas internas e módulos de conteúdo. Qualquer nova página ou refactor deve seguir este guia.

---

## Princípios

- **Tecnológico e sofisticado** — grid sutil, glows contidos, tipografia forte, animações com propósito
- **Dark-first** — o dark mode é o modo principal; light mode deve ser igualmente cuidado
- **Hierarquia clara** — badge → título → descrição → ação (nessa ordem, sempre)
- **Identidade por cor** — cada trilha/módulo tem sua cor, aplicada consistentemente em bordas, glows, badges e botões
- **Sem ruído** — menos elementos, mais impacto. Cada item na tela deve ganhar espaço

---

## Paleta de identidade

| Elemento | Cor principal | Uso |
|---|---|---|
| Introdução | `var(--ifm-color-primary)` (azul do tema) | borda, glow, badge, botão |
| Trilha Web | `#059669` (emerald-600) | borda, glow, badge, botão |
| Trilha Nativo | `#d97706` (amber-600) | borda, glow, badge, botão |
| React Native (goal) | `#2563eb` → `#7c3aed` (gradient) | título gradient, borda, glow duplo |
| Masterclass | `#f59e0b` (amber) + `#00d4ff` (cyan) | borda dashed dourada, glow dourado + cyan |
| Hero / títulos | gradient `#2563eb` → `#7c3aed` (light) / `#60a5fa` → `#a78bfa` (dark) | sempre gradient |

### Escala de tons dark mode

```css
/* light */
#2563eb  /* blue-600  */
#059669  /* emerald-600 */
#d97706  /* amber-600 */
#7c3aed  /* violet-600 */

/* dark — versões mais claras para contraste */
#60a5fa  /* blue-400  */
#34d399  /* emerald-400 */
#fbbf24  /* amber-400 */
#a78bfa  /* violet-400 */
```

---

## Navbar

### Estrutura
- **Esquerda:** logo + título "Trilha React Native" (link para home)
- **Direita:** About · locale dropdown · GitHub · dark mode toggle
- As trilhas **não ficam** no navbar — estão na home e na sidebar

### Estilo
```css
.navbar {
  padding: 0 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Título com gradient */
.navbar__title {
  font-weight: 800;
  font-size: 1.05rem;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

[data-theme='dark'] .navbar__title {
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## Fundo de página

Toda página `src/pages/` usa o grid sutil:

```jsx
function GridBackground() {
  return <div className={styles.grid} aria-hidden="true" />;
}
```

```css
.grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--ifm-color-emphasis-200) 1px, transparent 1px),
    linear-gradient(to bottom, var(--ifm-color-emphasis-200) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 100%);
  opacity: 0.5;
  pointer-events: none;
}
[data-theme='dark'] .grid { opacity: 0.18; }
```

---

## Anatomia de um card

```
┌──────────────────────────────┐  ← border 1px solid, border-radius 16px
│ [Badge]          [glow blob] │  ← badge absoluto topo-direita, glow no canto
│                              │
│ Título                       │  ← font-size 1.125rem, font-weight 700
│ Descrição curta              │  ← font-size 0.875rem, color emphasis-600
│                              │
│ [ Botão ]                    │  ← pill, align-self flex-start
└──────────────────────────────┘
```

### Hover
- `transform: translateY(-3px)` — lift
- `box-shadow` com cor de identidade a 15% opacidade
- `border-color` → cor de identidade
- glow blob: 12% → 25% opacidade

### CSS base
```css
.card {
  position: relative;
  border: 1px solid var(--ifm-color-emphasis-200);
  border-radius: 16px;
  padding: 1.75rem 1.5rem;
  background: var(--ifm-background-surface-color);
  overflow: hidden;
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}
```

### Badge de categoria
```css
.badge {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: color-mix(in srgb, <cor> 12%, transparent);
  color: <cor>;
  border: 1px solid color-mix(in srgb, <cor> 30%, transparent);
}
```

### Glow blob
```css
.glow {
  position: absolute;
  top: -40px; right: -40px;
  width: 120px; height: 120px;
  border-radius: 50%;
  background: <cor>;
  filter: blur(30px);
  opacity: 0.12;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
.card:hover .glow { opacity: 0.25; }
```

---

## Botões

Sempre pill (`border-radius: 999px`), `font-size: 0.8125rem`, `font-weight: 600`.

| Variante | Uso |
|---|---|
| Sólido colorido | ação primária de cada trilha (cor de identidade) |
| Ghost neutro | ações secundárias (fundo transparente, borda `emphasis-300`) |

```css
/* Sólido */
.btn {
  display: inline-block;
  padding: 0.4rem 1.125rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff !important;
  text-decoration: none !important;
  background: <cor>;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.btn:hover {
  background: <cor-dark>;
  box-shadow: 0 4px 14px <cor-rgba-40%>;
  transform: translateY(-1px);
}
```

---

## Animações

### fadeUp — entrada padrão
```css
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
/* uso: animation: fadeUp 0.6s ease <delay> both; */
/* escalonar: +0.1s por elemento */
```

### fadeIn — elementos SVG/overlay
```css
@keyframes fadeIn {
  to { opacity: 1; }
}
/* uso: opacity: 0; animation: fadeIn 0.5s ease <delay> forwards; */
```

### pulse — dots de conexão
```css
@keyframes pulse {
  0%, 100% { opacity: 0.2; transform: scale(0.8); }
  50%       { opacity: 1;   transform: scale(1.1); }
}
```

---

## Setas do roadmap (estilo anotação)

Setas tracejadas orgânicas — SVG com `stroke-dasharray: 5 3`, `strokeLinecap: round`. Usadas na home para conectar etapas do roadmap.

```jsx
<svg viewBox="0 0 W H" fill="none">
  {/* curva principal */}
  <path
    d="M ..."
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeDasharray="5 3"
    fill="none"
  />
  {/* ponta da seta — dois arms simétricos em torno do ponto final */}
  <path
    d="M px py L ax ay M px py L bx by"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    fill="none"
  />
</svg>
```

**Regras:**
- Cor: `var(--ifm-color-emphasis-400)` — neutra, não compete com os cards
- Stem (segmento reto antes da ponta): mínimo 8–12px de gap após o tracejado
- Arms da ponta: simétricos em `y` em torno do ponto final (não assimétricos como `^`)
- Animação: `fadeIn` com delay após os cards

---

## Hero de página

```jsx
<header className={styles.hero}>
  <h1 className={styles.heroTitle}>Título Principal</h1>
  <p className={styles.heroSubtitle}>Subtítulo de uma linha</p>
</header>
```

```css
.heroTitle {
  font-size: 2.75rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
[data-theme='dark'] .heroTitle {
  background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.heroSubtitle {
  font-size: 1rem;
  color: var(--ifm-color-emphasis-600);
  margin: 0;
}
```

---

## Módulos de conteúdo (a implementar)

Quando formos refatorar o visual dentro dos módulos (páginas geradas pelo Docusaurus a partir dos `.md`), seguir estas diretrizes:

### Tipografia
- `h1`: `font-size: 1.875rem`, `font-weight: 700`, `letter-spacing: -0.02em`
- `h2`: `font-size: 1.25rem`, `font-weight: 600`, border-bottom `1px solid` com `ifm-toc-border-color`
- `h3`: `font-size: 1.05rem`

### Blocos de código
- Tema light: `prism-react-renderer/themes/github`
- Tema dark: `prism-react-renderer/themes/dracula`
- Border-radius: `8px`

### Tabelas comparativas (analogias Kotlin/Swift/Web → RN)
- Usar fundo alternado sutil por linha
- Cabeçalho com fundo `emphasis-100`

### Sidebar
- Categorias (módulos): `font-size: 0.75rem`, uppercase, `font-weight: 700`, cor primária
- Itens: `font-size: 0.875rem`, `border-radius` padrão

### Cores de identidade nos módulos
Quando um módulo da Trilha Web estiver aberto, a cor de acento (links ativos, headers, etc.) deve usar emerald (`#059669`). Para Trilha Nativo, amber (`#d97706`). **Ainda não implementado** — planejar via CSS custom properties sobrescritas por classe no `<html>` ou `<body>`.

---

## Sidebar

```css
.menu__link--sublist {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ifm-color-primary-dark);
  margin-top: 0.75rem;
}
[data-theme='dark'] .menu__link--sublist {
  color: var(--ifm-color-primary-light);
}
```

---

## i18n — obrigatório em toda nova página

O site suporta `en` (padrão) e `pt`. Toda página em `src/pages/` precisa de versão traduzida.

```
src/pages/
  minha-pagina.jsx              ← versão EN

i18n/pt/docusaurus-plugin-content-pages/
  minha-pagina.jsx              ← versão PT (mesma estrutura JSX, texto em PT)
```

**Regras:**
1. Criar em inglês primeiro
2. Duplicar em `i18n/pt/` com texto traduzido
3. Importar CSS com `@site/src/pages/minha-pagina.module.css`
4. Não traduzir: nomes próprios (React Native, JSI, Fabric), slugs, classes CSS

**Testar:**
```bash
npm run start -- --locale pt
```

---

## Referências de implementação

- Home page: `src/pages/index.jsx` + `src/pages/index.module.css`
- Tokens de cor e navbar: `src/css/custom.css`
- Config i18n + navbar: `docusaurus.config.js`
- Sidebar: `sidebars.js`
