import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/role_shell.dart';

/// Parent/Guardian experience shell (placeholder).
class ParentShell extends StatelessWidget {
  const ParentShell({super.key});

  static const List<RoleDestination> _destinations = <RoleDestination>[
    RoleDestination(
      icon: Icons.home_outlined,
      label: 'Home',
      blurb: 'Your child\u2019s ride status and ETA.',
    ),
    RoleDestination(
      icon: Icons.people_outline,
      label: 'Children',
      blurb: 'Switch between linked children.',
    ),
    RoleDestination(
      icon: Icons.map_outlined,
      label: 'Track',
      blurb: 'Follow the assigned bus (simulated GPS).',
    ),
    RoleDestination(
      icon: Icons.notifications_none,
      label: 'Alerts',
      blurb: 'Pickup, drop and delay notifications.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return RoleShell(
      roleLabel: 'Parent',
      destinations: _destinations,
      onExit: () => context.go('/preview'),
    );
  }
}
