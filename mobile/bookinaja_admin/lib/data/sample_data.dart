import '../models/booking.dart';
import '../models/menu_item.dart';
import '../models/customer.dart';
import '../models/resource_status.dart';

/// Data contoh untuk mode demo (tanpa backend).
const sampleBookings = <Booking>[
  Booking(id: 'BKN-2049', code: 'BKN-2049', customer: 'Budi Santoso', resource: 'Station 03', time: '16:00 · 2 jam', status: BookingStatus.dp, total: 52000, paid: 22000),
  Booking(id: 'BKN-2050', code: 'BKN-2050', customer: 'Sarah Wijaya', resource: 'PS5 Room B', time: '17:00 · 3 jam', status: BookingStatus.live, total: 60000, paid: 60000),
  Booking(id: 'BKN-2051', code: 'BKN-2051', customer: 'Andi Pratama', resource: 'Station 09', time: '19:00 · 1 jam', status: BookingStatus.review, total: 15000, paid: 0),
  Booking(id: 'BKN-2052', code: 'BKN-2052', customer: 'Maya Putri', resource: 'VIP 01', time: '20:00 · 4 jam', status: BookingStatus.pending, total: 80000, paid: 0),
  Booking(id: 'BKN-2053', code: 'BKN-2053', customer: 'Rizky Akbar', resource: 'Station 05', time: '21:00 · 2 jam', status: BookingStatus.pending, total: 30000, paid: 0),
];

class LiveSession {
  final String resource, customer, remaining, endsAt;
  const LiveSession(this.resource, this.customer, this.remaining, this.endsAt);
}

const sampleLive = <LiveSession>[
  LiveSession('Station 03', 'Budi', 'sisa 24 mnt', '18:00'),
  LiveSession('PS5 Room B', 'Sarah', 'sisa 1j 12m', '18:48'),
];

const sampleResources = <ResourceStatus>[
  ResourceStatus(name: 'Station 03', state: ResourceState.live, note: 'Budi · sisa 24m'),
  ResourceStatus(name: 'PS5 Room B', state: ResourceState.live, note: 'Sarah · sisa 1j12m'),
  ResourceStatus(name: 'Station 05', state: ResourceState.idle, note: 'siap dipakai'),
  ResourceStatus(name: 'Station 07', state: ResourceState.idle, note: 'siap dipakai'),
  ResourceStatus(name: 'Station 08', state: ResourceState.off, note: 'maintenance'),
];

const sampleMenu = <MenuItem>[
  MenuItem(id: 'm1', name: 'Nasi Goreng Spesial', category: 'Makanan', price: 18000),
  MenuItem(id: 'm2', name: 'Mie Goreng', category: 'Makanan', price: 16000),
  MenuItem(id: 'm3', name: 'Kentang Goreng', category: 'Snack', price: 14000),
  MenuItem(id: 'm4', name: 'Es Kopi Susu', category: 'Minuman', price: 12000),
  MenuItem(id: 'm5', name: 'Es Teh Manis', category: 'Minuman', price: 6000),
  MenuItem(id: 'm6', name: 'Air Mineral', category: 'Minuman', price: 5000),
  MenuItem(id: 'm7', name: 'Roti Bakar', category: 'Snack', price: 15000),
  MenuItem(id: 'm8', name: 'Ayam Geprek', category: 'Makanan', price: 22000),
];

const sampleCustomers = <Customer>[
  Customer(id: 'c1', name: 'Sarah Wijaya', phone: '0812••7788', tier: 'vip', sessions: 32, spend: 4100000),
  Customer(id: 'c2', name: 'Budi Santoso', phone: '0812••3344', tier: 'reguler', sessions: 8, spend: 640000),
  Customer(id: 'c3', name: 'Andi Pratama', phone: '0857••1290', tier: 'baru', sessions: 3, spend: 180000),
  Customer(id: 'c4', name: 'Maya Putri', phone: '0819••5521', tier: 'reguler', sessions: 12, spend: 1250000),
  Customer(id: 'c5', name: 'Rizky Akbar', phone: '0813••8834', tier: 'baru', sessions: 2, spend: 90000),
];
