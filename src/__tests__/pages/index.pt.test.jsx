import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColorMode } from '@docusaurus/theme-common';
import Home from '../../../i18n/pt/docusaurus-plugin-content-pages/index.jsx';

beforeEach(() => {
  useColorMode.mockReturnValue({ colorMode: 'light', setColorMode: vi.fn() });
});

describe('Home page (PT-BR)', () => {
  it('renders without crashing', () => {
    render(<Home />);
  });

  it('shows the PT-BR hero title and subtitle', () => {
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Trilha React Native');
    expect(screen.getByText(/um código, duas plataformas/i)).toBeInTheDocument();
  });

  it('renders the Introduction card with correct link', () => {
    render(<Home />);
    const link = screen.getByRole('link', { name: /começar por aqui/i });
    expect(link).toHaveAttribute('href', '/introducao/intro');
  });

  it('renders all three track cards in Portuguese', () => {
    render(<Home />);
    expect(screen.getByText('Trilha Web')).toBeInTheDocument();
    expect(screen.getByText('Trilha Android')).toBeInTheDocument();
    expect(screen.getByText('Trilha iOS')).toBeInTheDocument();
  });

  it('track Começar links point to correct paths', () => {
    render(<Home />);
    const links = screen.getAllByRole('link', { name: /^começar$/i });
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/trilha-web/modulo-fundamentos/adaptando-js-ts');
    expect(hrefs).toContain('/trilha-android/modulo-compose-para-rn/composable-vs-component');
    expect(hrefs).toContain('/trilha-ios/modulo-fundamentos/swift-to-javascript');
  });

  it('renders the Masterclass section with PT-BR label', () => {
    render(<Home />);
    expect(screen.getByText('React Native Masterclass')).toBeInTheDocument();
    expect(screen.getByText('Avançado')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /acessar masterclass/i });
    expect(link).toHaveAttribute('href', '/trilha-masterclass/modulo-00-overview/course-overview');
  });

  it('renders all 5 revisores', () => {
    render(<Home />);
    // Matheus Sales appears in both contributors and revisores sections
    expect(screen.getAllByText('Matheus Sales').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Diego Karol Gouvea Lana').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Guilherme Rovaron').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Paulo Vitor Sato').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Gabriel Dos Santos Xavier').length).toBeGreaterThanOrEqual(1);
  });

  it('renders reviewer role in PT-BR ("Arquiteto" not "Architect")', () => {
    render(<Home />);
    expect(screen.getByText('Arquiteto')).toBeInTheDocument();
    expect(screen.queryByText('Architect')).not.toBeInTheDocument();
  });

  it('renders correctly in dark mode', () => {
    useColorMode.mockReturnValue({ colorMode: 'dark', setColorMode: vi.fn() });
    render(<Home />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Trilha React Native');
  });
});
