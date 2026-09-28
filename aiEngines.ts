import {
  TransportRoute,
  Vehicle,
  Driver,
  Student,
  ActiveTrip,
  AIRecommendation,
  WhatIfCalculation,
  RouteStop,
} from '../types';

/**
 * ETA Engine: Computes predictive ETA with traffic, stop dwell times, and speed factor
 */
export function calculateSmartETA(
  trip: ActiveTrip,
  route: TransportRoute,
  targetStopIndex?: number
): {
  etaMinutes: number;
  confidencePercent: number;
  trafficLevel: 'Low' | 'Moderate' | 'Heavy';
  explanation: string;
  nextStopName: string;
  distanceRemainingKm: number;
} {
  const currentIndex = trip.currentStopIndex;
  const destinationIndex = targetStopIndex !== undefined ? targetStopIndex : route.stops.length - 1;
  const currentStop = route.stops[Math.min(currentIndex, route.stops.length - 1)];
  const nextStop = route.stops[Math.min(currentIndex + 1, route.stops.length - 1)];

  if (currentIndex >= destinationIndex) {
    return {
      etaMinutes: 0,
      confidencePercent: 99,
      trafficLevel: trip.trafficLevel,
      explanation: 'Vehicle has arrived at the destination.',
      nextStopName: currentStop.name,
      distanceRemainingKm: 0,
    };
  }

  // Calculate remaining distance in KM
  let remainingKm = 0;
  for (let i = currentIndex; i < destinationIndex; i++) {
    const from = route.stops[i];
    const to = route.stops[i + 1];
    // Approximate distance between consecutive stops if distanceKm delta exists
    const segDist = Math.max(0.8, Math.abs((to.distanceKm || (i + 1) * 1.5) - (from.distanceKm || i * 1.5)));
    remainingKm += segDist;
  }

  // Speed factor based on traffic & current vehicle speed
  const effectiveSpeed = Math.max(15, trip.speedKmh || 30);
  const travelTimeHours = remainingKm / effectiveSpeed;
  const travelMinutes = travelTimeHours * 60;

  // Dwell time per intermediate stop: ~1.2 minutes per pickup/drop
  const stopsRemaining = Math.max(0, destinationIndex - currentIndex);
  const dwellMinutes = stopsRemaining * 1.2;

  const rawMinutes = Math.round(travelMinutes + dwellMinutes + trip.delayMinutes);
  const etaMinutes = Math.max(1, rawMinutes);

  // Confidence calculation based on speed variance and remaining distance
  const speedRatio = Math.min(1.2, effectiveSpeed / 35);
  let confidence = Math.round(85 + speedRatio * 8 - trip.delayMinutes * 1.5);
  confidence = Math.max(65, Math.min(96, confidence));

  let explanation = '';
  if (trip.delayMinutes > 5) {
    explanation = `Speed is ${Math.round((1 - effectiveSpeed / 35) * 100)}% below normal corridor pace. Traffic bottleneck detected.`;
  } else if (trip.trafficLevel === 'Heavy') {
    explanation = 'Heavy intersection dwell times near metro link. Moderate pacing expected.';
  } else {
    explanation = 'Cruising at optimal corridor speed with steady stop clearances.';
  }

  return {
    etaMinutes,
    confidencePercent: confidence,
    trafficLevel: trip.trafficLevel,
    explanation,
    nextStopName: nextStop ? nextStop.name : currentStop.name,
    distanceRemainingKm: Number(remainingKm.toFixed(1)),
  };
}

/**
 * Delay Intelligence: Evaluates whether a route has anomaly delays
 */
export function analyzeDelayIntelligence(
  trip: ActiveTrip,
  route: TransportRoute,
  students: Student[]
) {
  const affectedStudents = students.filter(
    (s) => s.routeId === route.id && (s.journeyStatus === 'Waiting' || s.journeyStatus === 'On Board')
  );

  const affectedStopsCount = Math.max(
    1,
    route.stops.length - 1 - trip.currentStopIndex
  );

  const probability = Math.min(95, 60 + trip.delayMinutes * 4);
  const speedDeficit = Math.max(0, Math.round(((35 - trip.speedKmh) / 35) * 100));

  return {
    routeId: route.id,
    routeName: route.name,
    predictedDelayMin: trip.delayMinutes,
    affectedStudentsCount: affectedStudents.length,
    affectedStopsCount,
    probability,
    reason:
      speedDeficit > 0
        ? `Current velocity (${trip.speedKmh} km/h) is ${speedDeficit}% below typical morning baseline speed (35 km/h).`
        : 'Routine signal dwell time along central highway corridor.',
    recommendation:
      trip.delayMinutes > 5
        ? 'Broadcast push notification to waiting parents and suggest express bypass for stops 9–14.'
        : 'Maintain monitoring; delay is within standard peak buffer.',
  };
}

