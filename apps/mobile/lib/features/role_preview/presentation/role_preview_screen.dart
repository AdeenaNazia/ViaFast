import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_spacing.dart';
import '../../../core/widgets/app_card.dart';
import '../../../core/widgets/responsive.dart';
import '../../../core/widgets/status_indicator.dart';

/// Development-only launcher for the Student / Parent / Driver shells.
/// Explicitly NOT production authentication — it is gated to dev builds by the
/// router (see `guardRedirect` in app/router.dart).
class RolePreviewScreen extends StatelessWidget {
  const RolePreviewScreen({super.key});

  static const List<_RoleChoice> _roles = <_RoleChoice>[
    _RoleChoice(
      'Student',
      Icons.school_outlined,
      '/student',
      'Ride tracking, pass and trips',
    ),
    _RoleChoice(
      'Parent',
      Icons.family_restroom_outlined,
      '/parent',
      'Follow your child\u2019s bus',
    ),
    _RoleChoice(
      'Driver',
      Icons.navigation_outlined,
      '/driver',
      'Trip, passengers and route',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Role preview')),
      body: SafeArea(
        child: ResponsiveCenter(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
            children: [
              const Align(
                alignment: Alignment.centerLeft,
                child: StatusIndicator(
                  label: 'Development preview',
                  icon: Icons.construction,
                  tone: StatusTone.warn,
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Choose an experience to preview',
                style: theme.textTheme.titleLarge,
              ),
              const SizedBox(height: AppSpacing.xs),
              Text(
                'Development preview only — not production authentication. '
                'These shells are placeholders; no real accounts, data or '
                'permissions are involved yet.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              for (final role in _roles)
                AppCard(
                  onTap: () => context.go(role.route),
                  margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: theme.colorScheme.primaryContainer,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        ),
                        child: Icon(
                          role.icon,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(role.label, style: theme.textTheme.titleMedium),
                            const SizedBox(height: 2),
                            Text(
                              role.blurb,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(
                        Icons.chevron_right,
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleChoice {
  const _RoleChoice(this.label, this.icon, this.route, this.blurb);

  final String label;
  final IconData icon;
  final String route;
  final String blurb;
}
