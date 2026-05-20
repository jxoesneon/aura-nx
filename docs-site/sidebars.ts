import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Setup',
      items: [
        '02-debugging-protocol',
        '03-profiling-engine',
        '04-asset-hot-reload',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        '01-architecture',
        '07-security-posture',
        '13-v2-architecture',
      ],
    },
    {
      type: 'category',
      label: 'Lifecycle',
      items: [
        '05-development-lifecycle',
        '06-quality-assurance',
        '08-release-ops',
        '10-audit-signoff',
        '11-developer-lifecycle',
      ],
    },
    {
      type: 'category',
      label: 'v2.0 Roadmap',
      items: [
        '09-roadmap-v1',
        '12-v2-roadmap',
      ],
    },
  ],
};

export default sidebars;
