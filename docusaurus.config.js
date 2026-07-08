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
    format: 'md',
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
      navbar: {
        title: 'Trilha React Native',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'introducao',
            position: 'left',
            label: 'Introdução',
          },
          {
            type: 'docSidebar',
            sidebarId: 'trilhaNativo',
            position: 'left',
            label: 'Trilha Nativo',
          },
          {
            type: 'docSidebar',
            sidebarId: 'trilhaWeb',
            position: 'left',
            label: 'Trilha Web',
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
      footer: {
        style: 'dark',
        copyright: `Trilha React Native — Conteúdo educacional open source`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
        additionalLanguages: ['kotlin', 'swift', 'bash'],
      },
    }),
};

module.exports = config;
