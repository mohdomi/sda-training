import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/offline_service.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final offlineService = context.watch<OfflineService>();
    final queue = offlineService.getOfflineQueue();
    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(offlineService.isOnline ? 'Online' : 'Offline'),
            Text('Queued actions: ${queue.length}'),
          ],
        ),
      ),
    );
  }
}
