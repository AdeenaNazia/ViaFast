import 'package:flutter_riverpod/flutter_riverpod.dart';

enum LoginStatus { idle, loading, success, failure }

/// Immutable UI state for the (simulated) sign-in flow.
class LoginState {
  const LoginState({
    this.status = LoginStatus.idle,
    this.emailError,
    this.passwordError,
    this.errorMessage,
  });

  final LoginStatus status;
  final String? emailError;
  final String? passwordError;
  final String? errorMessage;

  bool get isLoading => status == LoginStatus.loading;
}

final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

/// The auth contract is not finalized yet, so the field accepts either an email
/// or a username. These rules are UI-level convenience only — the authoritative
/// validation will live on the backend once it exists.
String? validateIdentifier(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return 'Email or username is required';
  if (trimmed.contains('@')) {
    if (!_emailPattern.hasMatch(trimmed)) return 'Enter a valid email address';
  } else if (trimmed.length < 3) {
    return 'Username must be at least 3 characters';
  }
  return null;
}

String? validatePassword(String value) {
  if (value.isEmpty) return 'Password is required';
  if (value.length < 6) return 'Password must be at least 6 characters';
  return null;
}

/// Drives the login form. There is no backend yet: a valid submission simulates
/// a round-trip and hands off to the development role preview. It never stores
/// or transmits credentials.
class LoginController extends Notifier<LoginState> {
  @override
  LoginState build() => const LoginState();

  Future<bool> submit(String identifier, String password) async {
    final idError = validateIdentifier(identifier);
    final passwordError = validatePassword(password);

    if (idError != null || passwordError != null) {
      state = LoginState(
        status: LoginStatus.failure,
        emailError: idError,
        passwordError: passwordError,
        errorMessage: 'Please fix the highlighted fields.',
      );
      return false;
    }

    state = const LoginState(status: LoginStatus.loading);
    await Future<void>.delayed(const Duration(milliseconds: 600));
    state = const LoginState(status: LoginStatus.success);
    return true;
  }

  void reset() => state = const LoginState();
}

final loginControllerProvider =
    NotifierProvider<LoginController, LoginState>(LoginController.new);
