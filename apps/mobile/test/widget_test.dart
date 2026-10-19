import 'package:flutter_test/flutter_test.dart';
import 'package:viafast_mobile/core/config/env.dart';
import 'package:viafast_mobile/core/widgets/app_button.dart';

import 'helpers.dart';

void main() {
  testWidgets('welcome screen shows brand and opens login', (tester) async {
    await tester.pumpWidget(buildTestApp());
    await tester.pumpAndSettle();

    expect(find.text('ViaFast'), findsOneWidget);
    expect(find.text('Campus transport, tracked live.'), findsOneWidget);

    await tester.tap(find.widgetWithText(AppButton, 'Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Email or username'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
  });

  testWidgets('prod build hides the development role-preview shortcut',
      (tester) async {
    await tester.pumpWidget(buildTestApp(env: EnvConfig.prod));
    await tester.pumpAndSettle();

    expect(find.text('Development role preview'), findsNothing);
    expect(find.widgetWithText(AppButton, 'Sign in'), findsOneWidget);
  });
}
