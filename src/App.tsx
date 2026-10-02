import React, { useState, useEffect } from 'react';
import {
  Role,
  TripType,
  TransportRoute,
  Vehicle,
  Driver,
  Student,
  ActiveTrip,
  AIRecommendation,
  TransportNotification,
  RouteChangeRequest,
  JourneyStatus,
  WhatIfCalculation,
} from './types';
import {
  INITIAL_ROUTES,
  INITIAL_VEHICLES,
  INITIAL_DRIVERS,
  INITIAL_STUDENTS,
  INITIAL_ACTIVE_TRIPS,
  INITIAL_AI_RECOMMENDATIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_ROUTE_CHANGE_REQUESTS,
  INITIAL_HISTORY,
  SEMESTER_INSTALLMENTS,
} from './data/initialData';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { StudentApp, ParentApp, DriverApp, AdminApp } from './apps';
import { PrintableScheduleModal } from './components/PrintableScheduleModal';
import { TransportDataImportModal } from './components/TransportDataImportModal';
import { AIExtraBusModal } from './components/AIExtraBusModal';
import { AIWhatIfModal } from './components/AIWhatIfModal';
import { AIRecommendationDrawer } from './components/AIRecommendationDrawer';
import { BatchRouteUpdateModal } from './components/BatchRouteUpdateModal';
import { StaffRideModal } from './components/StaffRideModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { AuthModal } from './components/AuthModal';
import { PaymentModal } from './components/PaymentModal';
import { analyzeBusBreakdown, runAIOptimization } from './utils/aiEngines';
import confetti from 'canvas-confetti';