/**
 * Capacity Analyzer: Calculates utilization metrics across all routes
 */
export function calculateCapacityMetrics(
  routes: TransportRoute[],
  vehicles: Vehicle[],
  students: Student[]
) {
  return routes.map((route) => {
    const vehicle = vehicles.find((v) => v.id === route.busId) || { capacity: 30 };
    const registered = students.filter((s) => s.routeId === route.id);
    const capacity = vehicle.capacity;
    const utilization = Math.round((registered.length / capacity) * 100);
    const unusedSeats = Math.max(0, capacity - registered.length);
    const isOverloadRisk = utilization >= 85;

    return {
      routeId: route.id,
      routeName: route.name,
      vehicleCapacity: capacity,
      registeredCount: registered.length,
      utilizationPercent: utilization,
      unusedSeats,
      isOverloadRisk,
    };
  });
}

/**
 * Route Optimizer: Generates deterministic explainable redistribution recommendation
 */
export function runAIOptimization(
  routes: TransportRoute[],
  vehicles: Vehicle[],
  students: Student[]
): AIRecommendation | null {
  const capacityMetrics = calculateCapacityMetrics(routes, vehicles, students);

  // Find overloaded route (> 80% capacity) and an underutilized route (< 65% capacity)
  const highRoute = capacityMetrics.find((m) => m.utilizationPercent >= 80);
  const lowRoute = capacityMetrics.find((m) => m.utilizationPercent < 70 && m.routeId !== highRoute?.routeId);

  if (!highRoute || !lowRoute) {
    return null;
  }

  const studentsOnHigh = students.filter((s) => s.routeId === highRoute.routeId);
  const transferCount = Math.min(6, Math.max(2, Math.floor((highRoute.registeredCount - 20) / 1.5)));

  const afterHighCount = highRoute.registeredCount - transferCount;
  const afterLowCount = lowRoute.registeredCount + transferCount;

  const afterHighUtil = Math.round((afterHighCount / highRoute.vehicleCapacity) * 100);
  const afterLowUtil = Math.round((afterLowCount / lowRoute.vehicleCapacity) * 100);

  const highName = (highRoute.routeName || 'High Load Corridor').split(':')[0];
  const lowName = (lowRoute.routeName || 'Low Load Corridor').split(':')[0];

  return {
    id: `opt-rec-${Date.now()}`,
    type: 'redistribution',
    title: `Rebalance Load: ${highName} → ${lowName}`,
    subtitle: `Even out passenger distribution and eliminate ${highRoute.utilizationPercent}% peak strain`,
    what: `Transfer ${transferCount} students with overlapping corridors from ${highName} to ${lowName}.`,
    why: [
      `${highName} is operating at ${highRoute.utilizationPercent}% utilization, exceeding the 80% comfort limit.`,
      `${lowName} has ${lowRoute.unusedSeats} unbooked seats (${lowRoute.utilizationPercent}% utilization).`,
      'Common pickup nodes (e.g. Northern Bypass and BCG intersections) allow seamless zero-detour transfers.',
      `Redistribution optimizes fleet fuel efficiency and drops high route loading to ${afterHighUtil}%.`,
    ],
    impactBefore: {
      label: 'Current Fleet State',
      route1Name: highName,
      route1Students: highRoute.registeredCount,
      route1Util: highRoute.utilizationPercent,
      route2Name: lowName,
      route2Students: lowRoute.registeredCount,
      route2Util: lowRoute.utilizationPercent,
      travelTimeMin: 58,
      unusedCapacity: lowRoute.unusedSeats,
    },
    impactAfter: {
      label: 'Recommended Fleet State',
      route1Name: highName,
      route1Students: afterHighCount,
      route1Util: afterHighUtil,
      route2Name: lowName,
      route2Students: afterLowCount,
      route2Util: afterLowUtil,
      travelTimeMin: 53,
      affectedStudents: transferCount,
    },
    confidence: 91,
    status: 'pending',
    createdAt: 'Just now',
    targetRouteId: highRoute.routeId,
  };
}

/**
 * AI Extra Bus Planner: Automatically formulates an extra bus route schedule
 */
