import '../models/analytics.dart';
import 'api_service.dart';

class AnalyticsService {
  final ApiService _apiService = ApiService();

  Future<AnalyticsData> getAnalytics(String timeRange) {
    return _apiService.getAnalytics(timeRange);
  }
}