export default function App() {
  // Main Domain State
  const [routes, setRoutes] = useState<TransportRoute[]>(INITIAL_ROUTES);
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [activeTrips, setActiveTrips] = useState<ActiveTrip[]>(INITIAL_ACTIVE_TRIPS);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(INITIAL_AI_RECOMMENDATIONS);
  const [notifications, setNotifications] = useState<TransportNotification[]>(INITIAL_NOTIFICATIONS);
  const [changeRequests, setChangeRequests] = useState<RouteChangeRequest[]>(INITIAL_ROUTE_CHANGE_REQUESTS);

  // App Navigation & Session State
  const [currentRole, setCurrentRole] = useState<Role>('landing');
  const [tripType, setTripType] = useState<TripType>('morning');
  const [isSimulating, setIsSimulating] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  // Modal Controls
  const [isSchedulePDFOpen, setIsSchedulePDFOpen] = useState(false);
  const [isDataImportOpen, setIsDataImportOpen] = useState(false);
  const [isExtraBusOpen, setIsExtraBusOpen] = useState(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isBatchUpdatesOpen, setIsBatchUpdatesOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);

  // Active User Profile
  const [activeStudentId, setActiveStudentId] = useState<string>(INITIAL_STUDENTS[0].id);
  const [activeDriverId, setActiveDriverId] = useState<string>(INITIAL_DRIVERS[1].id);
  const [activeUserProfile, setActiveUserProfile] = useState({
    name: 'Sarah Ahmed',
    avatar: INITIAL_STUDENTS[0].avatar,
    badge: 'CS-2023-104',
    role: 'student' as Role,
  });

  // Focus personas
  const currentStudent = students.find((s) => s.id === activeStudentId) || students[0];
  const currentRoute = routes.find((r) => r.id === currentStudent.routeId) || routes[1];
  const currentVehicle = vehicles.find((v) => v.id === currentRoute.busId) || vehicles[1];
  const currentDriver = drivers.find((d) => d.id === (currentRole === 'driver' ? activeDriverId : currentRoute.driverId)) || drivers[1];
  const currentActiveTrip = activeTrips.find((t) => t.routeId === currentRoute.id) || activeTrips[1];

  // Reserve fleet for AI extra bus and emergency swaps
  const reserveVehicle = vehicles.find((v) => v.status === 'Reserve') || vehicles[vehicles.length - 1];
  const reserveDriver = drivers.find((d) => d.status === 'Standby') || drivers[drivers.length - 1];

  // Live telemetry for the top bar (same math as the Admin HUD)
  const activeCapacity = vehicles.reduce((acc, v) => acc + (v.status === 'Active' ? v.capacity : 0), 0);
  const utilizationPercent = Math.round((students.length / (activeCapacity || 1)) * 100);
  const pendingRequests = changeRequests.filter((r) => r.status === 'Pending').length;

  // Simulation loop: incrementally move active buses
  useEffect(() => {
    if (!isSimulating) return;

    const intervalMs = Math.max(800, Math.round(2400 / simulationSpeed));
    const timer = setInterval(() => {
      setActiveTrips((prevTrips) =>
        prevTrips.map((trip) => {
          const route = routes.find((r) => r.id === trip.routeId);
          if (!route || route.stops.length < 2) return trip;

          const stops = route.stops;
          const curIdx = trip.currentStopIndex;
          const nextIdx = (curIdx + 1) % stops.length;
          const targetStop = stops[nextIdx];

          // Micro GPS movement step toward target stop
          const dLat = (targetStop.lat - trip.currentLat) * 0.25;
          const dLng = (targetStop.lng - trip.currentLng) * 0.25;

          const isNearTarget =
            Math.abs(trip.currentLat - targetStop.lat) < 0.001 &&
            Math.abs(trip.currentLng - targetStop.lng) < 0.001;

          const updatedIdx = isNearTarget ? nextIdx : curIdx;
          const newProgress = Math.min(100, Math.round((updatedIdx / (stops.length - 1)) * 100));

          return {
            ...trip,
            currentLat: trip.currentLat + dLat,
            currentLng: trip.currentLng + dLng,
            currentStopIndex: updatedIdx,
            progressPercent: newProgress,
          };
        })
      );
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isSimulating, simulationSpeed, routes]);

  // Handler: Advance bus stop manually (Driver action)
  const handleAdvanceStop = () => {
    setActiveTrips((prevTrips) =>
      prevTrips.map((trip) => {
        if (trip.routeId !== currentRoute.id) return trip;
        const nextIdx = Math.min(trip.currentStopIndex + 1, currentRoute.stops.length - 1);
        const targetStop = currentRoute.stops[nextIdx];
        return {
          ...trip,
          currentStopIndex: nextIdx,
          currentLat: targetStop.lat,
          currentLng: targetStop.lng,
          progressPercent: Math.round((nextIdx / (currentRoute.stops.length - 1)) * 100),
        };
      })
    );
  };

  // Handler: Update Student Journey Status
  const handleUpdateStudentStatus = (status: JourneyStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === currentStudent.id ? { ...s, journeyStatus: status } : s))
    );

    // Add a meaningful, child-specific alert for the guardian.
    const firstName = currentStudent.name.split(' ')[0];
    const corridor = currentRoute.name.split(':')[0];
    const stopName =
      currentRoute.stops.find((s) => s.id === currentStudent.pickupStopId)?.name || 'the pickup stop';
    const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const journeyCopy: Record<JourneyStatus, { title: string; message: string }> = {
      Waiting: {
        title: `${firstName} is waiting at the stop`,
        message: `${firstName} is waiting for ${corridor} at ${stopName}.`,
      },
      'Picked Up': {
        title: `${firstName} was picked up`,
        message: `${firstName} was picked up at ${stopName} and boarded ${currentVehicle.vehicleNumber} (${corridor}) at ${timeStr}.`,
      },
      'On Board': {
        title: `${firstName} boarded ${corridor}`,
        message: `${firstName} boarded ${currentVehicle.vehicleNumber} at ${stopName} at ${timeStr}.`,
      },
      'Dropped Off': {
        title: `${firstName} reached campus`,
        message: `${firstName} arrived at the campus terminal at ${timeStr} and cleared entry.`,
      },
      Absent: {
        title: `${firstName} is not travelling`,
        message: `${firstName} was marked absent for today's ${corridor} trip.`,
      },
    };
    const copy = journeyCopy[status];

    const newNotif: TransportNotification = {
      id: `notif-${Date.now()}`,
      type: status === 'Dropped Off' ? 'success' : 'status_change',
      title: copy.title,
      message: copy.message,
      timestamp: timeStr,
      read: false,
      targetRole: 'parent',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handler: Update individual passenger status from driver portal
  const handlePassengerStatusFromDriver = (studentId: string, status: JourneyStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, journeyStatus: status } : s))
    );
  };

  // Handler: Student Fee Payment
  const handlePayFee = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, feeStatus: 'Paid' as const, feeAmount: 0, feePaid: s.totalFee || 55000 } : s))
    );
    const targetStudent = students.find((s) => s.id === studentId) || currentStudent;
    const newNotif: TransportNotification = {
      id: `notif-${Date.now()}`,
      type: 'status_change',
      title: 'Transport Dues Cleared',
      message: `Semester transit fee payment of Rs. 28,000 received for ${targetStudent.name}.`,
      timestamp: 'Just now',
      read: false,
      targetRole: 'student',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Handler: Student Route Change Request
  const handleRequestRouteChange = (req: Partial<RouteChangeRequest>) => {
    const newReq: RouteChangeRequest = {
      id: `rc-${Date.now()}`,
      studentId: req.studentId || currentStudent.id,
      studentName: req.studentName || currentStudent.name,
      studentRollNumber: req.studentRollNumber || currentStudent.rollNumber,
      currentRouteId: req.currentRouteId || currentRoute.id,
      currentStopName: req.currentStopName || currentRoute.stops[0].name,
      requestedRouteId: req.requestedRouteId || currentRoute.id,
      requestedStopName: req.requestedStopName || currentRoute.stops[1].name,
      reason: req.reason || 'Address change',
      status: 'Pending',
      requestDate: 'Today',
    };
    setChangeRequests((prev) => [newReq, ...prev]);

    const notif: TransportNotification = {
      id: `notif-${Date.now()}`,
      type: 'recommendation',
      title: 'New Route Change Request',
      message: `${currentStudent.name} requested transfer to stop "${req.requestedStopName}".`,
      timestamp: 'Just now',
      read: false,
      targetRole: 'admin',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Batch Process Route Updates
  const handleBatchProcess = (requestIds: string[], action: 'approve' | 'reject') => {
    setChangeRequests((prev) =>
      prev.map((r) =>
        requestIds.includes(r.id)
          ? { ...r, status: action === 'approve' ? 'Approved' : 'Rejected' }
          : r
      )
    );

    if (action === 'approve') {
      // Reassign students
      requestIds.forEach((id) => {
        const req = changeRequests.find((r) => r.id === id);
        if (req) {
          setStudents((prev) =>
            prev.map((s) =>
              s.id === req.studentId ? { ...s, routeId: req.requestedRouteId } : s
            )
          );
        }
      });
    }

    const notif: TransportNotification = {
      id: `notif-${Date.now()}`,
      type: 'status_change',
      title: `Batch Route Update ${action === 'approve' ? 'Approved' : 'Processed'}`,
      message: `Administrator batch ${action}d ${requestIds.length} student route change requests.`,
      timestamp: 'Just now',
      read: false,
      targetRole: 'admin',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Staff Member Temporary Ride Booking
  const handleConfirmStaffRide = (booking: {
    staffName: string;
    department: string;
    routeId: string;
    stopName: string;
    tripDate: string;
  }) => {
    const newPassenger: Student = {
      id: `staff-${Date.now()}`,
      studentId: 'FACULTY-01',
      name: booking.staffName,
      rollNumber: 'FACULTY',
      email: `${booking.staffName.toLowerCase().replace(/[^a-z]/g, '')}@fast.edu.pk`,
      phone: '0300-1122334',
      department: booking.department,
      semester: 'Faculty',
      routeId: booking.routeId,
      pickupStopId: `${booking.routeId}-s1`,
      registrationStatus: 'Active',
      feeStatus: 'Paid',
      feeAmount: 0,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      journeyStatus: 'Waiting',
      isStaff: true,
    };

    setStudents((prev) => [newPassenger, ...prev]);

    const notif: TransportNotification = {
      id: `notif-${Date.now()}`,
      type: 'status_change',
      title: 'Faculty Ride Pass Issued',
      message: `Single-trip corridor pass issued to ${booking.staffName} (${booking.department}).`,
      timestamp: 'Just now',
      read: false,
      targetRole: 'driver',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Driver Incident Report
  const handleDriverIncident = (type: string, message: string) => {
    const notif: TransportNotification = {
      id: `notif-${Date.now()}`,
      type: 'delay',
      title: `Captain Alert: ${type}`,
      message: `Driver ${currentDriver.name} (${currentVehicle.vehicleNumber}): ${message}`,
      timestamp: 'Just now',
      read: false,
      targetRole: 'admin',
    };
    setNotifications((prev) => [notif, ...prev]);

    // Increase delay on active trip
    setActiveTrips((prev) =>
      prev.map((t) => (t.routeId === currentRoute.id ? { ...t, delayMinutes: t.delayMinutes + 8 } : t))
    );
  };

  // Handler: Execute AI Route Redistribution Recommendation
  const handleAcceptRecommendation = (rec: AIRecommendation) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === rec.id ? { ...r, status: 'accepted' } : r))
    );

    if (rec.type === 'redistribution') {
      // Reassign students from route 2 to route 4
      setStudents((prev) => {
        let count = 0;
        return prev.map((s) => {
          if (s.routeId === 'route-2' && count < 4) {
            count++;
            return { ...s, routeId: 'route-4' };
          }
          return s;
        });
      });
    }

    if (rec.type === 'breakdown_replace') {
      // Replace broken vehicle with reserve bus
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === 'veh-2') return { ...v, status: 'Maintenance' };
          if (v.id === reserveVehicle.id) return { ...v, status: 'Active' };
          return v;
        })
      );
      // Update route busId
      setRoutes((prev) =>
        prev.map((r) => (r.id === 'route-2' ? { ...r, busId: reserveVehicle.id } : r))
      );
    }

    setSelectedRecommendation(null);
    confetti({ particleCount: 50, spread: 60 });
  };

  // Handler: Accept Extra Bus Plan
  const handleAcceptExtraBus = (rec: AIRecommendation) => {
    setRecommendations((prev) => [
      { ...rec, status: 'accepted' },
      ...prev.filter((r) => r.id !== rec.id),
    ]);

    // Deploy reserve vehicle as active trip
    const newTrip: ActiveTrip = {
      id: `trip-extra-${Date.now()}`,
      routeId: 'route-5',
      busId: reserveVehicle.id,
      driverId: reserveDriver.id,
      tripType: 'morning',
      startedAt: '07:20 AM',
      currentLat: 30.2480,
      currentLng: 71.4920,
      currentStopIndex: 0,
      speedKmh: 38,
      progressPercent: 10,
      status: 'In Progress',
      delayMinutes: 0,
      trafficLevel: 'Low',
    };

    setActiveTrips((prev) => [...prev, newTrip]);
    setIsExtraBusOpen(false);
    confetti({ particleCount: 60, spread: 70 });
  };

  // Handler: Simulated Bus Breakdown Drill
  const handleTriggerBreakdown = () => {
    const brokenBus = currentVehicle;
    const affectedRoute = currentRoute;
    const passengersCount = 26;

    // Set trip speed to 0 and delayed
    setActiveTrips((prev) =>
      prev.map((t) =>
        t.busId === brokenBus.id ? { ...t, speedKmh: 0, delayMinutes: 20, status: 'Delayed' } : t
      )
    );

    // Create autonomous AI breakdown recommendation
    const rec = analyzeBusBreakdown(
      brokenBus,
      affectedRoute,
      reserveVehicle,
      reserveDriver,
      passengersCount
    );

    setRecommendations((prev) => [rec, ...prev]);
    setSelectedRecommendation(rec);

    const notif: TransportNotification = {
      id: `notif-${Date.now()}`,
      type: 'emergency',
      title: `Emergency Vehicle Alert: ${brokenBus.vehicleNumber}`,
      message: `${brokenBus.vehicleNumber} reported engine coolant fault near Boman G Chowk. ViaAI has synthesized a replacement dispatch with ${reserveVehicle.vehicleNumber}.`,
      timestamp: 'Just now',
      read: false,
      targetRole: 'admin',
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Handler: Import Success from CSV
  const handleImportSuccess = (newRoutes: TransportRoute[]) => {
    setRoutes(newRoutes);
    const notif: TransportNotification = {
      id: `notif-${Date.now()}`,
      type: 'status_change',
      title: 'Transport Schedule Imported',
      message: `Successfully synchronized ${newRoutes.length} official corridors with campus live tracking.`,
      timestamp: 'Just now',
      read: false,
      targetRole: 'admin',
    };
    setNotifications((prev) => [notif, ...prev]);
    confetti({ particleCount: 50, spread: 60 });
  };

  // Handler: Run the ViaAI route optimizer and open its recommendation
  const handleRunOptimization = () => {
    const optRec = runAIOptimization(routes, vehicles, students);
    if (optRec) {
      setSelectedRecommendation(optRec);
      confetti({ particleCount: 40, spread: 60 });
    }
  };

  // Handler: Mark a single notification as read
  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  // Handler: Mock Login & Account Switching
  const handleSelectUser = (user: {
    id: string;
    name: string;
    role: Role;
    email: string;
    badge: string;
    avatar: string;
    studentId?: string;
    driverId?: string;
  }) => {
    setCurrentRole(user.role);
    setActiveUserProfile({
      name: user.name,
      avatar: user.avatar,
      badge: user.badge,
      role: user.role,
    });
    if (user.studentId) setActiveStudentId(user.studentId);
    if (user.driverId) setActiveDriverId(user.driverId);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 flex flex-col">
      {/* Universal Header */}
      <Navbar
        currentRole={currentRole}
        onChangeRole={(role) => setCurrentRole(role)}
        onOpenSchedulePDF={() => setIsSchedulePDFOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        activeUserName={activeUserProfile.name}
        activeUserAvatar={activeUserProfile.avatar}
        activeUserBadge={activeUserProfile.badge}
        unreadCount={notifications.filter((n) => !n.read).length}
        activeBusCount={activeTrips.length}
        totalVehicles={vehicles.length}
        registeredStudents={students.length}
        utilizationPercent={utilizationPercent}
      />

      {/* Main Role-Based View — each shell owns its own navigation and pages */}
      <main className="flex-1 flex flex-col min-h-0">
        {currentRole === 'landing' && (
          <LandingPage
            onSelectRole={(role) => setCurrentRole(role)}
            onOpenSchedulePDF={() => setIsSchedulePDFOpen(true)}
            routes={routes}
            vehicles={vehicles}
            drivers={drivers}
          />
        )}

        {currentRole === 'student' && (
          <StudentApp
            student={currentStudent}
            route={currentRoute}
            vehicle={currentVehicle}
            driver={currentDriver}
            activeTrip={currentActiveTrip}
            onUpdateJourneyStatus={handleUpdateStudentStatus}
            onRequestRouteChange={handleRequestRouteChange}
            onPayFee={handlePayFee}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            students={students}
            routes={routes}
            vehicles={vehicles}
            activeTrips={activeTrips}
            tripType={tripType}
            onToggleTripType={setTripType}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating(!isSimulating)}
            simulationSpeed={simulationSpeed}
            onChangeSpeed={setSimulationSpeed}
            onResetSimulation={() => setActiveTrips(INITIAL_ACTIVE_TRIPS)}
            history={INITIAL_HISTORY}
            installments={SEMESTER_INSTALLMENTS}
            notifications={notifications}
          />
        )}

        {currentRole === 'parent' && (
          <ParentApp
            student={currentStudent}
            route={currentRoute}
            vehicle={currentVehicle}
            driver={currentDriver}
            activeTrip={currentActiveTrip}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
            notifications={notifications}
            onMarkNotificationRead={handleMarkNotificationRead}
            students={students}
            drivers={drivers}
            routes={routes}
            vehicles={vehicles}
            activeTrips={activeTrips}
            history={INITIAL_HISTORY}
            installments={SEMESTER_INSTALLMENTS}
            tripType={tripType}
            onToggleTripType={setTripType}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating(!isSimulating)}
            simulationSpeed={simulationSpeed}
            onChangeSpeed={setSimulationSpeed}
            onResetSimulation={() => setActiveTrips(INITIAL_ACTIVE_TRIPS)}
          />
        )}

        {currentRole === 'driver' && (
          <DriverApp
            driver={currentDriver}
            route={currentRoute}
            vehicle={currentVehicle}
            students={students}
            activeTrip={currentActiveTrip}
            onAdvanceStop={handleAdvanceStop}
            onUpdateStudentStatus={handlePassengerStatusFromDriver}
            onReportIncident={handleDriverIncident}
          />
        )}

        {currentRole === 'admin' && (
          <AdminApp
            routes={routes}
            vehicles={vehicles}
            drivers={drivers}
            students={students}
            activeTrips={activeTrips}
            recommendations={recommendations}
            pendingRequests={pendingRequests}
            tripType={tripType}
            onToggleTripType={setTripType}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating(!isSimulating)}
            simulationSpeed={simulationSpeed}
            onChangeSpeed={setSimulationSpeed}
            onResetSimulation={() => setActiveTrips(INITIAL_ACTIVE_TRIPS)}
            onOpenDataImport={() => setIsDataImportOpen(true)}
            onOpenExtraBus={() => setIsExtraBusOpen(true)}
            onOpenWhatIf={() => setIsWhatIfOpen(true)}
            onOpenBatchUpdates={() => setIsBatchUpdatesOpen(true)}
            onOpenStaffModal={() => setIsStaffModalOpen(true)}
            onOpenSchedulePDF={() => setIsSchedulePDFOpen(true)}
            onSelectRecommendation={(rec) => setSelectedRecommendation(rec)}
            onTriggerBreakdown={handleTriggerBreakdown}
            onAcceptRecommendation={handleAcceptRecommendation}
            onRunOptimization={handleRunOptimization}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">ViaFast</span>
            <span>• University Transport Management & Intelligence Platform</span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            FAST-NUCES Multan • Track. Predict. Optimize.
          </div>
        </div>
      </footer>

      {/* Global Modals & Drawers */}
      <PrintableScheduleModal
        isOpen={isSchedulePDFOpen}
        onClose={() => setIsSchedulePDFOpen(false)}
        routes={routes}
        drivers={drivers}
        vehicles={vehicles}
      />

      <TransportDataImportModal
        isOpen={isDataImportOpen}
        onClose={() => setIsDataImportOpen(false)}
        onImportSuccess={handleImportSuccess}
      />

      <AIExtraBusModal
        isOpen={isExtraBusOpen}
        onClose={() => setIsExtraBusOpen(false)}
        reserveVehicle={reserveVehicle}
        reserveDriver={reserveDriver}
        onAcceptExtraBus={handleAcceptExtraBus}
      />

      <AIWhatIfModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
        routes={routes}
        vehicles={vehicles}
        students={students}
        onApplyAction={(calc) => {
          if (calc.actionOption.includes('Reserve Bus')) {
            setIsExtraBusOpen(true);
          } else {
            const opt = runAIOptimization(routes, vehicles, students);
            if (opt) setSelectedRecommendation(opt);
          }
        }}
      />

      <AIRecommendationDrawer
        recommendation={selectedRecommendation}
        onClose={() => setSelectedRecommendation(null)}
        onAccept={handleAcceptRecommendation}
        onReject={(rec) => {
          setRecommendations((prev) =>
            prev.map((r) => (r.id === rec.id ? { ...r, status: 'rejected' } : r))
          );
          setSelectedRecommendation(null);
        }}
      />

      <BatchRouteUpdateModal
        isOpen={isBatchUpdatesOpen}
        onClose={() => setIsBatchUpdatesOpen(false)}
        requests={changeRequests}
        routes={routes}
        onBatchProcess={handleBatchProcess}
      />

      <StaffRideModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        routes={routes}
        vehicles={vehicles}
        onConfirmStaffRide={handleConfirmStaffRide}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={(id) =>
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          )
        }
        onClearAll={() => setNotifications([])}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentRole={currentRole}
        onSelectUser={handleSelectUser}
        students={students}
        drivers={drivers}
      />

      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        student={currentStudent}
        route={currentRoute}
        onSuccessPayment={(id) => handlePayFee(id)}
      />
    </div>
  );
}
