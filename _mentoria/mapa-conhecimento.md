# Mapa de Conhecimento — Mentoria React Native

Lista enxuta de tópicos transversais usada na autoavaliação de conhecimento dos mentorados. Cada tópico consolida numa descrição curta os subtópicos reais cobertos pelas trilhas do curso (Web, Android, iOS, Masterclass) — o curso aprofunda cada um bem além do resumo aqui, isso é intencional: a planilha existe para ser rápida de preencher, não para substituir o conteúdo.

**Gerado automaticamente a partir de `dados_topicos.py` — não edite este arquivo diretamente.** Para atualizar, edite `dados_topicos.py` e rode `python3 _mentoria/gerar_mapa_md.py` novamente.

## Escala de autoavaliação (1–5)

| Nível | Rótulo | Descrição |
|---|---|---|
| 1 | Nunca ouvi falar | Não conhece o termo/conceito |
| 2 | Já ouvi falar | Sabe que existe, nunca leu ou viu exemplo |
| 3 | Entendo o conceito / uso com apoio | Explica em teoria e/ou já implementou copiando/adaptando exemplo, com suporte |
| 4 | Aplico sozinho | Usa no dia a dia sem ajuda, resolve casos comuns sem suporte |
| 5 | Domino a fundo / referência | Resolve edge cases, ensina outros, é referência no time para o tópico |

## Fluxo de uso

1. Cada mentorado usa sua própria coluna em `mapa-conhecimento-mentoria.xlsx` (Nome, Time) e preenche uma nota de 1 a 5 por tópico — sem disputar célula com ninguém.
2. A planilha calcula automaticamente, por tópico, a média do grupo, o % de domínio e sinaliza gaps críticos (média abaixo de 3).
3. Os resultados agregados orientam decisões de conteúdo: reforçar material já existente (gap alto) ou criar tópicos novos (lacunas identificadas fora deste mapa).

## Tópicos

| Tópico | Descrição | Trilhas onde é abordado |
|---|---|---|
| **React Fundamentals** | JS/TS moderno aplicado a RN, hooks (useState/useEffect/useMemo/useCallback/useRef), core components (View, Text, FlatList, Pressable, TextInput), styling & Flexbox, listas (FlatList/SectionList/FlashList). | Web, Android, iOS |
| **Navigation** | React Navigation (Stack/Tabs/Drawer), Expo Router, navegação tipada (typed routes), navegação híbrida native <-> RN em cenários brownfield. | Web, Android, iOS, Masterclass |
| **State Management** | useState/useReducer, Context, Zustand, TanStack Query (server state), Redux Toolkit/Jotai, padrões em escala (slices, query key factories, optimistic updates, normalização). | Web, Android, iOS |
| **Performance** | Thread model (JS thread / UI thread / Shadow thread), otimização de listas grandes (FlatList/FlashList), memo/useMemo/useCallback, bundle size & cold start, profiling. | Web, Android, iOS, Masterclass |
| **DevTools** | React Native DevTools, Flipper, Chrome DevTools/CDP, Android Studio Profiler, Xcode Instruments/lldb, Systrace/Perfetto, LogBox. | Android, iOS, Masterclass |
| **Fabric, JSI & TurboModules (New Architecture)** | JSI (HostObject, chamadas síncronas/assíncronas), Fabric (shadow tree, renderer), TurboModules (specs em TS, Codegen, defensive loading), engine Hermes. | Android, iOS, Masterclass |
| **Device Features** | Câmera, geolocalização, sensores (acelerômetro, giroscópio, bluetooth), biometria (Face ID/Touch ID), storage local (MMKV, AsyncStorage, SecureStore, SQLite). | Web, Android, iOS |
| **Variáveis de Ambiente** | Configuração por ambiente (.env, EAS env vars), gerenciamento de versões de toolchain (Node, JDK, Xcode, CocoaPods). | Android, iOS, Masterclass |
| **Upgrade do React Native** | RN Upgrade Helper e diffs nativos, análise de breaking changes por versão, compatibility matrix, recriação de patches (patch-package), RN Doctor. | Masterclass |
| **Animações** | Animated API (New Architecture), Reanimated 3 (worklets, shared values), Skia, profiling de animações e causas de frame drop. | Android, iOS, Masterclass |
| **Gestures** | Gesture Handler, composição de gestos, integração com layout animations e Reanimated. | Android, iOS, Masterclass |
| **Design System** | StyleSheet & temas, dark mode, NativeWind, Material3 (Compose) e paridade com design tokens. | Web, Android, iOS |
| **Brownfield** | Embutir RN em app nativo existente (ReactHost/RCTHost, CocoaPods/RCTFabricSurface), múltiplas surfaces, comunicação native <-> RN, estratégia de bundle. Aplicado nos labs práticos do rn-advanced-lab (bootstrap, bundle split, navegação híbrida). | Masterclass |
| **Observabilidade** | Sentry/Crashlytics, monitoramento de crash por versão, symbolication, feature flags/kill switches. | Web, Android, iOS |
| **Acessibilidade** | Accessibility roles, testes de acessibilidade, VoiceOver (iOS) / TalkBack (Android). | Web, Android, iOS |
| **Deep Link** | Configuração de deep linking, Universal Links (iOS) / App Links (Android), deep linking via Expo Router. | Web, Android, iOS |
| **Push Notifications** | FCM/APNs, channels, notificações locais e rich notifications, badge. | Web, Android, iOS |
| **Error Handler** | Tratamento estruturado de erros, error handler global, discriminated unions/Result para erros. | Web, Android, iOS |
| **Permissions** | Modelo de permissões mobile, Android Manifest/PermissionsAndroid, iOS Info.plist/PrivacyInfo.xcprivacy, react-native-permissions. | Web, Android, iOS |
| **Testing** | Jest e testes unitários, React Native Testing Library, mocking de native modules, testes de integração (MSW), Detox E2E. | Web, Android, iOS |
| **CI/CD (Pipelines)** | GitHub Actions, Fastlane, EAS Build/Update, code signing (keystore/certificados), OTA updates e rollback. | Web, Android, iOS, Masterclass |

---

Total de tópicos mapeados: **21**
