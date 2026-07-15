// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Trilha React Native',
  tagline: 'Do zero ao React Native — trilhas para devs nativos e web',
  url: 'https://alimuramatheus.github.io',
  baseUrl: '/trilha-react-native/',
  organizationName: 'AlimuraMatheus',
  projectName: 'trilha-react-native',
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  markdown: {
    format: 'detect',
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt'],
    localeConfigs: {
      en: { label: 'English' },
      pt: { label: 'Português' },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          path: 'docs',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          sidebarCollapsible: true,
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: false,
        },
      },
      navbar: {
        hideOnScroll: true,
        title: 'Trilha React Native',
        logo: undefined,
        items: [
          {
            to: '/introducao/intro',
            label: 'Introdução',
            position: 'left',
            activeBaseRegex: '^/trilha-react-native/introducao',
          },
          {
            to: '/trilha-web/modulo-fundamentos/adaptando-js-ts',
            label: 'Trilha Web',
            position: 'left',
            activeBaseRegex: '^/trilha-react-native/trilha-web',
          },
          {
            to: '/trilha-nativo/modulo-fundamentos/javascript-for-native-developers',
            label: 'Trilha Nativo',
            position: 'left',
            activeBaseRegex: '^/trilha-react-native/trilha-nativo',
          },
          {
            to: '/trilha-masterclass/modulo-00-overview/course-overview',
            label: 'Masterclass',
            position: 'left',
            activeBaseRegex: '^/trilha-react-native/trilha-masterclass',
          },
          {
            to: '/about',
            label: 'About',
            position: 'right',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/AlimuraMatheus/trilha-react-native',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: undefined,
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
        additionalLanguages: ['kotlin', 'swift', 'bash'],
      },
    }),
};

module.exports = config;