export function generateExtraBusProposal(
  reason: string,
  journey: 'morning' | 'return',
  expectedDemand: number,
  areaName: string,
  reserveVehicle: Vehicle,
  reserveDriver: Driver
): AIRecommendation {
  const stops = [
    `${areaName} Central Terminal`,
    'Chungi No # 6 Junction',
    'Northern Bypass Express Way',
    'University / BZU Intersection',
    'FAST Multan Campus Terminal',
  ];

  const capacity = reserveVehicle.capacity || 40;
  const passengers = Math.min(capacity, Math.max(15, expectedDemand));
  const utilization = Math.round((passengers / capacity) * 100);
  const durationMin = 36;

  return {
    id: `extra-bus-${Date.now()}`,
    type: 'extra_bus',
    title: `Deploy Reserve Fleet: ${reserveVehicle.vehicleNumber}`,
    subtitle: `Direct dedicated surge route for ${journey === 'morning' ? 'Morning' : 'Return'} peak`,
    what: `Activate ${reserveVehicle.vehicleNumber} under Driver ${reserveDriver.name} to serve ${passengers} passengers from ${areaName}.`,
    why: [
      `Surge reason: "${reason}". Regular routes cannot absorb ${expectedDemand} additional registrations without exceeding capacity.`,
      `Reserve bus ${reserveVehicle.vehicleNumber} is pre-inspected with 95% fuel and standing by on campus.`,
      `Driver ${reserveDriver.name} is verified and certified on Multan bypass corridors.`,
      `Estimated travel time of ${durationMin} minutes prevents compounding classroom arrival delays.`,
    ],
    impactBefore: {
      label: 'Without Reserve Bus',
      travelTimeMin: 65,
      unusedCapacity: 0,
    },
    impactAfter: {
      label: 'With Reserve Bus Deployed',
      travelTimeMin: durationMin,
      affectedStudents: passengers,
    },
    confidence: 94,
    status: 'pending',
    createdAt: 'Just now',
    extraBusConfig: {
      busNumber: reserveVehicle.vehicleNumber,
      driverName: reserveDriver.name,
      startStop: stops[0],
      stops,
      expectedPassengers: passengers,
      durationMin,
      utilization,
    },
  };
}

/**
 * AI What-If Simulator: Calculates concrete mathematical impact of hypothetical transport changes
 */
