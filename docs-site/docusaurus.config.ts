import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Aura-NX Enterprise Portal',
  tagline: 'High-Precision Console Development & Enterprise Infrastructure',
  favicon: 'img/favicon.ico',

  url: "https://jxoesneon.github.io",
  baseUrl: "/aura-nx/",

  organizationName: "jxoesneon",
  projectName: "aura-nx",

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/jxoesneon/aura-nx/tree/main/docs-site/',
        },
        blog: {
          showReadingTime: true,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'AURA-NX',
      logo: {
        alt: 'Aura-NX Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: '/aura-nx/api-cpp/index.html',
          label: 'C++ Core API',
          position: 'left',
        },
        {to: '/blog', label: 'Blog', position: 'left'},
        {
          href: 'https://github.com/jxoesneon/aura-nx/wiki',
          label: 'Wiki',
          position: 'right',
        },
        {
          href: 'https://github.com/jxoesneon/aura-nx/releases',
          label: 'Releases',
          position: 'right',
        },
        {
          href: 'https://github.com/jxoesneon/aura-nx',
          label: 'SDK',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Infrastructure',
          items: [
            {
              label: 'Architecture Guide',
              to: '/docs/architecture',
            },
            {
              label: 'Sysmodule Specification',
              to: '/docs/architecture',
            },
            {
              label: 'Network VFS Layer',
              to: '/docs/architecture',
            },
          ],
        },
        {
          title: 'Development',
          items: [
            {
              label: 'Enterprise Wiki',
              href: 'https://github.com/jxoesneon/aura-nx/wiki',
            },
            {
              label: 'SDK Reference',
              href: 'https://github.com/jxoesneon/aura-nx',
            },
            {
              label: 'Bug Bounty',
              href: 'https://github.com/jxoesneon/aura-nx/security',
            },
          ],
        },
        {
          title: 'Connect',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/jxoesneon/aura-nx',
            },
            {
              label: 'Enterprise Chat',
              href: 'https://discord.gg/aura-nx',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Aura-NX Project. Restricted Access.`,
    },
    prism: {
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['rust', 'cpp', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
