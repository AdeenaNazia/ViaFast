import 'package:flutter/material.dart';

/// Brand palette. Derived from the existing web design tokens as a visual
/// reference only — the mobile identity is not a literal copy.
class AppColors {
  const AppColors._();

  static const brand = Color(0xFF2563EB);
  static const brandLight = Color(0xFF3B82F6);
  static const accent = Color(0xFF06B6D4);

  // Semantic status hues. Always paired with an icon and a text label in the
  // UI (see StatusIndicator) so meaning never relies on color alone.
  static const ok = Color(0xFF10B981);
  static const warn = Color(0xFFF59E0B);
  static const danger = Color(0xFFE11D48);

  static const canvasDark = Color(0xFF020617);
  static const canvasLight = Color(0xFFF6F8FC);
}
