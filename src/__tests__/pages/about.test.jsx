import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useColorMode } from '@docusaurus/theme-common';
import About from '../../pages/about.jsx';

beforeEach(() => {
  useColorMode.mockReturnValue({ colorMode: 'light', setColorMode: vi.fn() });
});

describe('About page (EN)', () => {
  it('renders without crashing', () => {
    render(<About />);
  });

  it('shows the page heading', () => {
    render(<About />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About This Course');
  });

  it('renders all section headings', () => {
    render(<About />);
    expect(screen.getByRole('heading', { name: /who is it for/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /reference stack/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /built ai-first/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /contributors/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /reviewers/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /open source/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /want to contribute/i })).toBeInTheDocument();
  });

  it('renders all 4 track cards', () => {
    render(<About />);
    expect(screen.getByText('Web dev trail')).toBeInTheDocument();
    expect(screen.getByText('Android native trail')).toBeInTheDocument();
    expect(screen.getByText('iOS native trail')).toBeInTheDocument();
    expect(screen.getByText('React Native MasterClass Trail')).toBeInTheDocument();
  });

  it('renders all 5 reference stack tags', () => {
    render(<About />);
    expect(screen.getByText('React Native 0.76+')).toBeInTheDocument();
    expect(screen.getByText('Expo SDK 56')).toBeInTheDocument();
    expect(screen.getByText('New Architecture (default)')).toBeInTheDocument();
    expect(screen.getByText('JSI · Fabric · TurboModules')).toBeInTheDocument();
    expect(screen.getByText('Hermes Engine')).toBeInTheDocument();
  });

  it('renders all 3 contributors', () => {
    render(<About />);
    // Contributors appear in two sections ("Contributors" and "Want to contribute?")
    expect(screen.getAllByAltText('Matheus Sales').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByAltText('Gabriel Bonin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByAltText('Erick Sugahara').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 5 reviewers with roles', () => {
    render(<About />);
    expect(screen.getByText('Diego Karol Gouvea Lana')).toBeInTheDocument();
    expect(screen.getByText('Guilherme Rovaron')).toBeInTheDocument();
    expect(screen.getByText('Paulo Vitor Sato')).toBeInTheDocument();
    expect(screen.getByText('Gabriel Dos Santos Xavier')).toBeInTheDocument();
    expect(screen.getByText('Architect')).toBeInTheDocument();
  });

  it('renders the GitHub link', () => {
    render(<About />);
    const link = screen.getByRole('link', { name: /view on github/i });
    expect(link).toHaveAttribute('href', expect.stringContaining('github.com'));
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders AI tools (NotebookLM and Claude)', () => {
    render(<About />);
    expect(screen.getByRole('heading', { name: 'NotebookLM' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Claude' })).toBeInTheDocument();
  });

  it('renders correctly in dark mode', () => {
    useColorMode.mockReturnValue({ colorMode: 'dark', setColorMode: vi.fn() });
    render(<About />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('About This Course');
  });
});
