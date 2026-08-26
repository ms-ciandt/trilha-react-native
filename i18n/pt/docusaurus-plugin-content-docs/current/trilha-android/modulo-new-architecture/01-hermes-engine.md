---
title: "Hermes: O Motor JavaScript para Android"
sidebar_label: "Hermes Engine"
sidebar_position: 1
---

## Video Overview

<video width="100%" controls>
  <source src="https://github.com/ms-ciandt/trilha-react-native/releases/download/v0-videos/na_01_hermes.mp4" type="video/mp4">
  <track kind="captions" src="/trilha-react-native/assets/captions/trilha_android/na_01_hermes.vtt" srclang="pt" label="Português" default>
  Seu navegador não suporta o elemento de vídeo.
</video>

## O Que é o Hermes — e Por Que o Android Tem Mais Benefício

O React Native 0.70+ usa o Hermes como **motor JavaScript padrão** em Android e iOS. No Android, os ganhos são mais dramáticos porque o motor anterior — JavaScriptCore (JSC) — nunca foi otimizado para mobile.

O Hermes não é um motor JS de propósito geral. Foi criado pela Meta especificamente para **React Native em mobile**: inicialização rápida, baixo consumo de memória e binário pequeno. Ele faz isso pré-compilando JavaScript para bytecode no **momento do build**, não em tempo de execução.

---

## O Modelo de Compilação: Hermes vs ART

Como desenvolvedor Android você já conhece compilação ahead-of-time. O Hermes aplica o mesmo princípio ao JavaScript.

| Estágio | ART (app Kotlin) | Hermes (React Native) |
|---------|------------------|-----------------------|
| Fonte | arquivos `.kt` | arquivos `.ts` / `.tsx` |
| Compilação | `kotlinc` → `.class` → `dex` (build time) | Metro bundler + `hermesc` → bytecode `.hbc` (build time) |
| No dispositivo | Executa DEX pré-compilado | Executa bytecode `.hbc` pré-compilado |
| JIT | ART faz perfil de métodos quentes e JIT-compila | Hermes **não usa JIT** — interpreta bytecode puro |
| Inicialização | Rápida — sem penalidade de warmup JIT | Rápida — bytecode carregado diretamente, sem fase de parse |

A diferença crítica em relação ao JSC: **o JSC faz parse e compila o JavaScript na inicialização do app**. Em um dispositivo Android de entrada, isso pode levar centenas de milissegundos antes do primeiro frame ser renderizado. O Hermes embute o bytecode pré-compilado no APK — o motor pula direto para a execução.

---

## Bytecode do Hermes: O Que Está no APK

Quando você executa `npx react-native build-android` (ou `eas build`), o Metro empacota seu JavaScript e o `hermesc` compila para Hermes Bytecode (`index.android.bundle` é na verdade formato `.hbc` quando o Hermes está habilitado).

Você pode inspecioná-lo:

```bash
# Verificar se o bundle é bytecode Hermes
file android/app/src/main/assets/index.android.bundle
# Com Hermes: "Hermes JavaScript bytecode, version 96"
# Sem Hermes: "ASCII text"
```

O bytecode é aproximadamente 20-30% menor que o JavaScript equivalente e carrega significativamente mais rápido no cold start.

---

## Verificando se o Hermes Está Ativo

No seu app React Native em tempo de execução:

```tsx
import { HermesInternal } from 'react-native';

const isHermes = () => !!global.HermesInternal;

function DebugInfo() {
  return (
    <Text>
      Motor: {isHermes() ? 'Hermes' : 'JavaScriptCore'}
    </Text>
  );
}
```

No `android/app/build.gradle` (React Native 0.70+):

```gradle
project.ext.react = [
    hermesEnabled: true,  // padrão — defina false apenas para depurar problemas específicos do JSC
]
```

Para a New Architecture (padrão no RN 0.76+), o Hermes é obrigatório. Não é possível usar JSC com a New Architecture.

---

## Modelo de Memória: Como o Hermes Gerencia o Heap JS

O Hermes usa um coletor de lixo geracional ajustado para mobile:

- **Geração jovem**: alocações de curta duração (maioria das atualizações de estado React, valores intermediários). Coletada frequentemente com baixos tempos de pausa.
- **Geração antiga**: objetos de longa duração (cache de módulos, estado persistente). Coletada com menos frequência.
- **Sem GC concorrente**: o GC do Hermes roda na thread JS. As pausas são curtas (tipicamente < 5ms) mas são stop-the-world.

### O Que Isso Significa para Seu App

```tsx
// RUIM — cria novo objeto a cada render, pressiona o GC da geração jovem
function List({ items }) {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={{ padding: 16, margin: 8 }}> {/* novo objeto a cada render */}
          <Text>{item.name}</Text>
        </View>
      )}
    />
  );
}

// BOM — StyleSheet.create envia estilos ao nativo uma vez, sem pressão no GC
const styles = StyleSheet.create({
  row: { padding: 16, margin: 8 },
});

function List({ items }) {
  return (
    <FlatList
      data={items}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text>{item.name}</Text>
        </View>
      )}
    />
  );
}
```

