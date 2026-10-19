import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/config/env.dart';
import '../features/authentication/presentation/login_screen.dart';
import '../features/authentication/presentation/welcome_screen.dart';
import '../features/driver/presentation/driver_shell.dart';
import '../features/parent/presentation/parent_shell.dart';
import '../features/role_preview/presentation/role_preview_screen.dart';
import '../features/student/presentation/student_shell.dart';

/// Routes that only make sense during development (no real auth yet).
const Set<String> devOnlyRoutes = {'/preview', '/student', '/parent', '/driver'};

/// Gates development-only screens so they can never be reached in a prod build.
/// Exposed as a pure function so it can be unit-tested without a widget tree.
String? guardRedirect(EnvConfig env, String location) {
  if (!env.isDev && devOnlyRoutes.contains(location)) return '/';
  return null;
}

GoRouter buildRouter({required EnvConfig env}) {
  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) => guardRedirect(env, state.matchedLocation),
    routes: [
      GoRoute(
        path: '/',
        name: 'welcome',
        builder: (context, state) => const WelcomeScreen(),
      ),
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/preview',
        name: 'preview',
        builder: (context, state) => const RolePreviewScreen(),
      ),
      GoRoute(
        path: '/student',
        name: 'student',
        builder: (context, state) => const StudentShell(),
      ),
      GoRoute(
        path: '/parent',
        name: 'parent',
        builder: (context, state) => const ParentShell(),
      ),
      GoRoute(
        path: '/driver',
        name: 'driver',
        builder: (context, state) => const DriverShell(),
      ),
    ],
  );
}

final goRouterProvider = Provider<GoRouter>((ref) {
  final env = ref.watch(envConfigProvider);
  return buildRouter(env: env);
});
