import { birthdaySeenStorageKey } from '../birthday';

describe('birthdaySeenStorageKey', () => {
  it('genera una clave estable por usuario + greeting_id', () => {
    expect(birthdaySeenStorageKey(7, 42)).toBe('birthdayGreetingSeen:7:42');
  });

  it('distingue felicitaciones distintas para el mismo usuario', () => {
    expect(birthdaySeenStorageKey(7, 1)).not.toBe(birthdaySeenStorageKey(7, 2));
  });

  it('distingue al mismo greeting_id entre usuarios distintos (bug corregido: greeting_id es una secuencia global)', () => {
    // El usuario A vio la felicitación 45 — el usuario B, en el mismo
    // teléfono, no debe heredar ese "ya vista" si su propio cumpleaños
    // también generó el id 45.
    expect(birthdaySeenStorageKey('userA', 45)).not.toBe(birthdaySeenStorageKey('userB', 45));
  });
});
