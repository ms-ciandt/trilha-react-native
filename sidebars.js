// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  introducao: [
    {
      type: 'category',
      label: 'Introduction',
      collapsed: false,
      items: [
        'introducao/intro',
        'introducao/history-and-architecture',
        'introducao/new-architecture',
        'introducao/choose-your-track',
      ],
    },
  ],

  trilhaNativo: [
    {
      type: 'category',
      label: 'Fundamentals',
      collapsed: false,
      items: [
        'trilha-nativo/modulo-fundamentos/javascript-for-native-developers',
        'trilha-nativo/modulo-fundamentos/typescript',
        'trilha-nativo/modulo-fundamentos/react-fundamentals',
        'trilha-nativo/modulo-fundamentos/components-and-props',
        'trilha-nativo/modulo-fundamentos/state-and-hooks',
        'trilha-nativo/modulo-fundamentos/rn-core-components',
        'trilha-nativo/modulo-fundamentos/layout-and-flexbox',
        'trilha-nativo/modulo-fundamentos/styling',
        'trilha-nativo/modulo-fundamentos/navegacao-nativo',
        'trilha-nativo/modulo-fundamentos/estado-e-apis-nativo',
      ],
    },
    {
      type: 'category',
      label: 'Native Resources',
      collapsed: false,
      items: [
        'trilha-nativo/modulo-recursos-nativos/utilizando-recursos-nativos',
        'trilha-nativo/modulo-recursos-nativos/integracao-nativa-avancada',
      ],
    },
    {
      type: 'category',
      label: 'Performance',
      collapsed: false,
      items: [
        'trilha-nativo/modulo-performance/topico-performance-rn-nativos',
      ],
    },
    {
      type: 'category',
      label: 'Testing',
      collapsed: false,
      items: [
        'trilha-nativo/modulo-testes/topico-testes-nativos',
      ],
    },
    {
      type: 'category',
      label: 'CI/CD',
      collapsed: false,
      items: [
        'trilha-nativo/modulo-cicd/topico-ci-cd-nativos',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'trilha-nativo/modulo-arquitetura/topico-arquitetura-nativos',
      ],
    },
  ],

  trilhaIos: [
    {
      type: 'category',
      label: 'Fundamentals',
      collapsed: false,
      items: [
        'trilha-ios/modulo-fundamentos/swift-to-javascript',
        'trilha-ios/modulo-fundamentos/typescript-for-swift-devs',
        'trilha-ios/modulo-fundamentos/swiftui-to-react',
        'trilha-ios/modulo-fundamentos/components-and-props',
        'trilha-ios/modulo-fundamentos/state-and-hooks',
        'trilha-ios/modulo-fundamentos/rn-core-components',
        'trilha-ios/modulo-fundamentos/layout-and-flexbox',
        'trilha-ios/modulo-fundamentos/styling',
        'trilha-ios/modulo-fundamentos/navigation',
        'trilha-ios/modulo-fundamentos/state-and-apis',
      ],
    },
    {
      type: 'category',
      label: 'Native Resources',
      collapsed: false,
      items: [
        'trilha-ios/modulo-recursos-nativos/permissions-info-plist',
        'trilha-ios/modulo-recursos-nativos/camera-and-media',
        'trilha-ios/modulo-recursos-nativos/storage-and-keychain',
        'trilha-ios/modulo-recursos-nativos/sensors-and-device-apis',
        'trilha-ios/modulo-recursos-nativos/turbomodule-swift',
      ],
    },
    {
      type: 'category',
      label: 'Performance',
      collapsed: false,
      items: [
        'trilha-ios/modulo-performance/thread-model-ios',
        'trilha-ios/modulo-performance/list-performance',
        'trilha-ios/modulo-performance/animations-reanimated',
        'trilha-ios/modulo-performance/memo-and-renders',
        'trilha-ios/modulo-performance/bundle-and-startup',
      ],
    },
    {
      type: 'category',
      label: 'Testing',
      collapsed: false,
      items: [
        'trilha-ios/modulo-testes/jest-unit-tests',
        'trilha-ios/modulo-testes/react-native-testing-library',
        'trilha-ios/modulo-testes/mocking-native-modules',
        'trilha-ios/modulo-testes/integration-tests',
        'trilha-ios/modulo-testes/detox-e2e',
      ],
    },
    {
      type: 'category',
      label: 'CI/CD',
      collapsed: false,
      items: [
        'trilha-ios/modulo-cicd/xcode-cocoapods-setup',
        'trilha-ios/modulo-cicd/code-signing-and-fastlane',
        'trilha-ios/modulo-cicd/github-actions-ios',
        'trilha-ios/modulo-cicd/eas-build-ios',
        'trilha-ios/modulo-cicd/privacy-manifest-app-store',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'trilha-ios/modulo-arquitetura/architecture-patterns',
        'trilha-ios/modulo-arquitetura/brownfield-integration',
        'trilha-ios/modulo-arquitetura/state-management-scale',
        'trilha-ios/modulo-arquitetura/error-handling-monitoring',
        'trilha-ios/modulo-arquitetura/accessibility',
      ],
    },
    {
      type: 'category',
      label: 'New Architecture',
      collapsed: false,
      items: [
        'trilha-ios/modulo-new-architecture/hermes-on-ios',
        'trilha-ios/modulo-new-architecture/jsi-objcpp',
        'trilha-ios/modulo-new-architecture/fabric-ios',
        'trilha-ios/modulo-new-architecture/turbomodule-deep-dive',
        'trilha-ios/modulo-new-architecture/debugging-ios',
      ],
    },
  ],


  trilhaMasterclass: [
    {
      type: 'category',
      label: 'Overview',
      collapsed: false,
      items: [
        'trilha-masterclass/modulo-00-overview/course-overview',
      ],
    },
    {
      type: 'category',
      label: 'Brownfield Integration',
      collapsed: false,
      items: [
        'trilha-masterclass/modulo-01-brownfield/setup-and-embedding',
        'trilha-masterclass/modulo-01-brownfield/surfaces-and-lifecycle',
        'trilha-masterclass/modulo-01-brownfield/communication-and-navigation',
      ],
    },
    {
      type: 'category',
      label: 'JSI & Fabric',
      collapsed: false,
      items: [
        'trilha-masterclass/modulo-02-jsi-fabric/jsi-javascript-interface',
        'trilha-masterclass/modulo-02-jsi-fabric/jsi-advanced',
        'trilha-masterclass/modulo-02-jsi-fabric/fabric-renderer',
        'trilha-masterclass/modulo-02-jsi-fabric/fabric-components',
        'trilha-masterclass/modulo-02-jsi-fabric/runtime-new-architecture',
        'trilha-masterclass/modulo-02-jsi-fabric/runtime-debugging',
      ],
    },
    {
      type: 'category',
      label: 'TurboModules',
      collapsed: false,
      items: [
        'trilha-masterclass/modulo-03-turbomodules/what-is-turbomodules',
        'trilha-masterclass/modulo-03-turbomodules/specs-typescript',
        'trilha-masterclass/modulo-03-turbomodules/codegen',
        'trilha-masterclass/modulo-03-turbomodules/defensive-loading',
        'trilha-masterclass/modulo-03-turbomodules/get-vs-getenforcing',
        'trilha-masterclass/modulo-03-turbomodules/availability-guards',
        'trilha-masterclass/modulo-03-turbomodules/supported-types',
        'trilha-masterclass/modulo-03-turbomodules/tests-mocks',
      ],
    },
    {
      type: 'category',
      label: 'Performance, Bundle & CI/CD',
      collapsed: false,
      items: [
        'trilha-masterclass/modulo-04-performance-cicd/performance',
        'trilha-masterclass/modulo-04-performance-cicd/profiling-and-renders',
        'trilha-masterclass/modulo-04-performance-cicd/bundle-distribution',
        'trilha-masterclass/modulo-04-performance-cicd/packaging-and-distribution',
        'trilha-masterclass/modulo-04-performance-cicd/cicd-pipeline',
      ],
    },
    {
      type: 'category',
      label: 'RN Version Updates',
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Process: Upgrade Strategy',
          collapsed: false,
          items: [
            'trilha-masterclass/modulo-05-version-updates/upgrade-strategy',
            'trilha-masterclass/modulo-05-version-updates/rn-upgrade-helper',
            'trilha-masterclass/modulo-05-version-updates/breaking-changes',
            'trilha-masterclass/modulo-05-version-updates/upgrade-roadmap',
            'trilha-masterclass/modulo-05-version-updates/build-validation',
          ],
        },
        {
          type: 'category',
          label: 'Dependencies: Patches and Environment',
          collapsed: false,
          items: [
            'trilha-masterclass/modulo-05-version-updates/patches-recreation',
            'trilha-masterclass/modulo-05-version-updates/library-compatibility',
            'trilha-masterclass/modulo-05-version-updates/environment-requirements',
            'trilha-masterclass/modulo-05-version-updates/native-settings',
            'trilha-masterclass/modulo-05-version-updates/rn-doctor',
          ],
        },
      ],
    },
  ],

  trilhaAndroid: [
    {
      type: 'category',
      label: 'Fundamentals',
      collapsed: false,
      items: [
        'trilha-android/modulo-fundamentos/javascript-for-android-devs',
        'trilha-android/modulo-fundamentos/typescript-for-kotlin-devs',
        'trilha-android/modulo-fundamentos/rn-core-components',
        'trilha-android/modulo-fundamentos/styling-stylesheet',
        'trilha-android/modulo-fundamentos/state-and-apis',
      ],
    },
    {
      type: 'category',
      label: 'Native Resources',
      collapsed: false,
      items: [
        'trilha-android/modulo-recursos-nativos/permissions',
        'trilha-android/modulo-recursos-nativos/camera',
        'trilha-android/modulo-recursos-nativos/storage',
        'trilha-android/modulo-recursos-nativos/sensors-device-apis',
        'trilha-android/modulo-recursos-nativos/notifications',
      ],
    },
    {
      type: 'category',
      label: 'Performance',
      collapsed: false,
      items: [
        'trilha-android/modulo-performance/thread-model',
        'trilha-android/modulo-performance/flatlist-optimisation',
        'trilha-android/modulo-performance/reanimated',
        'trilha-android/modulo-performance/memo-usememo-usecallback',
        'trilha-android/modulo-performance/bundle-startup',
      ],
    },
    {
      type: 'category',
      label: 'Testing',
      collapsed: false,
      items: [
        'trilha-android/modulo-testes/jest-unit-tests',
        'trilha-android/modulo-testes/react-native-testing-library',
        'trilha-android/modulo-testes/mocking-native-modules',
        'trilha-android/modulo-testes/integration-tests',
        'trilha-android/modulo-testes/detox-e2e',
      ],
    },
    {
      type: 'category',
      label: 'CI/CD',
      collapsed: false,
      items: [
        'trilha-android/modulo-cicd/fastlane',
        'trilha-android/modulo-cicd/github-actions',
        'trilha-android/modulo-cicd/eas-build',
        'trilha-android/modulo-cicd/code-signing-keystore',
        'trilha-android/modulo-cicd/ota-updates',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'trilha-android/modulo-arquitetura/architecture-patterns',
        'trilha-android/modulo-arquitetura/monorepo',
        'trilha-android/modulo-arquitetura/state-management-at-scale',
        'trilha-android/modulo-arquitetura/error-handling-monitoring',
        'trilha-android/modulo-arquitetura/accessibility',
      ],
    },
    {
      type: 'category',
      label: 'New Architecture',
      collapsed: false,
      items: [
        'trilha-android/modulo-new-architecture/hermes-engine',
        'trilha-android/modulo-new-architecture/jsi-javascript-interface',
        'trilha-android/modulo-new-architecture/turbomodule-kotlin',
        'trilha-android/modulo-new-architecture/fabric-component-compose',
        'trilha-android/modulo-new-architecture/debugging-new-architecture',
      ],
    },
    {
      type: 'category',
      label: 'Compose → React Native',
      collapsed: false,
      items: [
        'trilha-android/modulo-compose-para-rn/composable-vs-component',
        'trilha-android/modulo-compose-para-rn/remember-vs-usestate',
        'trilha-android/modulo-compose-para-rn/layout-column-row-vs-flexbox',
        'trilha-android/modulo-compose-para-rn/navigation-navhost-vs-react-navigation',
        'trilha-android/modulo-compose-para-rn/theming-material3-vs-rn',
      ],
    },
  ],


  trilhaWeb: [
    {
      type: 'category',
      label: 'Fundamentals',
      collapsed: false,
      items: [
        'trilha-web/modulo-fundamentos/adaptando-js-ts',
        'trilha-web/modulo-fundamentos/typescript',
        'trilha-web/modulo-fundamentos/web-vs-rn',
        'trilha-web/modulo-fundamentos/sem-dom-sem-css',
        'trilha-web/modulo-fundamentos/componentes-nativos',
        'trilha-web/modulo-fundamentos/estilos-flexbox',
        'trilha-web/modulo-fundamentos/listas-navegacao',
        'trilha-web/modulo-fundamentos/navegacao-web',
        'trilha-web/modulo-fundamentos/estado-e-apis-web',
      ],
    },
    {
      type: 'category',
      label: 'Native Resources',
      collapsed: false,
      items: [
        'trilha-web/modulo-recursos-nativos/utilizando-recursos-nativos',
        'trilha-web/modulo-recursos-nativos/topico-integracao-nativa-web',
        'trilha-web/modulo-recursos-nativos/dependencias-nativas',
      ],
    },
    {
      type: 'category',
      label: 'Performance',
      collapsed: false,
      items: [
        'trilha-web/modulo-performance/topico-performance-mobile-web',
      ],
    },
    {
      type: 'category',
      label: 'Testing',
      collapsed: false,
      items: [
        'trilha-web/modulo-testes/topico-testes-web',
      ],
    },
    {
      type: 'category',
      label: 'CI/CD',
      collapsed: false,
      items: [
        'trilha-web/modulo-cicd/topico-ci-cd-web',
        'trilha-web/modulo-cicd/modelo-entrega-mobile',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'trilha-web/modulo-arquitetura/topico-arquitetura-web',
      ],
    },
  ],
};

module.exports = sidebars;
