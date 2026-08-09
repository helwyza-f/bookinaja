import '../config.dart';
import '../data/sample_data.dart';
import '../models/resource_status.dart';

/// Status operasional resource (nerve center). Demo: data contoh.
/// Endpoint asli nanti: GET /bookings/pos/active + status resource.
class OpsRepository {
  Future<List<ResourceStatus>> resources() async {
    if (AppConfig.useDemoData) {
      await Future<void>.delayed(const Duration(milliseconds: 300));
      return sampleResources;
    }
    // TODO: gabungkan dari /admin/resources + /bookings/pos/active
    return sampleResources;
  }
}