---

## Hermes e o Chrome Debugger

Quando você conecta o Chrome DevTools a um app React Native usando Hermes, o motor expõe um endpoint **Chrome DevTools Protocol (CDP)** diretamente — sem proxy no RN 0.73+.

### Conectando

1. Inicie seu app em modo de desenvolvimento
2. Abra o Chrome e vá para `chrome://inspect`
3. Seu app aparece em "Remote Target" — clique em **Inspect**

Ou via React Native DevTools (integrado desde RN 0.76):

```bash
npx react-native start
# Pressione 'j' no terminal do Metro para abrir o depurador JS
```

### O Que Você Pode Fazer

- Definir breakpoints em código TypeScript (source maps são gerados automaticamente)
- Inspecionar a call stack através de limites `await` assíncronos
- Fazer perfil de CPU com a aba Performance
- Inspecionar memória com a aba Memory — tirar snapshots do heap, encontrar vazamentos

---

## Profiling do Hermes: Encontrando Problemas de Performance JS

O Hermes tem um profiler de amostragem integrado que produz traces compatíveis com a aba Performance do Chrome.

### Método 1 — Do app (build de desenvolvimento)

```tsx
import { HermesInternal } from 'react-native';

function startProfiling() {
  if (HermesInternal?.enableSamplingProfiler) {
    HermesInternal.enableSamplingProfiler();
  }
}

function stopProfiling() {
  if (HermesInternal?.disableSamplingProfiler) {
    // Grava o perfil em /sdcard/sampling-profiler-trace.cpuprofile
    HermesInternal.disableSamplingProfiler();
  }
}
```

Copie o arquivo do dispositivo:

```bash
adb pull /sdcard/sampling-profiler-trace.cpuprofile ./profile.cpuprofile
```

Abra no Chrome DevTools → Performance → Load Profile.

### Método 2 — Via Flipper (plugin Hermes Debugger)

O plugin Hermes Debugger do Flipper envolve a conexão CDP e oferece profiling com um clique sem gerenciamento manual de arquivos. Coberto no tópico de Debugging.

---

## Limitações do Hermes: O Que Ele Não Suporta

O Hermes omite intencionalmente recursos caros em mobile:

| Recurso | Status | Alternativa |
|---------|--------|-------------|
| `eval()` | Desabilitado por padrão | Evitar — risco de segurança de qualquer forma |
| Construtor `Function()` | Desabilitado | Use funções regulares |
| Objetos Proxy | Suportado desde Hermes 0.9 | — |
| WeakRef | Suportado | — |
| Declaração `with` | Não suportado | Não usar |
| Grupos nomeados em regex | Suportado | — |
| BigInt | Suportado desde RN 0.70 | — |

Se uma biblioteca de terceiros usa `eval()` e quebra com Hermes, ela precisa ser substituída ou corrigida — a biblioteca não é segura para mobile.

---

## Impacto no Cold Start: Números Reais

Um app React Native típico em um dispositivo Android intermediário (Snapdragon 680, 4GB RAM):

| Cenário | JSC (padrão antigo) | Hermes |
|---------|---------------------|--------|
| Tempo de parse do bundle | ~400ms | 0ms (pré-compilado) |
| Tempo até o primeiro frame | ~1400ms | ~800ms |
| Heap JS em idle | ~35MB | ~18MB |
| Impacto no tamanho do APK | baseline | +2MB (hermesc incluído) |

A melhoria de 600ms no cold start é o maior ganho da New Architecture para usuários finais no Android.

---

## Materiais de Estudo

### Documentação Oficial

- [React Native — Using Hermes](https://reactnative.dev/docs/hermes)
- [Hermes — GitHub](https://github.com/facebook/hermes)
- [Hermes — Bytecode File Format](https://github.com/facebook/hermes/blob/main/doc/BytecodeFileFormat.md)

### Aprofundamento

- [Engineering at Meta — Hermes: An open source JavaScript engine optimised for React Native](https://engineering.fb.com/2019/07/12/android/hermes/)
- [Callstack — Hermes performance analysis](https://www.callstack.com/blog/hermes-performance-on-ios)

### Vídeos

- [React Native EU — Hermes deep dive](https://www.youtube.com/watch?v=bDNh9tN2DdQ)

---

## Próximo Passo

Você entende como o Hermes executa JavaScript no Android. Próximo: como o JSI (JavaScript Interface) substitui a antiga Bridge assíncrona e habilita comunicação síncrona e zero-copy entre JS e código nativo Kotlin.

➡ [JSI: O Fim da Bridge](./02-jsi-javascript-interface)
