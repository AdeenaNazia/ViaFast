import 'package:flutter/material.dart';

import '../../app/theme/app_spacing.dart';

enum AppButtonVariant { primary, secondary }

/// Primary action button with a built-in loading state and a minimum 48px
/// touch target. [expand] makes it full-width (default) for form CTAs.
class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.icon,
    this.isLoading = false,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final IconData? icon;
  final bool isLoading;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final enabled = onPressed != null && !isLoading;
    final spinnerColor =
        variant == AppButtonVariant.primary ? scheme.onPrimary : scheme.primary;

    final Widget content = isLoading
        ? SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.4,
              color: spinnerColor,
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18),
                const SizedBox(width: AppSpacing.sm),
              ],
              Flexible(child: Text(label, overflow: TextOverflow.ellipsis)),
            ],
          );

    final size = expand ? const Size.fromHeight(50) : const Size(0, 50);

    if (variant == AppButtonVariant.secondary) {
      return OutlinedButton(
        onPressed: enabled ? onPressed : null,
        style: OutlinedButton.styleFrom(minimumSize: size),
        child: content,
      );
    }
    return FilledButton(
      onPressed: enabled ? onPressed : null,
      style: FilledButton.styleFrom(minimumSize: size),
      child: content,
    );
  }
}
