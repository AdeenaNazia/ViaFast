import 'package:flutter/material.dart';

import '../../app/theme/app_spacing.dart';

/// Constrains and centers content so forms and hero content stay readable on
/// tablets and in landscape instead of stretching to full width.
class ResponsiveCenter extends StatelessWidget {
  const ResponsiveCenter({
    super.key,
    required this.child,
    this.maxContentWidth = AppSpacing.maxContentWidth,
    this.padding = const EdgeInsets.symmetric(horizontal: AppSpacing.md),
  });

  final Widget child;
  final double maxContentWidth;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxContentWidth),
        child: Padding(padding: padding, child: child),
      ),
    );
  }
}
