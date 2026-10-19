import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:viafast_mobile/core/widgets/app_button.dart';

import 'helpers.dart';

Future<void> _gotoLogin(WidgetTester tester) async {
  await tester.pumpWidget(buildTestApp());
  await tester.pumpAndSettle();
  await tester.tap(find.widgetWithText(AppButton, 'Sign in'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('empty submit shows validation errors', (tester) async {
    await _gotoLogin(tester);

    await tester.tap(find.widgetWithText(AppButton, 'Continue'));
    await tester.pump();

    expect(find.text('Email or username is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
    expect(find.text('Please fix the highlighted fields.'), findsOneWidget);
  });

  testWidgets('malformed email shows a format error', (tester) async {
    await _gotoLogin(tester);

    await tester.enterText(find.byType(TextField).at(0), 'invalid@address');
    await tester.enterText(find.byType(TextField).at(1), 'secret123');
    await tester.tap(find.widgetWithText(AppButton, 'Continue'));
    await tester.pump();

    expect(find.text('Enter a valid email address'), findsOneWidget);
  });

  testWidgets('valid submit shows loading then reaches the role preview',
      (tester) async {
    await _gotoLogin(tester);

    await tester.enterText(find.byType(TextField).at(0), 'student@viafast.dev');
    await tester.enterText(find.byType(TextField).at(1), 'secret123');
    await tester.tap(find.widgetWithText(AppButton, 'Continue'));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsWidgets);

    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();

    expect(find.text('Choose an experience to preview'), findsOneWidget);
  });
}
