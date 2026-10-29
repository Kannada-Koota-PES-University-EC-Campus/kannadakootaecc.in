import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import Events from '../features/events/pages/EventsPage';
import EventDetail from '../features/events/pages/EventDetailPage';
import { events, findEvent, getPastEvents } from '../features/events/data/events';

beforeAll(() => {
  // jsdom has no matchMedia; pretend the visitor prefers reduced motion so every lamp is lit at once
  window.matchMedia = ((query: string) => ({
    matches: query.includes('reduce'), media: query, onchange: null,
    addListener: () => undefined, removeListener: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

const future = { v7_startTransition: true, v7_relativeSplatPath: true };

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]} future={future}>
      <Routes>
        <Route path="/events" element={<Events />} />
        <Route path="/events/:slug" element={<><EventDetail /><Where /></>} />
      </Routes>
    </MemoryRouter>
  );

describe('Events: the Path of Lamps', () => {
  it('shows one lamp for every past event, each linking to its own page', () => {
    renderAt('/events');
    expect(screen.getByText('The Path of Lamps')).toBeInTheDocument();
    const past = getPastEvents();
    const links = screen.getAllByRole('link', { name: /step in/i });
    expect(links).toHaveLength(past.length);
    expect(links[0]).toHaveAttribute('href', `/events/${past[0].slug}`);
  });

  it('gives every event a unique address', () => {
    const slugs = events.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    slugs.forEach((s) => expect(s).toMatch(/^[a-z0-9-]+$/));
  });
});

describe('Event pages', () => {
  it('opens an event at /events/<slug>', () => {
    renderAt('/events/kalantaranga');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kalantaranga');
    expect(screen.getByTestId('where')).toHaveTextContent('/events/kalantaranga');
  });

  it('sends other spellings and old ids to the one true address', () => {
    expect(findEvent('kalataranga')?.slug).toBe('kalantaranga');
    renderAt('/events/kalataranga');
    expect(screen.getByTestId('where')).toHaveTextContent('/events/kalantaranga');
  });

  it('shows a friendly message for an unknown event', () => {
    renderAt('/events/no-such-event');
    expect(screen.getByText('We could not find this event.')).toBeInTheDocument();
  });
});
