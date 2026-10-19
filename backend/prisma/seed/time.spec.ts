import {
  SEED_SERVICE_DATE_ISO,
  parseClockToMinutes,
  parseDayMonthYear,
  seedServiceDate,
  serviceDateTime,
} from './time';

describe('parseClockToMinutes', () => {
  it('parses 12-hour clocks into minutes since midnight', () => {
    expect(parseClockToMinutes('7:15 AM')).toBe(435);
    expect(parseClockToMinutes('12:00 AM')).toBe(0);
    expect(parseClockToMinutes('12:00 PM')).toBe(720);
    expect(parseClockToMinutes('3:30 PM')).toBe(930);
    expect(parseClockToMinutes('11:59 pm')).toBe(1439); // case-insensitive meridiem
  });

  it('rejects malformed or out-of-range clocks', () => {
    expect(() => parseClockToMinutes('25:00')).toThrow(/Unparseable/);
    expect(() => parseClockToMinutes('7:60 AM')).toThrow(/Out-of-range/);
    expect(() => parseClockToMinutes('')).toThrow(/Unparseable/);
  });
});

describe('parseDayMonthYear', () => {
  it('parses "15 Nov 2026" style dates into UTC', () => {
    expect(parseDayMonthYear('15 Nov 2026')).toEqual(new Date('2026-11-15T00:00:00.000Z'));
    expect(parseDayMonthYear('1 Aug 2026')).toEqual(new Date('2026-08-01T00:00:00.000Z'));
  });

  it('rejects unknown months and malformed dates', () => {
    expect(() => parseDayMonthYear('15 Xyz 2026')).toThrow(/Unknown month/);
    expect(() => parseDayMonthYear('2026-11-15')).toThrow(/Unparseable/);
  });
});

describe('fixture date helpers', () => {
  it('anchors all fixture datetimes to the fixed seed service date', () => {
    expect(SEED_SERVICE_DATE_ISO).toBe('2026-10-12');
    expect(seedServiceDate()).toEqual(new Date('2026-10-12T00:00:00.000Z'));
    expect(serviceDateTime(435)).toEqual(new Date('2026-10-12T07:15:00.000Z'));
  });
});
