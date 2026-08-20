import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColorMode } from '@docusaurus/theme-common';
import Home from '../../pages/index.jsx';

beforeEach(() => {
  useColorMode.mockReturnValue({ colorMode: 'light', setColorMode: vi.fn() });
});

describe('Home page (EN)', () => {
  it('renders without crashing', () => {
    render(<Home />);
  });

  it('shows the hero title and subtitle', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('React Native Academy');
    expect(screen.getByText(/one codebase, two platforms/i)).toBeInTheDocument();
  });

  it('renders the Introduction card with correct link', () => {
    render(<Home />);
    const link = screen.getByRole('link', { name: /start here/i });
    expect(link).toHaveAttribute('href', '/introducao/intro');
  });

  it('renders all three track cards (Web, Android, iOS)', () => {
    render(<Home />);
    expect(screen.getByText('Web dev trail')).toBeInTheDocument();
    expect(screen.getByText('Android native trail')).toBeInTheDocument();
    expect(screen.getByText('iOS native trail')).toBeInTheDocument();
  });

  it('track Start links point to correct paths', () => {
    render(<Home />);
    const links = screen.getAllByRole('link', { name: /^start$/i });
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/trilha-web/modulo-fundamentos/adaptando-js-ts');
    expect(hrefs).toContain('/trilha-android/modulo-compose-para-rn/composable-vs-component');
    expect(hrefs).toContain('/trilha-ios/modulo-fundamentos/ios-project-setup');
  });

  it('renders the Masterclass section with correct link', () => {
    render(<Home />);
    expect(screen.getByText('React Native Masterclass')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /access masterclass/i });
    expect(link).toHaveAttribute('href', '/trilha-masterclass/modulo-00-overview/course-overview');
  });

  it('renders all 5 reviewers', () => {
    render(<Home />);
    // Matheus Sales appears in both contributors and reviewers sections
    expect(screen.getAllByText('Matheus Sales').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Diego Karol Gouvea Lana').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Guilherme Rovaron').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Paulo Vitor Sato').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Gabriel Dos Santos Xavier').length).toBeGreaterThanOrEqual(1);
  });

  it('renders reviewer roles', () => {
    render(<Home />);
    expect(screen.getAllByText('Architect').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Android').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('iOS').length).toBeGreaterThanOrEqual(1);
  });

  it('renders contributor GitHub links', () => {
    render(<Home />);
    const ghLinks = screen.getAllByRole('link').filter((l) =>
      l.getAttribute('href')?.includes('github.com')
    );
    expect(ghLinks.length).toBeGreaterThanOrEqual(3);
  });

  it('renders correctly in dark mode', () => {
    useColorMode.mockReturnValue({ colorMode: 'dark', setColorMode: vi.fn() });
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('React Native Academy');
  });

  it('does not contain the old "React Native Trail" branding', () => {
    render(<Home />);
    expect(screen.queryByText(/React Native Trail/i)).not.toBeInTheDocument();
  });
});
