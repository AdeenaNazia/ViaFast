import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viafast_mobile/features/authentication/application/login_controller.dart';

void main() {
  group('validators', () {
    test('validateIdentifier', () {
      expect(validateIdentifier(''), isNotNull);
      expect(validateIdentifier('invalid@address'), isNotNull);
      expect(validateIdentifier('a@b.co'), isNull);
      expect(validateIdentifier('ab'), isNotNull); // username too short
      expect(validateIdentifier('abc'), isNull); // username ok
    });

    test('validatePassword', () {
      expect(validatePassword(''), isNotNull);
      expect(validatePassword('123'), isNotNull);
      expect(validatePassword('123456'), isNull);
    });
  });

  test('invalid input sets field errors and does not succeed', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final ok = await container
        .read(loginControllerProvider.notifier)
        .submit('', '');
    final state = container.read(loginControllerProvider);

    expect(ok, isFalse);
    expect(state.status, LoginStatus.failure);
    expect(state.emailError, isNotNull);
    expect(state.passwordError, isNotNull);
  });

  test('valid input transitions loading -> success', () async {
    final container = ProviderContainer();
    addTearDown(container.dispose);

    final future = container
        .read(loginControllerProvider.notifier)
        .submit('a@b.co', 'secret123');

    expect(container.read(loginControllerProvider).status, LoginStatus.loading);

    final ok = await future;
    expect(ok, isTrue);
    expect(container.read(loginControllerProvider).status, LoginStatus.success);
  });
}
