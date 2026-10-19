import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Runtime flavor of the app. Selected at build time with
/// `--dart-define=FLAVOR=prod`; defaults to development.
enum Flavor { dev, prod }

/// Central configuration boundary between environments.
///
/// No secrets or credentials live here. [apiBaseUrl] is intentionally `null`
/// until the backend exists — it is the single seam a future API client will
/// read from, which keeps networking isolated from the UI layer.
class EnvConfig {
  const EnvConfig({required this.flavor, required this.name, this.apiBaseUrl});

  final Flavor flavor;
  final String name;
  final String? apiBaseUrl;

  bool get isDev => flavor == Flavor.dev;

  static const dev = EnvConfig(flavor: Flavor.dev, name: 'Development');
  static const prod = EnvConfig(flavor: Flavor.prod, name: 'Production');
}

/// Resolves the active environment from compile-time configuration.
EnvConfig resolveEnv() {
  const raw = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
  return raw.toLowerCase() == 'prod' ? EnvConfig.prod : EnvConfig.dev;
}

final envConfigProvider = Provider<EnvConfig>((ref) => resolveEnv());
