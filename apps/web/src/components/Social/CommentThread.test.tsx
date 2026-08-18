import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../../test/testUtils';
import CommentThread from './CommentThread';
import { SocialComment } from '../../hooks/useSocialPosts';

/**
 * FC162 F2 — CommentThread.tsx had zero test coverage (not excluded, simply
 * never had one). Covers the fetch-on-mount, empty/loading states, nested
 * replies, submit-and-refetch, and the PII-detection error mapping.
 */

const COMMENT: SocialComment = {
  id: 1,
  postId: 10,
  authorId: 2,
  parentCommentId: null,
  contentText: 'Buen servicio',
  createdAt: '2026-08-01T00:00:00.000Z',
};

const REPLY: SocialComment = {
  id: 2,
  postId: 10,
  authorId: 3,
  parentCommentId: 1,
  contentText: 'De acuerdo',
  createdAt: '2026-08-02T00:00:00.000Z',
};

describe('CommentThread', () => {
  it('fetches comments for the post on mount and renders root comments', async () => {
    const fetchComments = vi.fn().mockResolvedValue([COMMENT]);
    render(<CommentThread postId={10} fetchComments={fetchComments} addComment={vi.fn()} />);
    expect(fetchComments).toHaveBeenCalledWith(10);
    expect(await screen.findByTestId('comment-1')).toBeInTheDocument();
    expect(screen.getByText('Buen servicio')).toBeInTheDocument();
  });

  it('shows the empty state when there are no root comments', async () => {
    const fetchComments = vi.fn().mockResolvedValue([]);
    render(<CommentThread postId={10} fetchComments={fetchComments} addComment={vi.fn()} />);
    expect(await screen.findByTestId('comments-empty')).toBeInTheDocument();
  });

  it('renders a reply nested under its parent comment', async () => {
    const fetchComments = vi.fn().mockResolvedValue([COMMENT, REPLY]);
    render(<CommentThread postId={10} fetchComments={fetchComments} addComment={vi.fn()} />);
    expect(await screen.findByTestId('comment-reply-2')).toBeInTheDocument();
    expect(screen.getByText('De acuerdo')).toBeInTheDocument();
  });

  it('silently shows the empty state when fetchComments rejects', async () => {
    const fetchComments = vi.fn().mockRejectedValue(new Error('network down'));
    render(<CommentThread postId={10} fetchComments={fetchComments} addComment={vi.fn()} />);
    expect(await screen.findByTestId('comments-empty')).toBeInTheDocument();
  });

  it('the submit button stays disabled until text is entered', async () => {
    const fetchComments = vi.fn().mockResolvedValue([]);
    render(<CommentThread postId={10} fetchComments={fetchComments} addComment={vi.fn()} />);
    await screen.findByTestId('comments-empty');
    expect(screen.getByTestId('comment-submit')).toBeDisabled();
    fireEvent.change(screen.getByTestId('comment-input'), { target: { value: 'Hola' } });
    expect(screen.getByTestId('comment-submit')).not.toBeDisabled();
  });

  it('submitting posts the comment, clears the input, and refetches the list', async () => {
    const fetchComments = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([COMMENT]);
    const addComment = vi.fn().mockResolvedValue(undefined);
    render(<CommentThread postId={10} fetchComments={fetchComments} addComment={addComment} />);
    await screen.findByTestId('comments-empty');

    fireEvent.change(screen.getByTestId('comment-input'), {
      target: { value: '  Buen servicio  ' },
    });
    fireEvent.click(screen.getByTestId('comment-submit'));

    await waitFor(() => expect(addComment).toHaveBeenCalledWith(10, 'Buen servicio'));
    await waitFor(() => expect(fetchComments).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('comment-1')).toBeInTheDocument();
    expect(screen.getByTestId('comment-input')).toHaveValue('');
  });

  it('a whitespace-only submit is a no-op (no addComment call)', async () => {
    const fetchComments = vi.fn().mockResolvedValue([]);
    const addComment = vi.fn();
    render(<CommentThread postId={10} fetchComments={fetchComments} addComment={addComment} />);
    await screen.findByTestId('comments-empty');
    fireEvent.change(screen.getByTestId('comment-input'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('comment-submit'));
    expect(addComment).not.toHaveBeenCalled();
  });

  it('maps the PII_DETECTED_IN_COMMENT server code to a readable es-MX message', async () => {
    const fetchComments = vi.fn().mockResolvedValue([]);
    const addComment = vi.fn().mockRejectedValue({
      response: { data: { error: 'PII_DETECTED_IN_COMMENT' } },
    });
    render(<CommentThread postId={10} fetchComments={fetchComments} addComment={addComment} />);
    await screen.findByTestId('comments-empty');
    fireEvent.change(screen.getByTestId('comment-input'), {
      target: { value: 'mi telefono es 555' },
    });
    fireEvent.click(screen.getByTestId('comment-submit'));
    expect(await screen.findByText('Comentario contiene datos sensibles.')).toBeInTheDocument();
  });

  it('shows a generic error for any other failure shape', async () => {
    const fetchComments = vi.fn().mockResolvedValue([]);
    const addComment = vi.fn().mockRejectedValue(new Error('boom'));
    render(<CommentThread postId={10} fetchComments={fetchComments} addComment={addComment} />);
    await screen.findByTestId('comments-empty');
    fireEvent.change(screen.getByTestId('comment-input'), { target: { value: 'hola' } });
    fireEvent.click(screen.getByTestId('comment-submit'));
    expect(await screen.findByText('Error')).toBeInTheDocument();
  });
});