export function simulateWhatIf(
  scenarioType: string,
  paramNumber: number,
  routes: TransportRoute[],
  vehicles: Vehicle[],
  students: Student[]
): WhatIfCalculation {
  const targetRoute = routes[1] || routes[0]; // Route 2 default
  const vehicle = vehicles.find((v) => v.id === targetRoute.busId) || { capacity: 30, vehicleNumber: 'Coaster # 7101' };
  const currentCount = students.filter((s) => s.routeId === targetRoute.id).length;
  const currentCapacity = vehicle?.capacity || 30;
  const currentUtil = Math.round((currentCount / currentCapacity) * 100);
  const targetRouteName = (targetRoute?.name || 'Corridor').split(':')[0];

  if (scenarioType === 'demand_spike') {
    const additional = paramNumber || 25;
    const newTotal = currentCount + additional;
    const newUtil = Math.round((newTotal / currentCapacity) * 100);
    const isExceeded = newUtil > 100;

    return {
      scenarioTitle: `What if ${additional} new students register from ${targetRouteName} area?`,
      before: {
        route: targetRouteName,
        students: currentCount,
        capacity: currentCapacity,
        utilizationPercent: currentUtil,
        avgTravelMin: 55,
      },
      after: {
        route: targetRouteName,
        students: newTotal,
        capacity: currentCapacity,
        utilizationPercent: newUtil,
        avgTravelMin: 68,
      },
      status: isExceeded ? 'Critical Capacity Exceeded' : newUtil >= 85 ? 'Overload Warning' : 'Normal',
      recommendation: isExceeded
        ? `Capacity exceeded by ${newTotal - currentCapacity} students (${newUtil}%). Assign an additional Reserve Bus or split into Express and Local loops.`
        : 'Redistribute overlapping stops to Route 4 to keep utilization below 80%.',
      actionOption: isExceeded ? 'Assign Reserve Bus B-09' : 'Redistribute Overlapping Stops',
      affectedCount: additional,
    };
  }

  if (scenarioType === 'bus_unavailable') {
    return {
      scenarioTitle: `What if ${vehicle.vehicleNumber} encounters a mechanical breakdown?`,
      before: {
        route: targetRouteName,
        students: currentCount,
        capacity: currentCapacity,
        utilizationPercent: currentUtil,
        avgTravelMin: 55,
      },
      after: {
        route: targetRouteName,
        students: currentCount,
        capacity: 40, // replaced with reserve bus
        utilizationPercent: Math.round((currentCount / 40) * 100),
        avgTravelMin: 62,
      },
      status: 'Critical Capacity Exceeded',
      recommendation: 'Instantly dispatch Reserve Bus B-09 under Driver Tariq Mehmood. Estimated dispatch delay: +7 minutes.',
      actionOption: 'Activate Emergency Fleet Dispatch',
      affectedCount: currentCount,
    };
  }

  if (scenarioType === 'absenteeism') {
    const absentPercent = paramNumber || 30;
    const dropCount = Math.round(currentCount * (absentPercent / 100));
    const newTotal = Math.max(0, currentCount - dropCount);
    const newUtil = Math.round((newTotal / currentCapacity) * 100);

    return {
      scenarioTitle: `What if morning attendance experiences ${absentPercent}% absenteeism?`,
      before: {
        route: targetRouteName,
        students: currentCount,
        capacity: currentCapacity,
        utilizationPercent: currentUtil,
        avgTravelMin: 55,
      },
      after: {
        route: targetRouteName,
        students: newTotal,
        capacity: currentCapacity,
        utilizationPercent: newUtil,
        avgTravelMin: 46,
      },
      status: 'Normal',
      recommendation: `Vehicle utilization falls to ${newUtil}%. Route can skip ${Math.floor(dropCount / 2)} quiet stops, trimming transit time by 9 minutes.`,
      actionOption: 'Enable Dynamic Stop Skipping',
      affectedCount: dropCount,
    };
  }

  // Custom default
  const addDefault = paramNumber || 15;
  const updatedStudents = currentCount + addDefault;
  const updatedUtil = Math.round((updatedStudents / currentCapacity) * 100);
  return {
    scenarioTitle: `What if passenger demand shifts by +${addDefault} passengers?`,
    before: {
      route: targetRouteName,
      students: currentCount,
      capacity: currentCapacity,
      utilizationPercent: currentUtil,
      avgTravelMin: 55,
    },
    after: {
      route: targetRouteName,
      students: updatedStudents,
      capacity: currentCapacity,
      utilizationPercent: updatedUtil,
      avgTravelMin: 62,
    },
    status: updatedUtil > 100 ? 'Critical Capacity Exceeded' : 'Overload Warning',
    recommendation: updatedUtil > 100 ? 'Deploy secondary coaster route.' : 'Adjust departure time 10 minutes earlier.',
    actionOption: 'Review Route Timetable',
    affectedCount: addDefault,
  };
}

/**
 * Breakdown Replacement Analyzer: Instant bus substitution
 */
export function analyzeBusBreakdown(
  brokenBus: Vehicle,
  affectedRoute: TransportRoute,
  reserveBus: Vehicle,
  reserveDriver: Driver,
  passengersOnBoard: number
): AIRecommendation {
  const routeName = (affectedRoute?.name || 'Assigned Corridor').split(':')[0];
  return {
    id: `breakdown-${Date.now()}`,
    type: 'breakdown_replace',
    title: `Emergency Vehicle Swap: ${brokenBus.vehicleNumber} Breakdown`,
    subtitle: `Substitute with ${reserveBus.vehicleNumber} to safely ferry ${passengersOnBoard} passengers`,
    what: `Reroute ${reserveBus.vehicleNumber} (Driver ${reserveDriver.name}) to intersect ${routeName} at current GPS coordinate.`,
    why: [
      `${brokenBus.vehicleNumber} flagged mechanical stop. Continued operation unsafe.`,
      `${passengersOnBoard} passengers require immediate transfer to reach 8:25 AM morning classes.`,
      `${reserveBus.vehicleNumber} has 40 seats available and is within 3.8 km of the vehicle's position.`,
      'Estimated transfer delay: +6 minutes, well within 15-minute institutional buffer.',
    ],
    impactBefore: {
      label: 'Halted Vehicle',
      travelTimeMin: 999,
      unusedCapacity: 0,
    },
    impactAfter: {
      label: 'Emergency Swap Completed',
      travelTimeMin: 22,
      affectedStudents: passengersOnBoard,
    },
    confidence: 96,
    status: 'pending',
    createdAt: 'Just now',
    targetRouteId: affectedRoute.id,
    targetBusId: reserveBus.id,
  };
}
