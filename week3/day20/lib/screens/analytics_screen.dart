import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/analytics_provider.dart';

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final analyticsProvider = context.watch<AnalyticsProvider>();
    final data = analyticsProvider.analyticsData;
    return Scaffold(
      appBar: AppBar(title: const Text('Analytics')),
      body: analyticsProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : analyticsProvider.error != null
              ? Center(child: Text(analyticsProvider.error!))
              : Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      DropdownButton<String>(
                        value: analyticsProvider.selectedTimeRange,
                        items: const [
                          DropdownMenuItem(value: '7d', child: Text('7 days')),
                          DropdownMenuItem(value: '30d', child: Text('30 days')),
                          DropdownMenuItem(value: '90d', child: Text('90 days')),
                        ],
                        onChanged: (value) {
                          if (value != null) {
                            context
                                .read<AnalyticsProvider>()
                                .fetchAnalytics(timeRange: value);
                          }
                        },
                      ),
                      Text('Users: ${data?.totalUsers ?? 0}'),
                      Text('Active: ${data?.activeUsers ?? 0}'),
                      Text('Orders: ${data?.totalOrders ?? 0}'),
                      Text('Revenue: ${data?.revenue ?? 0.0}'),
                    ],
                  ),
                ),
    );
  }
}
