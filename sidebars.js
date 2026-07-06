// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  introducao: [
    {
      type: 'category',
      label: 'Introdução',
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
      label: 'Fundamentos',
      collapsed: false,
      items: [
        'trilha-nativo/modulo-fundamentos/js-ts-overview',
        'trilha-nativo/modulo-fundamentos/js-fundamentals',
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
      label: 'Recursos Nativos',
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
      label: 'Testes',
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
      label: 'Arquitetura',
      collapsed: false,
      items: [
        'trilha-nativo/modulo-arquitetura/topico-arquitetura-nativos',
      ],
    },
  ],

  trilhaWeb: [
    {
      type: 'category',
      label: 'Fundamentos',
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
      label: 'Recursos Nativos',
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
      label: 'Testes',
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
      label: 'Arquitetura',
      collapsed: false,
      items: [
        'trilha-web/modulo-arquitetura/topico-arquitetura-web',
      ],
    },
  ],
};

module.exports = sidebars;
