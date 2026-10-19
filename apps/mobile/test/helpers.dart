import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:viafast_mobile/app/app.dart';
import 'package:viafast_mobile/core/config/env.dart';

/// Wraps the app in a [ProviderScope] with a controllable environment so tests
/// can exercise both dev and prod behavior.
Widget buildTestApp({EnvConfig env = EnvConfig.dev}) {
  return ProviderScope(
    overrides: [envConfigProvider.overrideWithValue(env)],
    child: const ViaFastApp(),
  );
}
