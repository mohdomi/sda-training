class AnalyticsData {
  final int totalUsers;
  final int activeUsers;
  final int totalOrders;
  final double revenue;
  final Map<String, dynamic> raw;

  AnalyticsData({
    required this.totalUsers,
    required this.activeUsers,
    required this.totalOrders,
    required this.revenue,
    this.raw = const {},
  });

  factory AnalyticsData.fromJson(Map<String, dynamic> json) {
    final Map<String, dynamic> data =
        (json['data'] as Map<String, dynamic>?) ?? json;
    return AnalyticsData(
      totalUsers: _toInt(data['totalUsers'] ?? data['users']),
      activeUsers: _toInt(data['activeUsers']),
      totalOrders: _toInt(data['totalOrders'] ?? data['orders']),
      revenue: _toDouble(data['revenue']),
      raw: data,
    );
  }

  static int _toInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is Map) return (value['total'] as num?)?.toInt() ?? value.length;
    if (value is List) return value.length;
    return int.tryParse(value.toString()) ?? 0;
  }

  static double _toDouble(dynamic value) {
    if (value == null) return 0.0;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString()) ?? 0.0;
  }

  Map<String, dynamic> toJson() {
    return {
      'totalUsers': totalUsers,
      'activeUsers': activeUsers,
      'totalOrders': totalOrders,
      'revenue': revenue,
    };
  }
}
