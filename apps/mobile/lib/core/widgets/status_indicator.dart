import 'package:flutter/material.dart';

import '../../app/theme/app_colors.dart';

enum StatusTone { neutral, info, ok, warn, danger }

/// A pill that always pairs an icon with a text label, so status is never
/// conveyed by color alone (accessibility requirement carried over from web).
class StatusIndicator extends StatelessWidget {
  const StatusIndicator({
    super.key,
    required this.label,
    required this.icon,
    this.tone = StatusTone.neutral,
  });

  final String label;
  final IconData icon;
  final StatusTone tone;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;

    final Color foreground;
    final Color background;
    switch (tone) {
      case StatusTone.ok:
        foreground = AppColors.ok;
        background = AppColors.ok.withValues(alpha: 0.12);
      case StatusTone.warn:
        foreground = AppColors.warn;
        background = AppColors.warn.withValues(alpha: 0.14);
      case StatusTone.danger:
        foreground = AppColors.danger;
        background = AppColors.danger.withValues(alpha: 0.12);
      case StatusTone.info:
        foreground = scheme.primary;
        background = scheme.primary.withValues(alpha: 0.12);
      case StatusTone.neutral:
        foreground = scheme.onSurfaceVariant;
        background = scheme.surfaceContainerHighest;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: foreground),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: foreground,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
