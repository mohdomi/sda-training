class OfflineAction {
  final String id;
  final String endpoint;
  final String method;
  final Map<String, dynamic> data;
  final DateTime timestamp;

  OfflineAction({
    required this.id,
    required this.endpoint,
    required this.method,
    required this.data,
    required this.timestamp,
  });

  factory OfflineAction.fromJson(Map<String, dynamic> json) {
    return OfflineAction(
      id: json['id']?.toString() ?? '',
      endpoint: json['endpoint']?.toString() ?? '',
      method: json['method']?.toString() ?? 'POST',
      data: Map<String, dynamic>.from(json['data'] as Map? ?? {}),
      timestamp: DateTime.tryParse(json['timestamp']?.toString() ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'endpoint': endpoint,
      'method': method,
      'data': data,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}
