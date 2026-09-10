import { birthdaySeenStorageKey } from '../birthday';

describe('birthdaySeenStorageKey', () => {
  it('genera una clave estable por greeting_id', () => {
    expect(birthdaySeenStorageKey(42)).toBe('birthdayGreetingSeen:42');
  });

  it('distingue felicitaciones distintas', () => {
    expect(birthdaySeenStorageKey(1)).not.toBe(birthdaySeenStorageKey(2));
  });
});
