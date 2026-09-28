import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:convert';
import '../models/offline_action.dart';

class OfflineService {
  static const String _offlineQueueKey = 'offline_queue';
  static const String _offlineDataKey = 'offline_data';
  
  final Connectivity _connectivity = Connectivity();
  bool _isOnline = true;
  List<OfflineAction> _offlineQueue = [];

  OfflineService() {
    _initializeConnectivityListener();
    _loadOfflineQueue();
  }

  void _initializeConnectivityListener() {
    _connectivity.onConnectivityChanged.listen((ConnectivityResult result) {
      _isOnline = result != ConnectivityResult.none;
      
      if (_isOnline) {
        _syncOfflineData();
      }
    });
  }

  Future<void> _loadOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = prefs.getString(_offlineQueueKey);
      
      if (queueJson != null) {
        final List<dynamic> queueList = json.decode(queueJson);
        _offlineQueue = queueList.map((json) => OfflineAction.fromJson(json)).toList();
      }
    } catch (e) {
      print('Failed to load offline queue: $e');
    }
  }

  Future<void> _saveOfflineQueue() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final queueJson = json.encode(_offlineQueue.map((action) => action.toJson()).toList());
      await prefs.setString(_offlineQueueKey, queueJson);
    } catch (e) {
      print('Failed to save offline queue: $e');
    }
  }

  Future<void> queueRequest(String endpoint, String method, Map<String, dynamic> data) async {
    final action = OfflineAction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      endpoint: endpoint,
      method: method,
      data: data,
      timestamp: DateTime.now(),
    );

    _offlineQueue.add(action);
    await _saveOfflineQueue();
  }

  Future<void> _syncOfflineData() async {
    if (!_isOnline || _offlineQueue.isEmpty) {
      return;
    }

    final queue = List<OfflineAction>.from(_offlineQueue);
    _offlineQueue.clear();
    await _saveOfflineQueue();

    for (final action in queue) {
      try {
        await _syncRequest(action);
      } catch (e) {
        print('Failed to sync request: $e');
        // Re-queue failed requests
        _offlineQueue.add(action);
      }
    }

    await _saveOfflineQueue();
  }

  Future<void> _syncRequest(OfflineAction action) async {
    // Implement actual sync logic here
    // This would typically make the API call
    print('Syncing offline request: ${action.endpoint}');
  }

  List<OfflineAction> getOfflineQueue() => _offlineQueue;
  bool get isOnline => _isOnline;
}
