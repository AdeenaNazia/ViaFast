import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'helpers.dart';

void main() {
  testWidgets('dev preview lists roles and opens the student shell',
      (tester) async {
    await tester.pumpWidget(buildTestApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('Development role preview'));
    await tester.pumpAndSettle();

    expect(find.text('Choose an experience to preview'), findsOneWidget);
    expect(find.text('Student'), findsOneWidget);
    expect(find.text('Parent'), findsOneWidget);
    expect(find.text('Driver'), findsOneWidget);

    await tester.tap(find.text('Student'));
    await tester.pumpAndSettle();

    // Student shell renders its own bottom navigation and app-bar title.
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Student'), findsOneWidget);
  });
}
