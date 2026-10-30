# Roteiros de narração prontos — 00_welcome e 03_choose_track

Arquivo de controle, não é conteúdo do curso — pode apagar depois de usar.

Gerado em 2026-09-28. Motivo: o NotebookLM, quando gera narração livremente a partir do `.md`, tem
inventado tom hostil que não existe no arquivo-fonte (confirmado por transcrição real via
Whisper/faster-whisper em `/tmp/transcribe-check/`, comparando os `.mp4` publicados no release
`v0-videos` e os gerados no Desktop em 2026-09-28 contra as legendas do repo).

**Achados da verificação (MD5 + transcrição real):**
- `00_welcome.mp4` (release, MD5 `bc2c1826...`) e `00-welcome.mp4` (gerado no Desktop, mesmo MD5)
  são o MESMO arquivo — narra "auditoria de stack para escolher trilha", não é mensagem de boas-vindas.
  Contém: "you will hit a wall immediately", "a poor use of time", "actively detrimental if you lack
  that specific background", "Attempting this path without strong fundamentals is a mistake... critical gaps".
- `03_choose_track.mp4` (release, MD5 `132c15d3...`) e `03-choose.mp4` (gerado no Desktop, MD5
  `9f44d0bf...`) são DOIS roteiros diferentes entre si, ambos hostis. O do release contém "bored to
  tears", "completely lost", "wasting hours on a generic tutorial", "Senior engineers trade the safety
  of pure JavaScript for the high complexity...". O gerado no Desktop contém "wasting incredibly
  valuable time", "this material will punish you", "wasting time stroking your own ego", "ruthlessly
  acknowledge what you do not know".
- `01_history_architecture.mp4` já está correto e publicado (corrigido nesta mesma sessão anterior).

**Instrução de uso**: cole o roteiro correspondente (EN ou PT-BR) diretamente no NotebookLM como texto-fonte
para narração — não deixe o NotebookLM ler o `.md` e dramatizar por conta própria.

---

## 1. `00_welcome` — mensagem de boas-vindas real

Baseado em `docs/introducao/00-welcome.md`.

### EN

Welcome to React Native Academy.

This course is built for developers who already know how to build and ship software — you won't find lessons explaining what a variable is or how a loop works. Instead, we start from where you already stand, and get you to production-ready React Native as directly as possible.

React Native today is a serious, high-performance choice for building mobile applications. With the New Architecture — JSI, Fabric, and TurboModules — running on Hermes, apps built with React Native can match native performance while sharing a single TypeScript codebase across iOS and Android.

This academy offers four trails, and they all converge on the same destination: strong, practical React Native skills.

If you build for Android with Kotlin and Jetpack Compose, the Android Trail maps your existing knowledge of Activities, Fragments, and the Android lifecycle directly onto React Native concepts.

If you build for iOS with Swift and SwiftUI, the iOS Trail does the same with ViewControllers, AppDelegate, and the iOS lifecycle you already know.

If you build for the web with React, the Web Trail takes your hooks, JSX, and component patterns and shows you how they transfer to mobile — plus what changes: layout, native APIs, and platform constraints.

And if you already have React Native fundamentals under your belt, the Masterclass goes straight into the New Architecture, brownfield integration, performance, and CI/CD — no basics, no repetition.

By the end of this course, you'll understand why React Native is a serious production choice in 2026, read and write TypeScript fluently in a mobile context, build screens with React Native's core components and Flexbox layout, navigate between screens with React Navigation, call native platform APIs like camera, location, and storage, and ship to both iOS and Android from one codebase.

Every code example runs instantly in Expo Snack, right in your browser — no simulator or terminal setup needed to get started. You'll move to a full local setup later, when it's time to build for production.

Whichever trail matches your background, the goal is the same: use what you already know as your starting point, and spend your time on what's actually new to you.

Your next step is the History & Architecture module — it explains why React Native looks the way it does today, before you pick your trail and dive in.

Welcome aboard.

### PT-BR

Bem-vindo à React Native Academy.

Este curso foi feito para desenvolvedores que já sabem construir e entregar software — você não vai encontrar aulas explicando o que é uma variável ou como funciona um loop. Em vez disso, começamos de onde você já está, e te levamos para o React Native pronto para produção da forma mais direta possível.

Hoje, o React Native é uma escolha séria e de alta performance para construir aplicações mobile. Com a New Architecture — JSI, Fabric e TurboModules — rodando sobre o Hermes, aplicações React Native conseguem alcançar performance nativa compartilhando uma única base de código TypeScript entre iOS e Android.

Esta academia oferece quatro trilhas, e todas convergem para o mesmo destino: habilidades sólidas e práticas em React Native.

Se você desenvolve para Android com Kotlin e Jetpack Compose, a Trilha Android mapeia diretamente o que você já sabe sobre Activities, Fragments e o ciclo de vida do Android para os conceitos do React Native.

Se você desenvolve para iOS com Swift e SwiftUI, a Trilha iOS faz o mesmo com ViewControllers, AppDelegate e o ciclo de vida do iOS que você já domina.

