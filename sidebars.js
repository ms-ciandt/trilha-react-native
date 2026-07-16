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

  trilhaMasterclass: [
    {
      type: 'category',
      label: 'Module 00: Overview',
      collapsed: false,
      items: [
        'trilha-masterclass/modulo-00-overview/course-overview',
      ],
    },
    {
      type: 'category',
      label: 'Module 01: Brownfield Integration',
      collapsed: false,
      items: [
        'trilha-masterclass/modulo-01-brownfield/setup-and-embedding',
        'trilha-masterclass/modulo-01-brownfield/surfaces-and-lifecycle',
        'trilha-masterclass/modulo-01-brownfield/communication-and-navigation',
      ],
    },
    {
      type: 'category',
      label: 'Module 02: TurboModules',
      collapsed: false,
      items: [
        'trilha-masterclass/modulo-02-turbomodules/what-is-turbomodules',
        'trilha-masterclass/modulo-02-turbomodules/specs-typescript',
        'trilha-masterclass/modulo-02-turbomodules/codegen',
        'trilha-masterclass/modulo-02-turbomodules/defensive-loading',
        'trilha-masterclass/modulo-02-turbomodules/get-vs-getenforcing',
        'trilha-masterclass/modulo-02-turbomodules/availability-guards',
        'trilha-masterclass/modulo-02-turbomodules/supported-types',
        'trilha-masterclass/modulo-02-turbomodules/tests-mocks',
      ],
    },
    {
      type: 'category',
      label: 'Module 03: Fabric & JSI',
      collapsed: false,
      items: [
        'trilha-masterclass/modulo-03-fabric-jsi/jsi-javascript-interface',
        'trilha-masterclass/modulo-03-fabric-jsi/jsi-advanced',
        'trilha-masterclass/modulo-03-fabric-jsi/fabric-renderer',
        'trilha-masterclass/modulo-03-fabric-jsi/fabric-components',
        'trilha-masterclass/modulo-03-fabric-jsi/runtime-new-architecture',
        'trilha-masterclass/modulo-03-fabric-jsi/runtime-debugging',
      ],
    },
    {
      type: 'category',
      label: 'Module 04: Performance, Bundle & CI/CD',
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
      label: 'Module 05: RN Version Updates',
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
