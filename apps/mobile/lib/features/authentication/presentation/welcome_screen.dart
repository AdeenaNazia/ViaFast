import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/app_spacing.dart';
import '../../../core/config/env.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/responsive.dart';
import '../../../core/widgets/status_indicator.dart';

/// Entry point: brand identity plus a clear path into sign-in. The development
/// role-preview shortcut only appears in a dev build.
class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final env = ref.watch(envConfigProvider);
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: ResponsiveCenter(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const _BrandMark(),
              const SizedBox(height: AppSpacing.lg),
              Text(
                'ViaFast',
                textAlign: TextAlign.center,
                style: theme.textTheme.displayLarge,
              ),
              const SizedBox(height: AppSpacing.sm),
              Text(
                'Campus transport, tracked live.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyLarge?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                label: 'Sign in',
                icon: Icons.login,
                onPressed: () => context.go('/login'),
              ),
              if (env.isDev) ...[
                const SizedBox(height: AppSpacing.sm),
                TextButton.icon(
                  onPressed: () => context.go('/preview'),
                  icon: const Icon(Icons.science_outlined, size: 18),
                  label: const Text('Development role preview'),
                ),
                const SizedBox(height: AppSpacing.md),
                const Center(
                  child: StatusIndicator(
                    label: 'Dev build — no backend',
                    icon: Icons.construction,
                    tone: StatusTone.warn,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Container(
        width: 96,
        height: 96,
        decoration: BoxDecoration(
          color: scheme.primary,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        ),
        child: const Icon(
          Icons.directions_bus_rounded,
          size: 52,
          color: Colors.white,
        ),
      ),
    );
  }
}
