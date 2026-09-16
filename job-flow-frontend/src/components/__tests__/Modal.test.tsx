import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Modal from '../Modal';

describe('Modal', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and children', () => {
    render(
      <Modal title="Test Modal" onClose={onClose}>
        <p>Modal content here</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content here')).toBeInTheDocument();
  });

  it('calls onClose when X button clicked', () => {
    render(
      <Modal title="Close Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    );

    // The close button contains the X icon from lucide-react
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    render(
      <Modal title="Escape Test" onClose={onClose}>
        <p>Content</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
