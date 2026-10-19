import 'package:flutter/material.dart';

import '../../app/theme/app_spacing.dart';
import 'status_indicator.dart';

/// A single bottom-navigation destination in a role shell (placeholder phase).
class RoleDestination {
  const RoleDestination({
    required this.icon,
    required this.label,
    this.blurb = '',
  });

  final IconData icon;
  final String label;
  final String blurb;
}

/// Lightweight scaffold shared by the Student, Parent and Driver previews:
/// an app bar with an exit action, a [NavigationBar], and placeholder pages.
///
/// Real features are migrated in later phases; this only establishes the
/// per-role navigation structure.
class RoleShell extends StatefulWidget {
  const RoleShell({
    super.key,
    required this.roleLabel,
    required this.destinations,
    required this.onExit,
  });

  final String roleLabel;
  final List<RoleDestination> destinations;
  final VoidCallback onExit;

  @override
  State<RoleShell> createState() => _RoleShellState();
}

class _RoleShellState extends State<RoleShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.roleLabel),
        actions: [
          TextButton.icon(
            onPressed: widget.onExit,
            icon: const Icon(Icons.logout, size: 18),
            label: const Text('Exit'),
          ),
          const SizedBox(width: AppSpacing.sm),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: [
          for (final destination in widget.destinations)
            PlaceholderPage(destination: destination),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: [
          for (final destination in widget.destinations)
            NavigationDestination(
              icon: Icon(destination.icon),
              label: destination.label,
            ),
        ],
      ),
    );
  }
}

/// Neutral "not built yet" body for a shell tab. Fabricates no data.
class PlaceholderPage extends StatelessWidget {
  const PlaceholderPage({super.key, required this.destination});

  final RoleDestination destination;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final blurb = destination.blurb.isEmpty
        ? 'This screen is a placeholder. Features are migrated in a later phase.'
        : destination.blurb;

    return SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(destination.icon, size: 44, color: theme.colorScheme.primary),
              const SizedBox(height: AppSpacing.md),
              Text(destination.label, style: theme.textTheme.titleLarge),
              const SizedBox(height: AppSpacing.sm),
              const StatusIndicator(
                label: 'Placeholder',
                icon: Icons.hourglass_empty,
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                blurb,
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