Se você desenvolve para a web com React, a Trilha Web aproveita seus hooks, JSX e padrões de componentes, mostrando como eles se transferem para mobile — e o que muda: layout, APIs nativas e restrições de plataforma.

E se você já tem os fundamentos de React Native, a Masterclass vai direto para a New Architecture, integração brownfield, performance e CI/CD — sem básico, sem repetição.

Ao final deste curso, você vai entender por que o React Native é uma escolha séria de produção em 2026, ler e escrever TypeScript fluentemente em contexto mobile, construir telas com os componentes nativos do React Native e layout Flexbox, navegar entre telas com React Navigation, chamar APIs nativas da plataforma como câmera, localização e armazenamento, e publicar para iOS e Android a partir de uma única base de código.

Todo exemplo de código roda instantaneamente no Expo Snack, direto no seu navegador — sem precisar configurar simulador ou terminal para começar. Você vai migrar para um ambiente local completo mais adiante, quando for a hora de construir para produção.

Qualquer que seja a trilha que combine com o seu perfil, o objetivo é o mesmo: usar o que você já sabe como ponto de partida, e investir seu tempo no que realmente é novo para você.

Seu próximo passo é o módulo de História & Arquitetura — ele explica por que o React Native é do jeito que é hoje, antes de você escolher sua trilha e mergulhar de cabeça.

Seja bem-vindo.

---

## 2. `03_choose_track` — guia de escolha de trilha

Baseado em `docs/introducao/03-choose-your-track.md`.

### EN

Choosing the right trail is simple: start from the tech stack you already use every day, and let that decide where you begin.

If you write Kotlin and work with Jetpack Compose, the Android Trail is for you. You already understand thread safety, native rendering, and how platform APIs talk to hardware. Your learning curve here is JavaScript, TypeScript, and React's component model — everything else, you already have a head start on.

If you write Swift and work with SwiftUI, the iOS Trail is your path. You already understand UIKit and SwiftUI rendering, the iOS lifecycle, and Xcode tooling. Just like the Android Trail, your main learning curve is JavaScript, TypeScript, and React's component model.

If you build with React and JavaScript for the web, the Web Trail is the natural fit. React Native components work exactly like the React components you already write — hooks, JSX, and your component patterns transfer directly. Your learning curve is the mobile mindset: layout with Flexbox instead of CSS, platform constraints, and native APIs.

And if you already know React Native fundamentals and want to go deeper, the Masterclass covers brownfield integration, TurboModules, Fabric, JSI, performance profiling, CI/CD pipelines, and upgrade strategies — all built on the New Architecture.

There's no wrong door here. Each trail is designed to take the knowledge you already have and turn it into React Native fluency as efficiently as possible. Pick the trail that matches your daily stack, and start building.

### PT-BR

Escolher a trilha certa é simples: parta da stack que você já usa no dia a dia, e deixe que ela defina seu ponto de partida.

Se você escreve Kotlin e trabalha com Jetpack Compose, a Trilha Android é para você. Você já entende thread safety, renderização nativa e como as APIs de plataforma conversam com o hardware. Sua curva de aprendizado aqui é JavaScript, TypeScript e o modelo de componentes do React — o resto, você já sai na frente.

Se você escreve Swift e trabalha com SwiftUI, a Trilha iOS é o seu caminho. Você já entende a renderização do UIKit e do SwiftUI, o ciclo de vida do iOS e as ferramentas do Xcode. Assim como na Trilha Android, sua principal curva de aprendizado é JavaScript, TypeScript e o modelo de componentes do React.

Se você constrói com React e JavaScript para a web, a Trilha Web é o encaixe natural. Os componentes do React Native funcionam exatamente como os componentes React que você já escreve — hooks, JSX e seus padrões de componentes se transferem diretamente. Sua curva de aprendizado é a mentalidade mobile: layout com Flexbox em vez de CSS, restrições de plataforma e APIs nativas.

E se você já conhece os fundamentos do React Native e quer ir mais fundo, a Masterclass cobre integração brownfield, TurboModules, Fabric, JSI, profiling de performance, pipelines de CI/CD e estratégias de upgrade — tudo construído sobre a New Architecture.

Não existe porta errada aqui. Cada trilha foi desenhada para pegar o conhecimento que você já tem e transformá-lo em fluência em React Native da forma mais eficiente possível. Escolha a trilha que combina com sua stack do dia a dia, e comece a construir.

---

## Fluxo para cada vídeo

1. Copiar o roteiro (EN ou PT-BR) acima, colar diretamente no NotebookLM como texto-fonte para narração.
2. Gerar áudio/vídeo.
3. **Antes de aceitar o resultado**: rodar a transcrição real do áudio gerado (não confiar na legenda que o
   NotebookLM oferece) e conferir contra o roteiro. Comando de referência usado nesta verificação:
   `faster-whisper` (modelo `small`, `language="en"`) sobre o `.mp4` bruto.
4. Rodar `/integrar-videos` para subir via `gh release upload` (mesmo nome de arquivo sobrescreve o
   atual no release `v0-videos`) e atualizar os `.vtt`.
5. Marcar como concluído em `VIDEOS_PARA_GERAR.md`.
