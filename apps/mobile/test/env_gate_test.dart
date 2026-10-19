import 'package:flutter_test/flutter_test.dart';
import 'package:viafast_mobile/app/router.dart';
import 'package:viafast_mobile/core/config/env.dart';

void main() {
  test('dev flavor allows dev-only routes', () {
    expect(guardRedirect(EnvConfig.dev, '/preview'), isNull);
    expect(guardRedirect(EnvConfig.dev, '/student'), isNull);
    expect(guardRedirect(EnvConfig.dev, '/driver'), isNull);
  });

  test('prod flavor redirects dev-only routes home', () {
    expect(guardRedirect(EnvConfig.prod, '/preview'), '/');
    expect(guardRedirect(EnvConfig.prod, '/student'), '/');
    expect(guardRedirect(EnvConfig.prod, '/parent'), '/');
    expect(guardRedirect(EnvConfig.prod, '/driver'), '/');
  });

  test('prod flavor still allows public routes', () {
    expect(guardRedirect(EnvConfig.prod, '/'), isNull);
    expect(guardRedirect(EnvConfig.prod, '/login'), isNull);
  });
}
