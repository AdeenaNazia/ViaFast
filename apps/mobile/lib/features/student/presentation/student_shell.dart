import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/role_shell.dart';

/// Student experience shell (placeholder). Establishes the student navigation
/// structure only — no migrated features or fabricated data in this phase.
class StudentShell extends StatelessWidget {
  const StudentShell({super.key});

  static const List<RoleDestination> _destinations = <RoleDestination>[
    RoleDestination(
      icon: Icons.home_outlined,
      label: 'Home',
      blurb: 'My ride summary, ETA and occupancy.',
    ),
    RoleDestination(
      icon: Icons.map_outlined,
      label: 'Track',
      blurb: 'Live bus position (simulated GPS).',
    ),
    RoleDestination(
      icon: Icons.qr_code_2,
      label: 'Pass',
      blurb: 'Digital boarding pass.',
    ),
    RoleDestination(
      icon: Icons.more_horiz,
      label: 'More',
      blurb: 'Trips, fees and settings.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      roleLabel: 'Student',
      destinations: _destinations,
      onExit: () => context.go('/preview'),
    );
  }
}
