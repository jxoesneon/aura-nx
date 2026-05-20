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
        <Heading as="h2">Engineered for Absolute Precision</Heading>
        <p>The core infrastructure powering the next generation of unified console ecosystems.</p>
      </div>
      <div className="stack-grid">
        <div className="aura-card stack-item">
          <h3>Advanced Hardware Abstraction</h3>
          <p>Low-level background processes running natively on Horizon OS, providing seamless system services and robust hardware control.</p>
        </div>
        <div className="aura-card stack-item">
          <h3>Unified Control Protocol</h3>
          <p>The Aura-NX bridge connects high-level automation with deep console internals via a secure, zero-latency event-driven interface.</p>
        </div>
        <div className="aura-card stack-item">
          <h3>Enterprise-Grade VFS</h3>
          <p>Distributed Virtual File System enabling high-speed resource synchronization and remote execution across secure network topologies.</p>
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
          Unified Console Engineering
        </Heading>
        <p className="hero__subtitle">
          Aura-NX bridges the gap between raw hardware and developer intuition, delivering the high-precision infrastructure required for elite console orchestration, Zero-Latency Asset Pushing, and Total Observability.
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg margin-right--md"
            to="/docs/architecture">
            Begin Integration
          </Link>
          <Link
            className="button button--secondary button--lg"
            href="https://github.com/jxoesneon/aura-nx">
            Access Source
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
      title="Advanced Engineering Portal"
      description="Professional development portal for the Aura-NX ecosystem.">
      <HomepageHeader />
      <main>
        <TechnicalStack />
        <section className="container margin-vert--xl">
          <div className="aura-card" style={{textAlign: 'center', background: 'rgba(34, 197, 94, 0.05)'}}>
            <Heading as="h2" style={{color: '#22C55E'}}>Ready to Scale?</Heading>
            <p style={{maxWidth: '600px', margin: '1rem auto 2rem'}}>
              Unlock our comprehensive suite of professional tools, from low-level micro-architectural debuggers to high-level fleet orchestration dashboards.
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
