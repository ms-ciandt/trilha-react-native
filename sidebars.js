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
        'trilha-ios/modulo-recursos-nativos/native-resources-ios',
      ],
    },
    {
      type: 'category',
      label: 'Performance',
      collapsed: false,
      items: [
        'trilha-ios/modulo-performance/performance-ios',
      ],
    },
    {
      type: 'category',
      label: 'Testing',
      collapsed: false,
      items: [
        'trilha-ios/modulo-testes/testing-ios',
      ],
    },
    {
      type: 'category',
      label: 'CI/CD',
      collapsed: false,
      items: [
        'trilha-ios/modulo-cicd/cicd-ios',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      collapsed: false,
      items: [
        'trilha-ios/modulo-arquitetura/architecture-ios',
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
