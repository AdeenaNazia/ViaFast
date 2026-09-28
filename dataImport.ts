import { TransportRoute, RouteStop, Vehicle, Driver } from '../types';

export interface ImportRow {
  id: string;
  routeNumber: string;
  routeName: string;
  direction: string;
  stopName: string;
  stopSequence: string;
  morningTiming: string;
  returnTiming: string;
  vehicleNumber: string;
  vehicleCapacity: string;
  driverName: string;
  driverCell: string;
  distanceKm?: string;
  lat?: string;
  lng?: string;
  hasErrors?: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface ParseResult {
  validRows: ImportRow[];
  invalidRows: ImportRow[];
  totalRows: number;
  routesDetected: string[];
}

/**
 * Parses raw CSV text into validated import rows
 */
export function parseScheduleCSV(csvText: string): ParseResult {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) {
    return { validRows: [], invalidRows: [], totalRows: 0, routesDetected: [] };
  }

  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim().toLowerCase().replace(/['"]/g, ''));

  // Map header indexes
  const colIndex = (keys: string[]) => {
    return headers.findIndex((h) => keys.some((k) => h.includes(k)));
  };

  const idxRouteNum = colIndex(['route number', 'route #', 'routenum', 'route']);
  const idxRouteName = colIndex(['route name', 'routename']);
  const idxStopName = colIndex(['stop name', 'stop', 'stopname']);
  const idxStopSeq = colIndex(['stop sequence', 'sequence', 'sr #', 'sr#', 'sr no', 'seq']);
  const idxMorning = colIndex(['morning timing', 'morning time', 'morning', 'time']);
  const idxReturn = colIndex(['return timing', 'return time', 'return']);
  const idxVehicle = colIndex(['vehicle', 'bus', 'coaster', 'bus/coaster number', 'vehicle number']);
  const idxCapacity = colIndex(['capacity', 'bus capacity']);
  const idxDriver = colIndex(['driver', 'driver name']);
  const idxDriverCell = colIndex(['cell', 'phone', 'contact', 'cell #']);
  const idxDistance = colIndex(['distance', 'km']);
  const idxLat = colIndex(['lat', 'latitude']);
  const idxLng = colIndex(['lng', 'longitude']);

  const validRows: ImportRow[] = [];
  const invalidRows: ImportRow[] = [];
  const routesSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Split by comma preserving quotes
    const cells = rawLine.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    const routeNum = (idxRouteNum >= 0 && cells[idxRouteNum]) || '1';
    const routeName = (idxRouteName >= 0 && cells[idxRouteName]) || `Route ${routeNum}`;
    const stopName = (idxStopName >= 0 && cells[idxStopName]) || '';
    const stopSeq = (idxStopSeq >= 0 && cells[idxStopSeq]) || String(i);
    const morningTiming = (idxMorning >= 0 && cells[idxMorning]) || '';
    const returnTiming = (idxReturn >= 0 && cells[idxReturn]) || '3:30 PM';
    const vehicleNumber = (idxVehicle >= 0 && cells[idxVehicle]) || 'Coaster # 1987';
    const vehicleCapacity = (idxCapacity >= 0 && cells[idxCapacity]) || '30';
    const driverName = (idxDriver >= 0 && cells[idxDriver]) || 'Unassigned';
    const driverCell = (idxDriverCell >= 0 && cells[idxDriverCell]) || '0300-0000000';
    const distanceKm = (idxDistance >= 0 && cells[idxDistance]) || '0';
    const lat = (idxLat >= 0 && cells[idxLat]) || '';
    const lng = (idxLng >= 0 && cells[idxLng]) || '';

    const errors: string[] = [];
    const warnings: string[] = [];

    if (!stopName) {
      errors.push('Stop name is required');
    }
    if (!morningTiming) {
      errors.push('Morning timing is required');
    }
    if (!lat || !lng) {
      warnings.push('GPS coordinates not specified (Demo Simulation coordinate will be estimated)');
    }

    const row: ImportRow = {
      id: `imp-${i}`,
      routeNumber: routeNum,
      routeName,
      direction: 'Inbound to Campus',
      stopName,
      stopSequence: stopSeq,
      morningTiming,
      returnTiming,
      vehicleNumber,
      vehicleCapacity,
      driverName,
      driverCell,
      distanceKm,
      lat,
      lng,
      hasErrors: errors.length > 0,
      errors,
      warnings,
    };

    if (routeName) routesSet.add(routeName);

    if (errors.length > 0) {
      invalidRows.push(row);
    } else {
      validRows.push(row);
    }
  }

  return {
    validRows,
    invalidRows,
    totalRows: validRows.length + invalidRows.length,
    routesDetected: Array.from(routesSet),
  };
}

/**
 * Official CSV Template matching the uploaded University schedule PDF
 */
export const OFFICIAL_SCHEDULE_CSV_TEMPLATE = `Route #,Route Name,Stop Sequence,Stop Name,Morning Time,Return Time,Vehicle Number,Capacity,Driver Name,Driver Cell #,Distance Km,Latitude,Longitude
1,Route 1: Cantt & Askari Express,1,Askari Phase # 1,7:15 AM,3:40 PM,Coaster # 1987,30,Zubair,0348-8838898,0.0,30.1850,71.4420
1,Route 1: Cantt & Askari Express,2,Jheel Chowk (Ghora Chowk),7:18 AM,3:43 PM,Coaster # 1987,30,Zubair,0348-8838898,1.2,30.1910,71.4480
1,Route 1: Cantt & Askari Express,3,Aziz Hotel Chowk,7:25 AM,3:48 PM,Coaster # 1987,30,Zubair,0348-8838898,2.5,30.1980,71.4550
1,Route 1: Cantt & Askari Express,4,Boman G Chowk Cantt,7:27 AM,3:50 PM,Coaster # 1987,30,Zubair,0348-8838898,3.3,30.2020,71.4580
1,Route 1: Cantt & Askari Express,5,SP Chowk,7:29 AM,3:52 PM,Coaster # 1987,30,Zubair,0348-8838898,4.1,30.2070,71.4600
1,Route 1: Cantt & Askari Express,6,High Court Chowk PSO Pump,7:31 AM,3:54 PM,Coaster # 1987,30,Zubair,0348-8838898,5.0,30.2110,71.4620
1,Route 1: Cantt & Askari Express,7,Chungi No # 1,7:33 AM,3:56 PM,Coaster # 1987,30,Zubair,0348-8838898,5.8,30.2160,71.4640
1,Route 1: Cantt & Askari Express,8,Pul Wasel Chowk,7:35 AM,3:58 PM,Coaster # 1987,30,Zubair,0348-8838898,6.7,30.2200,71.4660
1,Route 1: Cantt & Askari Express,9,Sakhi Sultan Colony / Razabad Chowk,7:37 AM,4:00 PM,Coaster # 1987,30,Zubair,0348-8838898,7.6,30.2240,71.4690
1,Route 1: Cantt & Askari Express,10,Sewara Chowk,7:40 AM,4:03 PM,Coaster # 1987,30,Zubair,0348-8838898,8.8,30.2290,71.4720
1,Route 1: Cantt & Askari Express,11,Nandla Chowk,7:43 AM,4:06 PM,Coaster # 1987,30,Zubair,0348-8838898,9.7,30.2330,71.4760
1,Route 1: Cantt & Askari Express,12,Faiz-E-Aam Nursery / Chungi # 5,7:49 AM,4:11 PM,Coaster # 1987,30,Zubair,0348-8838898,11.5,30.2400,71.4830
1,Route 1: Cantt & Askari Express,13,Northern Bypass Chowk,7:54 AM,4:15 PM,Coaster # 1987,30,Zubair,0348-8838898,13.6,30.2480,71.4920
1,Route 1: Cantt & Askari Express,14,Mehmood Kot,7:56 AM,4:18 PM,Coaster # 1987,30,Zubair,0348-8838898,14.8,30.2520,71.4980
1,Route 1: Cantt & Askari Express,15,BZU,8:00 AM,4:22 PM,Coaster # 1987,30,Zubair,0348-8838898,16.5,30.2570,71.5040
1,Route 1: Cantt & Askari Express,16,Buch Villas,8:03 AM,4:25 PM,Coaster # 1987,30,Zubair,0348-8838898,18.2,30.2600,71.5080
1,Route 1: Cantt & Askari Express,17,Campus,8:25 AM,3:30 PM,Coaster # 1987,30,Zubair,0348-8838898,21.4,30.2640,71.5120
2,Route 2: Old Shujabad & Dera Adda Corridor,1,Dreem Garden (Old Shujabad Road),7:15 AM,3:40 PM,Coaster # 7101,30,Usama,0340-8995436,0.0,30.1780,71.4390
2,Route 2: Old Shujabad & Dera Adda Corridor,2,Bilal Chowk,7:18 AM,3:43 PM,Coaster # 7101,30,Usama,0340-8995436,1.4,30.1840,71.4460
2,Route 2: Old Shujabad & Dera Adda Corridor,3,Aziz Hotel Chowk,7:20 AM,3:45 PM,Coaster # 7101,30,Usama,0340-8995436,2.8,30.1980,71.4550
2,Route 2: Old Shujabad & Dera Adda Corridor,4,Railway Station,7:21 AM,3:47 PM,Coaster # 7101,30,Usama,0340-8995436,3.7,30.1920,71.4630
2,Route 2: Old Shujabad & Dera Adda Corridor,5,Azmat Wasti Road,7:23 AM,3:49 PM,Coaster # 7101,30,Usama,0340-8995436,4.5,30.1950,71.4670
2,Route 2: Old Shujabad & Dera Adda Corridor,6,Dera Adda Chowk,7:26 AM,3:52 PM,Coaster # 7101,30,Usama,0340-8995436,5.4,30.1990,71.4710
2,Route 2: Old Shujabad & Dera Adda Corridor,7,Nowan Sheher Chowk,7:30 AM,3:56 PM,Coaster # 7101,30,Usama,0340-8995436,6.5,30.2050,71.4740
2,Route 2: Old Shujabad & Dera Adda Corridor,8,Art Council,7:33 AM,3:59 PM,Coaster # 7101,30,Usama,0340-8995436,7.3,30.2090,71.4770
2,Route 2: Old Shujabad & Dera Adda Corridor,9,MDA Chowk,7:35 AM,4:01 PM,Coaster # 7101,30,Usama,0340-8995436,8.1,30.2130,71.4800
2,Route 2: Old Shujabad & Dera Adda Corridor,10,Katchehry Chowk,7:37 AM,4:03 PM,Coaster # 7101,30,Usama,0340-8995436,9.0,30.2180,71.4830
2,Route 2: Old Shujabad & Dera Adda Corridor,11,Chungi No # 7 or 8,7:39 AM,4:05 PM,Coaster # 7101,30,Usama,0340-8995436,10.1,30.2240,71.4870
2,Route 2: Old Shujabad & Dera Adda Corridor,12,Brand Road Shell Petrol Pump / Gool Bagh,7:43 AM,4:09 PM,Coaster # 7101,30,Usama,0340-8995436,11.5,30.2310,71.4910
2,Route 2: Old Shujabad & Dera Adda Corridor,13,Chungi No # 6,7:45 AM,4:11 PM,Coaster # 7101,30,Usama,0340-8995436,12.6,30.2360,71.4950
2,Route 2: Old Shujabad & Dera Adda Corridor,14,Northern Bypass Chowk to MPS Road,7:55 AM,4:17 PM,Coaster # 7101,30,Usama,0340-8995436,15.2,30.2480,71.4920
2,Route 2: Old Shujabad & Dera Adda Corridor,15,Sehar Villas / University Chowk,8:00 AM,4:21 PM,Coaster # 7101,30,Usama,0340-8995436,17.3,30.2540,71.5030
2,Route 2: Old Shujabad & Dera Adda Corridor,16,Royal Orchard,8:04 AM,4:24 PM,Coaster # 7101,30,Usama,0340-8995436,19.5,30.2590,71.5070
2,Route 2: Old Shujabad & Dera Adda Corridor,17,Campus,8:25 AM,3:30 PM,Coaster # 7101,30,Usama,0340-8995436,23.1,30.2640,71.5120
3,Route 3: BCG Chowk & Hafiz Jamal Metro,1,BCG Chowk,7:30 AM,3:45 PM,Coaster # 3351,30,Sajid,0312-9787507,0.0,30.2010,71.4900
3,Route 3: BCG Chowk & Hafiz Jamal Metro,2,Chungi No # 14,7:35 AM,3:50 PM,Coaster # 3351,30,Sajid,0312-9787507,1.5,30.2060,71.4930
3,Route 3: BCG Chowk & Hafiz Jamal Metro,3,Hafiz Jamal Metro,7:37 AM,3:52 PM,Coaster # 3351,30,Sajid,0312-9787507,2.3,30.2100,71.4950
3,Route 3: BCG Chowk & Hafiz Jamal Metro,4,Dolat Gate Chowk,7:41 AM,3:56 PM,Coaster # 3351,30,Sajid,0312-9787507,3.4,30.2140,71.4970
3,Route 3: BCG Chowk & Hafiz Jamal Metro,5,Ali Chowk Masoom Shah Road,7:43 AM,3:58 PM,Coaster # 3351,30,Sajid,0312-9787507,4.2,30.2180,71.4990
3,Route 3: BCG Chowk & Hafiz Jamal Metro,6,Silver Karkhana (UBL Bank) / YDC Hospital,7:46 AM,4:01 PM,Coaster # 3351,30,Sajid,0312-9787507,5.3,30.2230,71.5010
3,Route 3: BCG Chowk & Hafiz Jamal Metro,7,Kumbaranwala Chowk,7:52 AM,4:06 PM,Coaster # 3351,30,Sajid,0312-9787507,6.6,30.2280,71.5030
3,Route 3: BCG Chowk & Hafiz Jamal Metro,8,Daewoo Bus Stand,7:54 AM,4:08 PM,Coaster # 3351,30,Sajid,0312-9787507,7.5,30.2320,71.5040
3,Route 3: BCG Chowk & Hafiz Jamal Metro,9,Wapda Main Office,7:56 AM,4:10 PM,Coaster # 3351,30,Sajid,0312-9787507,8.6,30.2370,71.5050
3,Route 3: BCG Chowk & Hafiz Jamal Metro,10,Rasheedabad Chowk / Chase Up,7:58 AM,4:12 PM,Coaster # 3351,30,Sajid,0312-9787507,9.7,30.2410,71.5060
3,Route 3: BCG Chowk & Hafiz Jamal Metro,11,Bilal Motors,7:59 AM,4:13 PM,Coaster # 3351,30,Sajid,0312-9787507,10.4,30.2440,71.5070
3,Route 3: BCG Chowk & Hafiz Jamal Metro,12,Eid Ghah Chowk,8:00 AM,4:15 PM,Coaster # 3351,30,Sajid,0312-9787507,11.3,30.2480,71.5080
3,Route 3: BCG Chowk & Hafiz Jamal Metro,13,Chungi No # 9,8:03 AM,4:18 PM,Coaster # 3351,30,Sajid,0312-9787507,12.6,30.2520,71.5090
3,Route 3: BCG Chowk & Hafiz Jamal Metro,14,Chungi No # 6,8:07 AM,4:21 PM,Coaster # 3351,30,Sajid,0312-9787507,14.1,30.2560,71.5100
3,Route 3: BCG Chowk & Hafiz Jamal Metro,15,Northern Bypass Chowk,8:09 AM,4:23 PM,Coaster # 3351,30,Sajid,0312-9787507,15.8,30.2600,71.5110
3,Route 3: BCG Chowk & Hafiz Jamal Metro,16,Campus,8:25 AM,3:30 PM,Coaster # 3351,30,Sajid,0312-9787507,18.9,30.2640,71.5120
4,Route 4: Rajasthan Marquee & MA Jinnah Road,1,Rajasthan Marquee,7:30 AM,3:45 PM,Coaster # 6786,30,Asim,0347-3345762,0.0,30.1960,71.4810
4,Route 4: Rajasthan Marquee & MA Jinnah Road,2,BCG Chowk,7:32 AM,3:47 PM,Coaster # 6786,30,Asim,0347-3345762,1.1,30.2010,71.4900
4,Route 4: Rajasthan Marquee & MA Jinnah Road,3,Vihari Chowk Faisal Movers,7:36 AM,3:50 PM,Coaster # 6786,30,Asim,0347-3345762,2.2,30.2050,71.4850
4,Route 4: Rajasthan Marquee & MA Jinnah Road,4,Jinnah Park,7:38 AM,3:52 PM,Coaster # 6786,30,Asim,0347-3345762,3.1,30.2100,71.4880
4,Route 4: Rajasthan Marquee & MA Jinnah Road,5,Sabzi Mandi,7:40 AM,3:54 PM,Coaster # 6786,30,Asim,0347-3345762,4.0,30.2150,71.4910
4,Route 4: Rajasthan Marquee & MA Jinnah Road,6,Madni Chowk,7:42 AM,3:56 PM,Coaster # 6786,30,Asim,0347-3345762,4.9,30.2200,71.4930
4,Route 4: Rajasthan Marquee & MA Jinnah Road,7,Kumbaranwala,7:45 AM,3:59 PM,Coaster # 6786,30,Asim,0347-3345762,6.2,30.2280,71.5030
4,Route 4: Rajasthan Marquee & MA Jinnah Road,8,Qasoori Chowk MA Jinnah Road,7:47 AM,4:01 PM,Coaster # 6786,30,Asim,0347-3345762,7.4,30.2330,71.4970
4,Route 4: Rajasthan Marquee & MA Jinnah Road,9,NADRA Office MA Jinnah Road,7:49 AM,4:03 PM,Coaster # 6786,30,Asim,0347-3345762,8.3,30.2380,71.4990
4,Route 4: Rajasthan Marquee & MA Jinnah Road,10,MDA Officers Cooperative Housing Society,7:51 AM,4:06 PM,Coaster # 6786,30,Asim,0347-3345762,9.5,30.2440,71.5020
4,Route 4: Rajasthan Marquee & MA Jinnah Road,11,Nangana Chowk,7:56 AM,4:11 PM,Coaster # 6786,30,Asim,0347-3345762,11.2,30.2520,71.5060
4,Route 4: Rajasthan Marquee & MA Jinnah Road,12,Campus,8:25 AM,3:30 PM,Coaster # 6786,30,Asim,0347-3345762,16.5,30.2640,71.5120
5,Route 5: Shalimar Metro & Wapda Town Express,1,Shalimar Metro / Mall of Multan,8:00 AM,3:45 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,0.0,30.2350,71.4880
5,Route 5: Shalimar Metro & Wapda Town Express,2,Northern Bypass Chowk,8:03 AM,3:48 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,2.1,30.2480,71.4920
5,Route 5: Shalimar Metro & Wapda Town Express,3,Model Town Chowk,8:05 AM,3:50 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,3.3,30.2490,71.4970
5,Route 5: Shalimar Metro & Wapda Town Express,4,Wapda Town Phase # 1,8:08 AM,3:53 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,4.5,30.2510,71.5010
5,Route 5: Shalimar Metro & Wapda Town Express,5,Nangana Chowk,8:10 AM,3:55 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,5.4,30.2520,71.5060
5,Route 5: Shalimar Metro & Wapda Town Express,6,Wapda Town Phase # 2,8:12 AM,3:57 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,6.2,30.2540,71.5070
5,Route 5: Shalimar Metro & Wapda Town Express,7,Green Fort,8:15 AM,4:00 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,7.3,30.2570,71.5085
5,Route 5: Shalimar Metro & Wapda Town Express,8,Dehar Chowk,8:17 AM,4:02 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,8.4,30.2590,71.5095
5,Route 5: Shalimar Metro & Wapda Town Express,9,Boys Hostel,8:20 AM,4:05 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,9.8,30.2615,71.5105
5,Route 5: Shalimar Metro & Wapda Town Express,10,Campus,8:25 AM,3:30 PM,Bus # BA-9757,50,Muhammad Waqas,0340-4905529,13.8,30.2640,71.5120`;
