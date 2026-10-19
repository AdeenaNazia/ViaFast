-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'PARENT', 'DRIVER', 'ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED');

-- CreateEnum
CREATE TYPE "StaffPassType" AS ENUM ('SINGLE_TRIP', 'TERM');

-- CreateEnum
CREATE TYPE "StaffRideStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('COASTER', 'BUS');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('IN_SERVICE', 'MAINTENANCE', 'RESERVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "RiderType" AS ENUM ('STUDENT', 'STAFF');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "TripDirection" AS ENUM ('INBOUND', 'RETURN');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'BOARDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BoardingEventType" AS ENUM ('WAITING', 'BOARDED', 'ALIGHTED', 'ABSENT', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BoardingSource" AS ENUM ('DRIVER', 'SYSTEM', 'GPS_GEOFENCE');

-- CreateEnum
CREATE TYPE "TrafficLevel" AS ENUM ('LOW', 'MODERATE', 'HEAVY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_WALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('BREAKDOWN', 'ACCIDENT', 'TRAFFIC', 'MEDICAL', 'SECURITY', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'DELAY', 'EMERGENCY', 'STATUS_CHANGE', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'AI_REVIEWED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AiVerdict" AS ENUM ('APPROVE', 'REVIEW_REQUIRED', 'REJECT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_e164" TEXT,
    "password_hash" TEXT,
    "primary_role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'INVITED',
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "student_number" TEXT NOT NULL,
    "roll_number" TEXT,
    "full_name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "avatar_url" TEXT,
    "enrollment_status" "EnrollmentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "license_class" TEXT,
    "rating_avg" DOUBLE PRECISION,
    "experience_years" INTEGER,
    "employment_status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuardianProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_e164" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuardianProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "staff_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "pass_type" "StaffPassType" NOT NULL DEFAULT 'SINGLE_TRIP',
    "valid_from" DATE,
    "valid_to" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentGuardian" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "guardian_id" TEXT NOT NULL,
    "relationship" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "can_track" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentGuardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "plate_number" TEXT NOT NULL,
    "vehicle_type" "VehicleType" NOT NULL,
    "seat_capacity" INTEGER NOT NULL,
    "model" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color_hex" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteStop" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distance_from_origin_km" DOUBLE PRECISION NOT NULL,
    "scheduled_inbound_time" TIME,
    "scheduled_return_time" TIME,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RouteStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RideAssignment" (
    "id" TEXT NOT NULL,
    "rider_type" "RiderType" NOT NULL,
    "student_id" TEXT,
    "staff_profile_id" TEXT,
    "route_id" TEXT NOT NULL,
    "pickup_stop_id" TEXT NOT NULL,
    "drop_stop_id" TEXT NOT NULL,
    "term_id" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "effective_from" DATE,
    "effective_to" DATE,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RideAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "service_date" DATE NOT NULL,
    "direction" "TripDirection" NOT NULL,
    "vehicle_id" TEXT,
    "driver_id" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_departure_at" TIMESTAMPTZ(6) NOT NULL,
    "scheduled_arrival_at" TIMESTAMPTZ(6) NOT NULL,
    "actual_departure_at" TIMESTAMPTZ(6),
    "actual_arrival_at" TIMESTAMPTZ(6),
    "delay_minutes" INTEGER NOT NULL DEFAULT 0,
    "current_stop_sequence" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardingEvent" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "rider_type" "RiderType" NOT NULL,
    "student_id" TEXT,
    "staff_profile_id" TEXT,
    "stop_id" TEXT NOT NULL,
    "event" "BoardingEventType" NOT NULL,
    "source" "BoardingSource" NOT NULL DEFAULT 'DRIVER',
    "recorded_by_user_id" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRideBooking" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "staff_profile_id" TEXT NOT NULL,
    "stop_id" TEXT NOT NULL,
    "status" "StaffRideStatus" NOT NULL DEFAULT 'REQUESTED',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "StaffRideBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationUpdate" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "trip_id" TEXT,
    "seq" BIGINT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "speed_kmh" DOUBLE PRECISION,
    "heading_deg" DOUBLE PRECISION,
    "accuracy_m" DOUBLE PRECISION,
    "altitude_m" DOUBLE PRECISION,
    "fuel_percent" DOUBLE PRECISION,
    "provider" TEXT NOT NULL,
    "device_recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "server_received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EtaEstimate" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "target_stop_id" TEXT,
    "eta_minutes" INTEGER NOT NULL,
    "confidence_percent" INTEGER NOT NULL,
    "distance_remaining_km" DOUBLE PRECISION NOT NULL,
    "traffic_level" "TrafficLevel" NOT NULL,
    "algorithm_version" TEXT NOT NULL,
    "computed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EtaEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInvoice" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "term_id" TEXT,
    "total_amount_pkr" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PKR',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "FeeInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount_pkr" DECIMAL(14,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "installment_id" TEXT,
    "amount_pkr" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT,
    "vehicle_id" TEXT,
    "driver_id" TEXT,
    "reported_by_user_id" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'LOW',
    "message" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMPTZ(6),

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'LOW',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience_role" "UserRole",
    "trip_id" TEXT,
    "route_id" TEXT,
    "vehicle_id" TEXT,
    "student_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RouteChangeRequest" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "current_assignment_id" TEXT NOT NULL,
    "requested_route_id" TEXT NOT NULL,
    "requested_stop_id" TEXT NOT NULL,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "ai_recommendation" "AiVerdict",
    "ai_reason" TEXT,
    "reviewed_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_at" TIMESTAMPTZ(6),

    CONSTRAINT "RouteChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "request_id" TEXT,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_e164_key" ON "User"("phone_e164");

-- CreateIndex
CREATE INDEX "User_primary_role_status_idx" ON "User"("primary_role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_user_id_key" ON "StudentProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_student_number_key" ON "StudentProfile"("student_number");

-- CreateIndex
CREATE INDEX "StudentProfile_enrollment_status_idx" ON "StudentProfile"("enrollment_status");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_user_id_key" ON "DriverProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_license_number_key" ON "DriverProfile"("license_number");

-- CreateIndex
CREATE INDEX "DriverProfile_employment_status_idx" ON "DriverProfile"("employment_status");

-- CreateIndex
CREATE UNIQUE INDEX "GuardianProfile_user_id_key" ON "GuardianProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_user_id_key" ON "StaffProfile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_staff_number_key" ON "StaffProfile"("staff_number");

-- CreateIndex
CREATE INDEX "StaffProfile_pass_type_idx" ON "StaffProfile"("pass_type");

-- CreateIndex
CREATE INDEX "StudentGuardian_guardian_id_idx" ON "StudentGuardian"("guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGuardian_student_id_guardian_id_key" ON "StudentGuardian"("student_id", "guardian_id");

-- CreateIndex
CREATE UNIQUE INDEX "Term_code_key" ON "Term"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_plate_number_key" ON "Vehicle"("plate_number");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Route_code_key" ON "Route"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RouteStop_route_id_sequence_key" ON "RouteStop"("route_id", "sequence");

-- CreateIndex
CREATE INDEX "RideAssignment_route_id_status_idx" ON "RideAssignment"("route_id", "status");

-- CreateIndex
CREATE INDEX "RideAssignment_student_id_idx" ON "RideAssignment"("student_id");

-- CreateIndex
CREATE INDEX "RideAssignment_staff_profile_id_idx" ON "RideAssignment"("staff_profile_id");

-- CreateIndex
CREATE INDEX "Trip_service_date_status_idx" ON "Trip"("service_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Trip_route_id_service_date_direction_key" ON "Trip"("route_id", "service_date", "direction");

-- CreateIndex
CREATE INDEX "BoardingEvent_trip_id_idx" ON "BoardingEvent"("trip_id");

-- CreateIndex
CREATE INDEX "BoardingEvent_student_id_occurred_at_idx" ON "BoardingEvent"("student_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "BoardingEvent_trip_id_student_id_event_occurred_at_key" ON "BoardingEvent"("trip_id", "student_id", "event", "occurred_at");

-- CreateIndex
CREATE INDEX "StaffRideBooking_staff_profile_id_idx" ON "StaffRideBooking"("staff_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "StaffRideBooking_trip_id_staff_profile_id_key" ON "StaffRideBooking"("trip_id", "staff_profile_id");

-- CreateIndex
CREATE INDEX "LocationUpdate_vehicle_id_device_recorded_at_idx" ON "LocationUpdate"("vehicle_id", "device_recorded_at");

-- CreateIndex
CREATE INDEX "LocationUpdate_trip_id_idx" ON "LocationUpdate"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "LocationUpdate_vehicle_id_seq_key" ON "LocationUpdate"("vehicle_id", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "EtaEstimate_trip_id_key" ON "EtaEstimate"("trip_id");

-- CreateIndex
CREATE INDEX "EtaEstimate_target_stop_id_idx" ON "EtaEstimate"("target_stop_id");

-- CreateIndex
CREATE INDEX "FeeInvoice_status_idx" ON "FeeInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FeeInvoice_student_id_term_id_key" ON "FeeInvoice"("student_id", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "Installment_invoice_id_number_key" ON "Installment"("invoice_id", "number");

-- CreateIndex
CREATE INDEX "Payment_invoice_id_status_idx" ON "Payment"("invoice_id", "status");

-- CreateIndex
CREATE INDEX "Payment_installment_id_idx" ON "Payment"("installment_id");

-- CreateIndex
CREATE INDEX "Incident_status_severity_idx" ON "Incident"("status", "severity");

-- CreateIndex
CREATE INDEX "Incident_trip_id_idx" ON "Incident"("trip_id");

-- CreateIndex
CREATE INDEX "Notification_type_severity_idx" ON "Notification"("type", "severity");

-- CreateIndex
CREATE INDEX "Notification_audience_role_idx" ON "Notification"("audience_role");

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "Notification"("created_at");

-- CreateIndex
CREATE INDEX "NotificationRead_user_id_idx" ON "NotificationRead"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_notification_id_user_id_key" ON "NotificationRead"("notification_id", "user_id");

-- CreateIndex
CREATE INDEX "RouteChangeRequest_student_id_status_idx" ON "RouteChangeRequest"("student_id", "status");

-- CreateIndex
CREATE INDEX "RouteChangeRequest_status_idx" ON "RouteChangeRequest"("status");

-- CreateIndex
CREATE INDEX "AuditEvent_entity_type_entity_id_idx" ON "AuditEvent"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "AuditEvent_actor_user_id_at_idx" ON "AuditEvent"("actor_user_id", "at");

-- CreateIndex
CREATE INDEX "AuditEvent_at_idx" ON "AuditEvent"("at");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuardianProfile" ADD CONSTRAINT "GuardianProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGuardian" ADD CONSTRAINT "StudentGuardian_guardian_id_fkey" FOREIGN KEY ("guardian_id") REFERENCES "GuardianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteStop" ADD CONSTRAINT "RouteStop_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_pickup_stop_id_fkey" FOREIGN KEY ("pickup_stop_id") REFERENCES "RouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_drop_stop_id_fkey" FOREIGN KEY ("drop_stop_id") REFERENCES "RouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RideAssignment" ADD CONSTRAINT "RideAssignment_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardingEvent" ADD CONSTRAINT "BoardingEvent_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardingEvent" ADD CONSTRAINT "BoardingEvent_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardingEvent" ADD CONSTRAINT "BoardingEvent_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "StaffProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardingEvent" ADD CONSTRAINT "BoardingEvent_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "RouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardingEvent" ADD CONSTRAINT "BoardingEvent_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRideBooking" ADD CONSTRAINT "StaffRideBooking_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRideBooking" ADD CONSTRAINT "StaffRideBooking_staff_profile_id_fkey" FOREIGN KEY ("staff_profile_id") REFERENCES "StaffProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRideBooking" ADD CONSTRAINT "StaffRideBooking_stop_id_fkey" FOREIGN KEY ("stop_id") REFERENCES "RouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationUpdate" ADD CONSTRAINT "LocationUpdate_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationUpdate" ADD CONSTRAINT "LocationUpdate_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtaEstimate" ADD CONSTRAINT "EtaEstimate_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EtaEstimate" ADD CONSTRAINT "EtaEstimate_target_stop_id_fkey" FOREIGN KEY ("target_stop_id") REFERENCES "RouteStop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInvoice" ADD CONSTRAINT "FeeInvoice_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInvoice" ADD CONSTRAINT "FeeInvoice_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "FeeInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "FeeInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "Installment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_reported_by_user_id_fkey" FOREIGN KEY ("reported_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteChangeRequest" ADD CONSTRAINT "RouteChangeRequest_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteChangeRequest" ADD CONSTRAINT "RouteChangeRequest_current_assignment_id_fkey" FOREIGN KEY ("current_assignment_id") REFERENCES "RideAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteChangeRequest" ADD CONSTRAINT "RouteChangeRequest_requested_route_id_fkey" FOREIGN KEY ("requested_route_id") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteChangeRequest" ADD CONSTRAINT "RouteChangeRequest_requested_stop_id_fkey" FOREIGN KEY ("requested_stop_id") REFERENCES "RouteStop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RouteChangeRequest" ADD CONSTRAINT "RouteChangeRequest_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- HAND-AUTHORED INTEGRITY CONSTRAINTS (not emitted by `prisma migrate diff`).
-- Prisma cannot express partial/filtered UNIQUE indexes or CHECK constraints
-- declaratively, so they live here. PRESERVE THIS BLOCK if the baseline is ever
-- regenerated. See apps/api/README.md → "Database-enforced integrity".
-- ═══════════════════════════════════════════════════════════════════════════

-- domain-model §1.4: at most ONE primary guardian per student.
CREATE UNIQUE INDEX "StudentGuardian_one_primary_per_student"
  ON "StudentGuardian"("student_id")
  WHERE "is_primary" = true;

-- domain-model §4.1 + ADR-017: at most ONE active, open-ended assignment per
-- student per term. (term_id may be NULL; Postgres treats NULLs as distinct, so
-- rows without a term are not blocked by this guard.)
CREATE UNIQUE INDEX "RideAssignment_one_active_per_student_term"
  ON "RideAssignment"("student_id", "term_id")
  WHERE "status" = 'ACTIVE' AND "effective_to" IS NULL AND "student_id" IS NOT NULL;

-- domain-model §4.1 / §4.4 + ADR-022: polymorphic rider — exactly one of
-- student_id / staff_profile_id is set and it must match rider_type. This is what
-- allows staff riders without ever creating fake student records.
ALTER TABLE "RideAssignment"
  ADD CONSTRAINT "RideAssignment_rider_xor" CHECK (
    ("rider_type" = 'STUDENT' AND "student_id" IS NOT NULL AND "staff_profile_id" IS NULL)
    OR
    ("rider_type" = 'STAFF' AND "staff_profile_id" IS NOT NULL AND "student_id" IS NULL)
  );

ALTER TABLE "BoardingEvent"
  ADD CONSTRAINT "BoardingEvent_rider_xor" CHECK (
    ("rider_type" = 'STUDENT' AND "student_id" IS NOT NULL AND "staff_profile_id" IS NULL)
    OR
    ("rider_type" = 'STAFF' AND "staff_profile_id" IS NOT NULL AND "student_id" IS NULL)
  );

