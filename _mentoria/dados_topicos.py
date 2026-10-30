# -*- coding: utf-8 -*-
"""
Fonte única de dados do Mapa de Conhecimento da Mentoria React Native.

Lista enxuta de tópicos transversais (independentes de trilha), definida
para reduzir o esforço de preenchimento pelos mentorados. Cada tópico
consolida, numa descrição curta, os subtópicos reais cobertos pelo curso
(Web/Android/iOS/Masterclass + labs práticos do rn-advanced-lab) — o curso
aprofunda cada um deles muito além do resumo aqui, isso é intencional.

A trilha Introdução (módulo zero) não entra na planilha: seus conceitos
de New Architecture (JSI/Fabric/TurboModules/Hermes) já estão absorvidos
no tópico "Fabric, JSI & TurboModules" abaixo.

Os scripts `gerar_mapa_md.py` e `gerar_planilha.py` leem esta lista e
geram os artefatos finais — nunca edite o .md ou o .xlsx diretamente,
edite aqui e regenere.
"""

TOPICOS = []


def _add(topico, descricao, trilhas):
    TOPICOS.append({"topico": topico, "descricao": descricao, "trilhas": trilhas})


_add(
    "React Fundamentals",
    "JS/TS moderno aplicado a RN, hooks (useState/useEffect/useMemo/useCallback/useRef), "
    "core components (View, Text, FlatList, Pressable, TextInput), styling & Flexbox, "
    "listas (FlatList/SectionList/FlashList).",
    "Web, Android, iOS",
)

_add(
    "Navigation",
    "React Navigation (Stack/Tabs/Drawer), Expo Router, navegação tipada (typed routes), "
    "navegação híbrida native <-> RN em cenários brownfield.",
    "Web, Android, iOS, Masterclass",
)

_add(
    "State Management",
    "useState/useReducer, Context, Zustand, TanStack Query (server state), Redux Toolkit/Jotai, "
    "padrões em escala (slices, query key factories, optimistic updates, normalização).",
    "Web, Android, iOS",
)

_add(
    "Performance",
    "Thread model (JS thread / UI thread / Shadow thread), otimização de listas grandes "
    "(FlatList/FlashList), memo/useMemo/useCallback, bundle size & cold start, profiling.",
    "Web, Android, iOS, Masterclass",
)

_add(
    "DevTools",
    "React Native DevTools, Flipper, Chrome DevTools/CDP, Android Studio Profiler, "
    "Xcode Instruments/lldb, Systrace/Perfetto, LogBox.",
    "Android, iOS, Masterclass",
)

_add(
    "Fabric, JSI & TurboModules (New Architecture)",
    "JSI (HostObject, chamadas síncronas/assíncronas), Fabric (shadow tree, renderer), "
    "TurboModules (specs em TS, Codegen, defensive loading), engine Hermes.",
    "Android, iOS, Masterclass",
)

_add(
    "Device Features",
    "Câmera, geolocalização, sensores (acelerômetro, giroscópio, bluetooth), biometria "
    "(Face ID/Touch ID), storage local (MMKV, AsyncStorage, SecureStore, SQLite).",
    "Web, Android, iOS",
)

_add(
    "Variáveis de Ambiente",
    "Configuração por ambiente (.env, EAS env vars), gerenciamento de versões de toolchain "
    "(Node, JDK, Xcode, CocoaPods).",
    "Android, iOS, Masterclass",
)

_add(
    "Upgrade do React Native",
    "RN Upgrade Helper e diffs nativos, análise de breaking changes por versão, compatibility "
    "matrix, recriação de patches (patch-package), RN Doctor.",
    "Masterclass",
)

_add(
    "Animações",
    "Animated API (New Architecture), Reanimated 3 (worklets, shared values), Skia, "
    "profiling de animações e causas de frame drop.",
    "Android, iOS, Masterclass",
)

_add(
    "Gestures",
    "Gesture Handler, composição de gestos, integração com layout animations e Reanimated.",
    "Android, iOS, Masterclass",
)

_add(
    "Design System",
    "StyleSheet & temas, dark mode, NativeWind, Material3 (Compose) e paridade com design tokens.",
    "Web, Android, iOS",
)

_add(
    "Brownfield",
    "Embutir RN em app nativo existente (ReactHost/RCTHost, CocoaPods/RCTFabricSurface), "
    "múltiplas surfaces, comunicação native <-> RN, estratégia de bundle. Aplicado nos labs "
    "práticos do rn-advanced-lab (bootstrap, bundle split, navegação híbrida).",
    "Masterclass",
)

_add(
    "Observabilidade",
    "Sentry/Crashlytics, monitoramento de crash por versão, symbolication, feature flags/kill switches.",
    "Web, Android, iOS",
)

_add(
    "Acessibilidade",
    "Accessibility roles, testes de acessibilidade, VoiceOver (iOS) / TalkBack (Android).",
    "Web, Android, iOS",
)

_add(
    "Deep Link",
    "Configuração de deep linking, Universal Links (iOS) / App Links (Android), deep linking "
    "via Expo Router.",
    "Web, Android, iOS",
)

_add(
    "Push Notifications",
    "FCM/APNs, channels, notificações locais e rich notifications, badge.",
    "Web, Android, iOS",
)

_add(
    "Error Handler",
    "Tratamento estruturado de erros, error handler global, discriminated unions/Result para erros.",
    "Web, Android, iOS",
)

_add(
    "Permissions",
    "Modelo de permissões mobile, Android Manifest/PermissionsAndroid, iOS Info.plist/"
    "PrivacyInfo.xcprivacy, react-native-permissions.",
    "Web, Android, iOS",
)

_add(
    "Testing",
    "Jest e testes unitários, React Native Testing Library, mocking de native modules, "
    "testes de integração (MSW), Detox E2E.",
    "Web, Android, iOS",
)

_add(
    "CI/CD (Pipelines)",
    "GitHub Actions, Fastlane, EAS Build/Update, code signing (keystore/certificados), "
    "OTA updates e rollback.",
    "Web, Android, iOS, Masterclass",
)
