/* eslint-disable testing-library/no-node-access, testing-library/no-container -- the icon must sit in the control's own wrapper, which is a DOM contract */
/**
 * Icon alignment for the auth inputs. The icon is an absolutely positioned sibling of the control, centred with
 * top-1/2 inside a wrapper that holds only the control, so it stays level with the input with or without a label.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Mail } from 'lucide-react';
import { IconField, PasswordField } from './AuthFields';

function expectCentredOnControl(container) {
  const input = container.querySelector('input');
  const wrapper = input.parentElement;
  const icon = wrapper.querySelector('span[aria-hidden="true"]');
  expect(wrapper).toHaveClass('relative');
  expect(icon).toHaveClass('absolute', 'top-1/2', '-translate-y-1/2');
  expect(icon).not.toHaveClass('top-5');
  // The wrapper holds only the control and its icon, so the label cannot shift the icon.
  expect(wrapper.children).toHaveLength(2);
  expect(wrapper.children[0]).toBe(input);
  expect(wrapper.children[1]).toBe(icon);
}

describe('IconField', () => {
  test('the icon is centred on the input when there is a label', () => {
    const { container } = render(<IconField id="email-1" icon={Mail} label="Email" value="" onChange={() => {}} />);
    expectCentredOnControl(container);
  });

  test('the icon is centred on the input when there is no label', () => {
    const { container } = render(<IconField id="email-2" icon={Mail} aria-label="Email" value="" onChange={() => {}} />);
    expect(screen.queryByText('Email')).toBeNull();
    expectCentredOnControl(container);
  });

  test('an error message does not move the icon', () => {
    const { container } = render(
      <IconField id="email-3" icon={Mail} label="Email" value="" onChange={() => {}} error="Enter an email" />
    );
    expectCentredOnControl(container);
    expect(screen.getByText('Enter an email')).toBeInTheDocument();
  });
});

describe('PasswordField', () => {
  test('the lock and the show control are centred on the input', () => {
    const { container } = render(
      <PasswordField id="pw-1" label="Password" value="" onChange={() => {}} visible={false} onToggle={() => {}} />
    );
    const input = container.querySelector('input');
    const wrapper = input.parentElement;
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(wrapper).toHaveClass('relative');
    expect(toggle.parentElement).toBe(wrapper);
    expect(toggle).toHaveClass('absolute', 'top-1/2', '-translate-y-1/2');
    expect(toggle).not.toHaveClass('top-5');
    const lock = wrapper.querySelector('span[aria-hidden="true"]');
    expect(lock).toHaveClass('absolute', 'top-1/2', '-translate-y-1/2');
  });
});
