/// Spacing, radius and sizing scale for consistent layout rhythm.
class AppSpacing {
  const AppSpacing._();

  static const double xs = 4;
  static const double sm = 8;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;

  static const double radiusSm = 8;
  static const double radiusMd = 14;
  static const double radiusLg = 20;

  /// Minimum comfortable touch target for interactive elements.
  static const double touchTarget = 48;

  /// Content is constrained to this width on large screens (tablets/landscape).
  static const double maxContentWidth = 560;
}
