import {
  InvoiceStatus,
  JourneyDirection,
  PassengerTripStatus,
  PaymentMethod,
  TrackingProvider,
  TripStatus,
  UserRole,
} from '@prisma/client';

// Guards against a stale generated client: if `prisma generate` has not run
// after a schema change, these enums disappear or drift.
describe('generated Prisma client', () => {
  it('exposes the Phase 4A domain enums with their members', () => {
    expect(Object.values(UserRole)).toEqual(['STUDENT', 'PARENT', 'DRIVER', 'ADMIN']);
    expect(Object.values(JourneyDirection)).toEqual(['MORNING', 'RETURN']);
    expect(Object.values(TripStatus)).toEqual(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED']);
    expect(Object.values(PassengerTripStatus)).toEqual([
      'ASSIGNED',
      'PICKED_UP',
      'ABSENT',
      'DROPPED_OFF',
    ]);
    expect(Object.values(TrackingProvider)).toEqual([
      'SIMULATED',
      'DRIVER_DEVICE',
      'DEDICATED_TRACKER',
    ]);
    expect(Object.values(PaymentMethod)).toContain('CARD');
    expect(Object.values(InvoiceStatus)).toContain('PARTIALLY_PAID');
  });
});
