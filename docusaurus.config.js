// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'React Native Trail',
  tagline: 'From zero to React Native — tracks for native and web devs',
  url: 'https://ms-ciandt.github.io',
  baseUrl: '/trilha-react-native/',
  organizationName: 'ms-ciandt',
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
        title: 'React Native Trail',
        logo: undefined,
        items: [
          {
            to: '/introducao/intro',
            label: 'Introduction',
            position: 'left',
            activeBaseRegex: '^/trilha-react-native/introducao',
          },
          {
            to: '/trilha-web/modulo-fundamentos/adaptando-js-ts',
            label: 'Web developer trail',
            position: 'left',
            activeBaseRegex: '^/trilha-react-native/trilha-web',
          },
          {
            to: '/trilha-android/modulo-compose-para-rn/composable-vs-component',
            label: 'Android native trail',
            position: 'left',
            activeBaseRegex: '^/trilha-react-native/trilha-android',
          },
          {
            to: '/trilha-ios/modulo-fundamentos/swift-to-javascript',
            label: 'iOS native trail',
            position: 'left',
            activeBaseRegex: '^/trilha-react-native/trilha-ios',
          },
          {
            to: '/trilha-masterclass/modulo-00-overview/course-overview',
            label: 'React Native MasterClass Trail',
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
