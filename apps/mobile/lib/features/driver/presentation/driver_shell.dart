import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/role_shell.dart';

/// Driver/"Captain" experience shell (placeholder).
class DriverShell extends StatelessWidget {
  const DriverShell({super.key});

  static const List<RoleDestination> _destinations = <RoleDestination>[
    RoleDestination(
      icon: Icons.navigation_outlined,
      label: 'Trip',
      blurb: 'Current trip progress and next stop.',
    ),
    RoleDestination(
      icon: Icons.people_outline,
      label: 'Passengers',
      blurb: 'Boarding and journey status.',
    ),
    RoleDestination(
      icon: Icons.route_outlined,
      label: 'Route',
      blurb: 'Assigned corridor and stop sequence.',
    ),
    RoleDestination(
      icon: Icons.person_outline,
      label: 'Profile',
      blurb: 'Driver and vehicle details.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      roleLabel: 'Driver',
      destinations: _destinations,
      onExit: () => context.go('/preview'),
    );
  }
}
