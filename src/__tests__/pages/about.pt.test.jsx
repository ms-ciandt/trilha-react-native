import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColorMode } from '@docusaurus/theme-common';
import About from '../../../i18n/pt/docusaurus-plugin-content-pages/about.jsx';

beforeEach(() => {
  useColorMode.mockReturnValue({ colorMode: 'light', setColorMode: vi.fn() });
});

describe('About page (PT-BR)', () => {
  it('renders without crashing', () => {
    render(<About />);
  });

  it('shows the PT-BR page heading', () => {
    render(<About />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sobre Este Curso');
  });

  it('renders all PT-BR section headings', () => {
    render(<About />);
    expect(screen.getByRole('heading', { name: /para quem é/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /stack de referência/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /feito com ia/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /contribuidores/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /revisores/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /open source/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /quer contribuir/i })).toBeInTheDocument();
  });

  it('renders all 4 track cards in Portuguese', () => {
    render(<About />);
    expect(screen.getByText('Trilha Web')).toBeInTheDocument();
    expect(screen.getByText('Trilha Android')).toBeInTheDocument();
    expect(screen.getByText('Trilha iOS')).toBeInTheDocument();
    expect(screen.getByText('Trilha React Native MasterClass')).toBeInTheDocument();
  });

  it('renders all 5 reference stack tags in PT-BR', () => {
    render(<About />);
    expect(screen.getByText('React Native 0.76+')).toBeInTheDocument();
    expect(screen.getByText('Expo SDK 56')).toBeInTheDocument();
    expect(screen.getByText('New Architecture (padrão)')).toBeInTheDocument();
    expect(screen.getByText('JSI · Fabric · TurboModules')).toBeInTheDocument();
    expect(screen.getByText('Hermes Engine')).toBeInTheDocument();
  });

  it('stack tag uses PT-BR text ("padrão" not "default")', () => {
    render(<About />);
    expect(screen.getByText('New Architecture (padrão)')).toBeInTheDocument();
    expect(screen.queryByText('New Architecture (default)')).not.toBeInTheDocument();
  });

  it('renders all 3 contributors', () => {
    render(<About />);
    // Contributors appear in two sections ("Contribuidores" and "Quer contribuir?")
    expect(screen.getAllByAltText('Matheus Sales').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByAltText('Gabriel Bonin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByAltText('Erick Sugahara').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 5 revisores with PT-BR role ("Arquiteto" not "Architect")', () => {
    render(<About />);
    expect(screen.getByText('Arquiteto')).toBeInTheDocument();
    expect(screen.queryByText('Architect')).not.toBeInTheDocument();
  });

  it('renders the PT-BR GitHub link', () => {
    render(<About />);
    const link = screen.getByRole('link', { name: /ver no github/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('github.com'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders correctly in dark mode', () => {
    useColorMode.mockReturnValue({ colorMode: 'dark', setColorMode: vi.fn() });
    render(<About />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sobre Este Curso');
  });
});
