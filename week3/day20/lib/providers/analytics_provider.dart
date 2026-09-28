import 'package:flutter/foundation.dart';
import '../services/analytics_service.dart';
import '../models/analytics.dart';

class AnalyticsProvider with ChangeNotifier {
  final AnalyticsService _analyticsService = AnalyticsService();
  
  AnalyticsData? _analyticsData;
  bool _isLoading = false;
  String? _error;
  String _selectedTimeRange = '30d';

  AnalyticsData? get analyticsData => _analyticsData;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String get selectedTimeRange => _selectedTimeRange;

  Future<void> fetchAnalytics({String? timeRange}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final timeRangeToUse = timeRange ?? _selectedTimeRange;
      _analyticsData = await _analyticsService.getAnalytics(timeRangeToUse);
      _selectedTimeRange = timeRangeToUse;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void setTimeRange(String timeRange) {
    _selectedTimeRange = timeRange;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
