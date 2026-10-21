/**
 * AboutPage: every route button keeps its destination, the hero is the single page heading,
 * and the template and role sections render their full content.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AboutPage from './AboutPage';

function setup() {
  const onNavigate = jest.fn();
  render(<AboutPage onNavigate={onNavigate} />);
  return { onNavigate };
}

describe('AboutPage', () => {
  test('the hero heading is the page h1 with the full title', () => {
    setup();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Empowering Education Through');
    expect(h1).toHaveTextContent('Collaborative Whiteboards');
  });

  test('Sign In and Get Started navigate to their routes', () => {
    const { onNavigate } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
    expect(onNavigate).toHaveBeenLastCalledWith('login');
    fireEvent.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(onNavigate).toHaveBeenLastCalledWith('signup');
  });

  test('both Back to Home buttons (header and CTA) navigate home', () => {
    const { onNavigate } = setup();
    const buttons = screen.getAllByRole('button', { name: 'Back to Home' });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);
    expect(onNavigate.mock.calls).toEqual([['home'], ['home']]);
  });

  test('lists all five board templates and three roles', () => {
    setup();
    ['Course Material', 'Student Notes', 'Study Planner', 'Kanban Board', 'Quiz Board', 'Students', 'Lecturers', 'Administrators'].forEach((name) => {
      expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
    });
  });
});
