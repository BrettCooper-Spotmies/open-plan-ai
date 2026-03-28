import { describe, expect, it } from 'vitest';
import { emailsMatchForInvitation, inviteMatchesAnyEmail, normalizeInviteEmail } from '../inviteEmail';

describe('inviteEmail', () => {
  it('normalizes case and whitespace', () => {
    expect(normalizeInviteEmail('  A@B.COM  ')).toBe('a@b.com');
  });

  it('matches Gmail dot and plus variants', () => {
    expect(emailsMatchForInvitation('mythiq111@gmail.com', 'mythiq.111@gmail.com')).toBe(true);
    expect(emailsMatchForInvitation('mythiq111@gmail.com', 'mythiq111+work@gmail.com')).toBe(true);
    expect(emailsMatchForInvitation('mythiq111@googlemail.com', 'mythiq111@gmail.com')).toBe(true);
  });

  it('does not equate different Gmail locals', () => {
    expect(emailsMatchForInvitation('mythiq111@gmail.com', 'other@gmail.com')).toBe(false);
  });

  it('inviteMatchesAnyEmail checks list', () => {
    expect(inviteMatchesAnyEmail('a@b.com', ['x@y.com', '  A@B.COM '])).toBe(true);
  });
});
