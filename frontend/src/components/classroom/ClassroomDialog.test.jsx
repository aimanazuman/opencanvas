/* eslint-disable testing-library/no-node-access -- the scrim is the dialog's parent element; the tests press on it */
/**
 * ClassroomDialog: a scrim close needs the press and the click to both start on the scrim, so a text selection
 * dragged out of a field does not close the dialog. Escape still closes it.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ClassroomDialog from './ClassroomDialog';

function renderDialog({ onClose = jest.fn(), dismissOnScrim = true } = {}) {
  render(
    <ClassroomDialog titleId="note-title" title="Edit note" onClose={onClose} dismissOnScrim={dismissOnScrim}>
      <label htmlFor="note-text">Note</label>
      <textarea id="note-text" defaultValue="Draft text" />
    </ClassroomDialog>
  );
  const scrim = screen.getByRole('dialog', { name: 'Edit note' }).parentElement;
  return { onClose, scrim, field: screen.getByLabelText('Note') };
}

describe('ClassroomDialog scrim dismissal', () => {
  test('a press and a click that both start on the scrim close the dialog', () => {
    const { onClose, scrim } = renderDialog();
    fireEvent.mouseDown(scrim);
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a text selection that starts in a field and is released on the scrim does not close it', () => {
    const { onClose, scrim, field } = renderDialog();
    fireEvent.mouseDown(field);
    fireEvent.click(scrim);
    expect(onClose).not.toHaveBeenCalled();
    expect(field).toHaveValue('Draft text');
  });

  test('a press inside the panel followed by a click on the panel does not close it', () => {
    const { onClose, scrim, field } = renderDialog();
    fireEvent.mouseDown(scrim);
    fireEvent.mouseDown(field);
    fireEvent.click(field);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(scrim);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('a click with no press on the scrim does not close it', () => {
    const { onClose, scrim } = renderDialog();
    fireEvent.click(scrim);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('a finished press is forgotten, so a later bare click does not close it', () => {
    const { onClose, scrim } = renderDialog();
    fireEvent.mouseDown(scrim);
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('without dismissOnScrim the backdrop never closes the dialog', () => {
    const { onClose, scrim } = renderDialog({ dismissOnScrim: false });
    fireEvent.mouseDown(scrim);
    fireEvent.click(scrim);
    expect(onClose).not.toHaveBeenCalled();
  });

  test('Escape still closes the dialog', () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
