import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function TechnicalStack() {
  return (
    <section className="container margin-vert--xl">
      <div className="text--center margin-bottom--lg">
        <Heading as="h2">Engineered for Precision</Heading>
        <p>The core infrastructure powering the next generation of institutional console ecosystems.</p>
      </div>
      <div className="stack-grid">
        <div className="aura-card stack-item">
          <h3>Switch Sysmodule</h3>
          <p>Low-level background processes running natively on Horizon OS, providing persistent system services and hardware abstraction.</p>
        </div>
        <div className="aura-card stack-item">
          <h3>Node.js MCP</h3>
          <p>Modular Control Protocol layer bridging high-level automation with console internals via a secure, event-driven interface.</p>
        </div>
        <div className="aura-card stack-item">
          <h3>Network VFS</h3>
          <p>Distributed Virtual File System enabling seamless resource sharing and remote execution across encrypted network topologies.</p>
        </div>
      </div>
    </section>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero-geometric', styles.heroBanner)}>
      <div className="container" style={{position: 'relative', zIndex: 1}}>
        <Heading as="h1" className="hero__title">
          Institutional Console Development
        </Heading>
        <p className="hero__subtitle">
          Aura-NX provides the high-precision infrastructure required for enterprise-grade console orchestration, 
          VFS management, and native sysmodule engineering.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg margin-right--md"
            to="/docs/architecture">
            Initialize SDK
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/jxoesneon/aura-nx">
            Source Control
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Institutional Portal"
      description="Professional development portal for the Aura-NX ecosystem.">
      <HomepageHeader />
      <main>
        <TechnicalStack />
        <section className="container margin-vert--xl">
          <div className="aura-card" style={{textAlign: 'center', background: 'rgba(34, 197, 94, 0.05)'}}>
            <Heading as="h2" style={{color: '#22C55E'}}>Ready to Deploy?</Heading>
            <p style={{maxWidth: '600px', margin: '1rem auto 2rem'}}>
              Access our comprehensive suite of tools, from low-level assembly debuggers to high-level orchestration dashboards.
            </p>
            <Link
              className="button button--primary button--lg"
              to="/docs/development-lifecycle">
              Get Started with Aura-NX
            </Link>
          </div>
        </section>
      </main>
    </Layout>
  );
}
