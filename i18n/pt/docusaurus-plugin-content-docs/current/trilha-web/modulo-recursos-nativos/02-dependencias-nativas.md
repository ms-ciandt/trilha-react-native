---
title: Dependências Nativas — JS puro vs Código Nativo
---

# Dependências Nativas — JS puro vs Código Nativo

> Na web, adicionar uma dependência é barato: `npm install`, tree-shaking, pronto. No mobile, essa suposição quebra para uma categoria inteira de bibliotecas. Entender a diferença antes de adicionar um pacote poupa horas de debug.

## Duas Classes de Dependências

Pacotes React Native se dividem em dois perfis com níveis de risco muito diferentes:

| Classe | Exemplos | Perfil de risco |
|---|---|---|
| **JS puro** | lodash, date-fns, zod, zustand, immer | Baixo — se comporta exatamente como uma dependência web |
| **Código nativo** | câmera, mapas, storage, gestures, sensores | Maior — traz Kotlin/Swift que precisa compilar com seu app |

Pacotes JS puro funcionam igual à web: sem etapa de build nativo, sem matriz de compatibilidade, fácil de substituir.

Pacotes nativos são diferentes. Cada um adiciona:

1. **Acoplamento de versão** — precisa ser compatível com sua versão do RN, Gradle/AGP, Xcode e (se Expo) a versão do SDK. Upgrades de RN frequentemente significam esperar as libs nativas publicarem uma release compatível.
2. **Custo de build** — erros aparecem no Gradle ou Xcode, não no Metro. Depurar uma falha de build é uma habilidade diferente de depurar um erro JS.
3. **Compatibilidade com New Architecture** — bibliotecas presas na bridge legada podem ter problemas de performance ou risco de deprecação. Verifique o badge "New Architecture" no [reactnative.directory](https://reactnative.directory/) antes de adotar.
4. **Custo de saída** — remover uma lib nativa exige rebuild completo. Em um app publicado, isso significa uma nova release nas lojas — você não pode "hot-fixar" uma dependência nativa.

## Checklist Antes de Adicionar um Pacote Nativo

Antes do `npm install` em qualquer coisa com código nativo:

- [ ] Tem código nativo? (Verifique se há pastas `android/` ou `ios/` no pacote)
- [ ] Suporta New Architecture? (Verifique em [reactnative.directory](https://reactnative.directory/))
- [ ] Quando foi o último commit? Quantas issues abertas?
- [ ] Existe uma alternativa `expo-*` mantida? (Geralmente melhor integrada com o ecossistema Expo)
- [ ] Existe uma alternativa JS puro que cobre o caso de uso?

## Nota sobre Brownfield

Quando o React Native vive dentro de um app nativo existente (brownfield), cada nova dependência nativa pode conflitar com bibliotecas que o app host já usa — versões duplicadas de libs Android (OkHttp, Firebase, Glide), conflitos de CocoaPods ou símbolos nativos duplicados. Nesse contexto, adicionar uma dependência nativa não é decisão só do time RN — precisa ser coordenada com o time nativo.

Para um aprofundamento em integração brownfield, veja o [módulo de Brownfield da Masterclass](../../trilha-masterclass/modulo-01-brownfield/).

---

## Recursos

| Recurso | Tipo | Link |
|---|---|---|
| React Native Directory | Community | [reactnative.directory](https://reactnative.directory/) |
| Pacotes do Expo SDK | Oficial | [docs.expo.dev/versions/latest/](https://docs.expo.dev/versions/latest/) |
| Compatibilidade com New Architecture | Guia | [reactnative.dev/docs/new-architecture-intro](https://reactnative.dev/docs/new-architecture-intro) |

---

Próximo → **[CI/CD](../modulo-cicd/topico-ci-cd-web)**
