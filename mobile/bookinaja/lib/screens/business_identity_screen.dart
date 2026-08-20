import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../theme.dart';
import '../ui/toast.dart';
import '../repositories/settings_repository.dart';
import 'landing_preview_screen.dart';

/// Identitas & kontak bisnis (owner). Mengedit subset field profil tenant yang
/// paling sering diubah sambil jalan. Tersimpan lewat PUT /admin/profile (objek
/// Tenant utuh), jadi kita GET dulu, ubah field, lalu kirim map balik.
/// Penanda kebutuhan field pada gerbang publikasi.
enum _Badge { wajib, opsional }

class BusinessIdentityScreen extends StatefulWidget {
  const BusinessIdentityScreen({super.key});

  @override
  State<BusinessIdentityScreen> createState() => _BusinessIdentityScreenState();
}

class _BusinessIdentityScreenState extends State<BusinessIdentityScreen> {
  // Kategori bisnis kanonik (backend keys). Selector, bukan teks bebas — nilai
  // ini menggerakkan seeding/discovery, jadi harus valid.
  static const _categories = [
    (value: 'gaming_hub', label: 'Gaming / PS'),
    (value: 'sport_center', label: 'Olahraga / Lapangan'),
    (value: 'creative_space', label: 'Studio Kreatif'),
    (value: 'social_space', label: 'Ruang Sosial'),
  ];

  Map<String, dynamic>? _profile;
  bool _loading = true;
  bool _saving = false;
  bool _dirty = false;
  String? _error;

  // Controller per-field teks.
  final _name = TextEditingController();
  final _slogan = TextEditingController();
  final _tagline = TextEditingController();
  final _about = TextEditingController();
  final _whatsapp = TextEditingController();
  final _address = TextEditingController();
  final _instagram = TextEditingController();
  final _tiktok = TextEditingController();
  String _category = '';
  String _openTime = '';
  String _closeTime = '';
  String _timezone = '';
  // URL pratinjau publik (sudah mengandung ?preview=1) untuk tombol
  // "Lihat di halaman" per field. Kosong = tombol disembunyikan.
  String _previewUrl = '';

  // Fitur (chips) — bagian dari profil tenant, disimpan bersama saveProfile.
  final List<String> _features = [];
  final _featureInput = TextEditingController();
  // Label CTA booking — hidup di page-builder (booking_form), bukan profil.
  // State page-builder lengkap disimpan agar bisa dikirim balik utuh.
  final _cta = TextEditingController();
  Map<String, dynamic>? _pb;
  String _ctaInitial = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_name, _slogan, _tagline, _about, _whatsapp, _address, _instagram, _tiktok, _featureInput, _cta]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final p = await context.read<SettingsRepository>().getProfile();
      String s(String k) => '${p[k] ?? ''}';
      _name.text = s('name');
      _slogan.text = s('slogan');
      _tagline.text = s('tagline');
      _about.text = s('about_us');
      _whatsapp.text = s('whatsapp_number');
      _address.text = s('address');
      _instagram.text = s('instagram_url');
      _tiktok.text = s('tiktok_url');
      setState(() {
        _profile = p;
        _category = s('business_category');
        _openTime = s('open_time');
        _closeTime = s('close_time');
        _timezone = s('timezone');
        _features
          ..clear()
          ..addAll((p['features'] is List ? p['features'] as List : const [])
              .map((e) => '$e'.trim())
              .where((e) => e.isNotEmpty));
        _dirty = false;
        _loading = false;
      });
      // Preview opsional — ambil di latar, jangan blokir form.
      _loadPreviewUrl();
    } catch (e) {
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Future<void> _loadPreviewUrl() async {
    try {
      final s = await context.read<SettingsRepository>().getPageBuilder();
      if (!mounted) return;
      final url = '${s['preview_url'] ?? ''}';
      final form = s['booking_form'] is Map ? Map<String, dynamic>.from(s['booking_form'] as Map) : <String, dynamic>{};
      setState(() {
        _pb = s;
        _cta.text = '${form['cta_button_label'] ?? ''}';
        _ctaInitial = _cta.text;
        if (url.isNotEmpty) _previewUrl = url;
      });
    } catch (_) {
      // Diabaikan — tombol "Lihat di halaman" & editor CTA cukup disembunyikan.
    }
  }

  /// Buka pratinjau penuh yang otomatis scroll + highlight [field] di halaman.
  /// preview_url sudah membawa ?preview=1, jadi tinggal tambah &focus=.
  void _openPreviewFocus(String field) {
    if (_previewUrl.isEmpty) return;
    final sep = _previewUrl.contains('?') ? '&' : '?';
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => LandingPreviewScreen(url: '$_previewUrl${sep}focus=$field'),
      fullscreenDialog: true,
    ));
  }

  Future<void> _save() async {
    if (_saving) return; // Cegah double-submit.
    final profile = _profile;
    if (profile == null) return;
    if (_name.text.trim().isEmpty) {
      BkToast.error(context, 'Nama bisnis wajib diisi');
      return;
    }
    setState(() => _saving = true);
    // Merge field yang diedit ke objek profil (field lain dipertahankan).
    profile['name'] = _name.text.trim();
    profile['business_category'] = _category.trim();
    profile['slogan'] = _slogan.text.trim();
    profile['tagline'] = _tagline.text.trim();
    profile['about_us'] = _about.text.trim();
    profile['whatsapp_number'] = _whatsapp.text.trim();
    profile['address'] = _address.text.trim();
    profile['instagram_url'] = _instagram.text.trim();
    profile['tiktok_url'] = _tiktok.text.trim();
    profile['open_time'] = _openTime;
    profile['close_time'] = _closeTime;
    profile['features'] = List<String>.from(_features);
    try {
      final repo = context.read<SettingsRepository>();
      await repo.saveProfile(profile);
      // CTA hidup di page-builder — simpan terpisah hanya bila berubah, kirim
      // page & theme apa adanya agar tak menimpa konfigurasi lain.
      if (_pb != null && _cta.text.trim() != _ctaInitial.trim()) {
        final form = _pb!['booking_form'] is Map
            ? Map<String, dynamic>.from(_pb!['booking_form'] as Map)
            : <String, dynamic>{};
        form['cta_button_label'] = _cta.text.trim();
        await repo.savePageBuilder(page: _pb!['page'] ?? const {}, theme: _pb!['theme'], bookingForm: form);
        _ctaInitial = _cta.text.trim();
      }
      if (!mounted) return;
      // Tetap di form (tidak auto-keluar) — owner bisa lanjut edit bagian lain.
      setState(() {
        _dirty = false;
        _saving = false;
      });
      BkToast.success(context, 'Profil disimpan');
    } catch (e) {
      if (!mounted) return;
      setState(() => _saving = false);
      BkToast.error(context, 'Gagal menyimpan', subtitle: '$e');
    }
  }

  Future<void> _pickTime(bool open) async {
    final current = _parseHm(open ? _openTime : _closeTime);
    final picked = await showTimePicker(
      context: context,
      initialTime: current ?? const TimeOfDay(hour: 8, minute: 0),
      builder: (ctx, child) => MediaQuery(
        data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null) return;
    final hm = '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}';
    setState(() {
      if (open) {
        _openTime = hm;
      } else {
        _closeTime = hm;
      }
      _dirty = true;
    });
  }

  TimeOfDay? _parseHm(String v) {
    final parts = v.split(':');
    if (parts.length < 2) return null;
    final h = int.tryParse(parts[0]);
    final m = int.tryParse(parts[1]);
    return (h == null || m == null) ? null : TimeOfDay(hour: h, minute: m);
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final discard = await _confirmDiscard();
        if (!discard) return;
        if (!context.mounted) return;
        Navigator.of(context).pop();
      },
      child: _scaffold(context),
    );
  }

  Widget _scaffold(BuildContext context) {
    return Scaffold(
      backgroundColor: BK.bg,
      appBar: AppBar(
        centerTitle: false,
        backgroundColor: BK.bg,
        elevation: 0,
        title: const Text('Identitas & kontak',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: BK.ink)),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: BK.crit)),
                      const SizedBox(height: 12),
                      OutlinedButton(onPressed: _load, child: const Text('Coba lagi')),
                    ]),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                  children: [
                    _requirementBanner(),
                    const SizedBox(height: 16),
                    _group('BAGIAN ATAS HALAMAN'),
                    _field('Nama bisnis', _name,
                        hint: 'mis. Kopi Senja',
                        location: 'Judul utama, paling atas',
                        badge: _Badge.wajib,
                        field: 'name'),
                    _categorySelector(),
                    _field('Tagline', _tagline,
                        hint: 'mis. Ngopi santai tiap sore',
                        location: 'Tulisan besar paling atas halaman',
                        badge: _Badge.wajib,
                        field: 'tagline'),
                    _field('Slogan', _slogan,
                        hint: 'mis. Booking online',
                        location: 'Label kecil dekat nama, di atas',
                        badge: _Badge.wajib,
                        field: 'slogan'),
                    _field('Tentang', _about,
                        hint: 'Deskripsi singkat bisnismu',
                        maxLines: 4,
                        location: 'Sub-judul di atas & paragraf di bawah',
                        badge: _Badge.wajib,
                        field: 'about_us'),
                    const SizedBox(height: 8),
                    _group('KONTAK & INFO (BAGIAN BAWAH)'),
                    _field('WhatsApp', _whatsapp,
                        hint: '08xxxxxxxxxx',
                        keyboard: TextInputType.phone,
                        location: 'Tombol chat di bagian bawah',
                        badge: _Badge.wajib,
                        field: 'whatsapp'),
                    _field('Alamat', _address,
                        hint: 'Alamat lengkap',
                        maxLines: 2,
                        location: 'Info lokasi di bagian bawah',
                        badge: _Badge.opsional,
                        field: 'address'),
                    _field('Instagram', _instagram,
                        hint: '@username atau URL',
                        location: 'Ikon sosial di bagian bawah',
                        badge: _Badge.opsional,
                        field: 'instagram'),
                    _field('TikTok', _tiktok,
                        hint: '@username atau URL',
                        location: 'Ikon sosial di bagian bawah',
                        badge: _Badge.opsional,
                        field: 'tiktok'),
                    const SizedBox(height: 8),
                    _group('JAM OPERASIONAL', field: 'hours'),
                    Row(children: [
                      Expanded(child: _timeField('Buka', _openTime, () => _pickTime(true))),
                      const SizedBox(width: 10),
                      Expanded(child: _timeField('Tutup', _closeTime, () => _pickTime(false))),
                    ]),
                    if (_timezone.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Row(children: [
                        const Icon(Icons.public, size: 15, color: BK.ink3),
                        const SizedBox(width: 6),
                        Text('Zona waktu: $_timezone', style: const TextStyle(fontSize: 12, color: BK.ink3)),
                      ]),
                    ],
                    // Editor tampilan landing (fitur & CTA) — dulu cuma di web,
                    // kini satu tempat bareng identitas biar tak terpencar.
                    if (_pb != null) ...[
                      const SizedBox(height: 8),
                      _group('FITUR (CHIPS DI ATAS)', field: 'features'),
                      _featuresEditor(),
                      const SizedBox(height: 8),
                      _group('TOMBOL BOOKING', field: 'cta'),
                      _field('Label tombol', _cta,
                          hint: 'mis. Cek ketersediaan',
                          location: 'Tombol besar di hero (CTA)'),
                    ],
                  ],
                ),
      bottomNavigationBar: _loading || _error != null
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: BK.accent,
                  disabledBackgroundColor: BK.accent.withValues(alpha: 0.5),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(
                        height: 18, width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Simpan', style: TextStyle(fontWeight: FontWeight.w800)),
              ),
            ),
    );
  }

  Widget _group(String t, {String? field}) {
    final canPreview = field != null && _previewUrl.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, top: 4),
      child: Row(children: [
        Text(t,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 1, color: BK.ink3)),
        const Spacer(),
        if (canPreview)
          InkWell(
            borderRadius: BorderRadius.circular(6),
            onTap: () => _openPreviewFocus(field),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
              child: Row(mainAxisSize: MainAxisSize.min, children: [
                Icon(Icons.visibility_outlined, size: 13, color: BK.accent),
                SizedBox(width: 3),
                Text('Lihat di halaman', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.accent)),
              ]),
            ),
          ),
      ]),
    );
  }

  // --- Gerbang publikasi (cermin backend) ---
  // Identitas beres bila Tagline, Slogan, DAN Tentang semuanya terisi.
  bool get _identityDone =>
      _tagline.text.trim().isNotEmpty && _slogan.text.trim().isNotEmpty && _about.text.trim().isNotEmpty;
  // Kontak beres bila WhatsApp terisi (zona waktu auto-terisi server).
  bool get _contactDone => _whatsapp.text.trim().isNotEmpty;

  /// Checklist hidup di atas form — menjawab "aku harus ngisi apa" secara
  /// eksplisit, update real-time saat user mengetik.
  Widget _requirementBanner() {
    final allDone = _identityDone && _contactDone;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: allDone ? BK.liveSoft : BK.accentSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: allDone ? BK.live : BK.accent.withValues(alpha: 0.4)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(allDone ? Icons.check_circle : Icons.assignment_outlined,
              size: 18, color: allDone ? BK.live : BK.accent),
          const SizedBox(width: 8),
          Text(allDone ? 'Langkah ini sudah lengkap' : 'Biar langkah ini beres, isi semua:',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: allDone ? BK.live : BK.ink)),
        ]),
        const SizedBox(height: 10),
        _checkRow(_tagline.text.trim().isNotEmpty, 'Tagline'),
        const SizedBox(height: 6),
        _checkRow(_slogan.text.trim().isNotEmpty, 'Slogan'),
        const SizedBox(height: 6),
        _checkRow(_about.text.trim().isNotEmpty, 'Tentang'),
        const SizedBox(height: 6),
        _checkRow(_contactDone, 'Nomor WhatsApp'),
      ]),
    );
  }

  Widget _checkRow(bool done, String label) {
    return Row(children: [
      Icon(done ? Icons.check_circle : Icons.radio_button_unchecked,
          size: 16, color: done ? BK.live : BK.ink3),
      const SizedBox(width: 8),
      Expanded(
        child: Text(label,
            style: TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w600,
              color: done ? BK.ink3 : BK.ink2,
              decoration: done ? TextDecoration.lineThrough : null,
            )),
      ),
    ]);
  }

  Widget _badgeChip(_Badge b) {
    late Color fg;
    late Color bg;
    late String text;
    switch (b) {
      case _Badge.wajib:
        fg = BK.accent;
        bg = BK.accentSoft;
        text = 'Wajib';
      case _Badge.opsional:
        fg = BK.ink3;
        bg = BK.card2;
        text = 'Opsional';
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(6)),
      child: Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: fg)),
    );
  }

  Widget _categorySelector() {
    // Opsi = kanonik + nilai saat ini bila di luar daftar (mempertahankan legacy).
    final known = _categories.map((e) => e.value).toSet();
    final options = [
      ..._categories,
      if (_category.isNotEmpty && !known.contains(_category))
        (value: _category, label: _category),
    ];
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Kategori', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink2)),
        const SizedBox(height: 8),
        Wrap(spacing: 8, runSpacing: 8, children: [
          for (final o in options)
            GestureDetector(
              onTap: () => setState(() {
                _category = o.value;
                _dirty = true;
              }),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 120),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                decoration: BoxDecoration(
                  color: _category == o.value ? BK.accent : BK.card,
                  borderRadius: BorderRadius.circular(11),
                  border: Border.all(color: _category == o.value ? BK.accent : BK.line),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  if (_category == o.value) ...[
                    const Icon(Icons.check_rounded, size: 14, color: Colors.white),
                    const SizedBox(width: 5),
                  ],
                  Text(o.label,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: _category == o.value ? Colors.white : BK.ink2,
                      )),
                ]),
              ),
            ),
        ]),
      ]),
    );
  }

  void _addFeature() {
    final v = _featureInput.text.trim();
    if (v.isEmpty) return;
    if (_features.length >= 6) {
      BkToast.info(context, 'Maksimal 6 fitur');
      return;
    }
    setState(() {
      _features.add(v);
      _featureInput.clear();
      _dirty = true;
    });
  }

  /// Editor chips fitur (keunggulan) — tampil sebagai badge di hero.
  Widget _featuresEditor() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Badge singkat keunggulan bisnismu. Kosongkan untuk pakai default.',
            style: TextStyle(fontSize: 11, color: BK.ink3, height: 1.3)),
        const SizedBox(height: 8),
        if (_features.isNotEmpty)
          Wrap(spacing: 8, runSpacing: 8, children: [
            for (var i = 0; i < _features.length; i++)
              Container(
                padding: const EdgeInsets.only(left: 12, right: 6, top: 7, bottom: 7),
                decoration: BoxDecoration(
                  color: BK.accentSoft,
                  borderRadius: BorderRadius.circular(11),
                  border: Border.all(color: BK.accent.withValues(alpha: 0.4)),
                ),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(_features[i],
                      style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.accent)),
                  const SizedBox(width: 4),
                  InkWell(
                    borderRadius: BorderRadius.circular(20),
                    onTap: () => setState(() {
                      _features.removeAt(i);
                      _dirty = true;
                    }),
                    child: const Icon(Icons.close_rounded, size: 15, color: BK.accent),
                  ),
                ]),
              ),
          ]),
        if (_features.isNotEmpty) const SizedBox(height: 10),
        Row(children: [
          Expanded(
            child: TextField(
              controller: _featureInput,
              style: const TextStyle(fontSize: 14, color: BK.ink),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _addFeature(),
              decoration: InputDecoration(
                hintText: 'mis. Wi-Fi kencang',
                isDense: true,
                filled: true,
                fillColor: BK.card,
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            onPressed: _addFeature,
            icon: const Icon(Icons.add_rounded, color: Colors.white),
            style: IconButton.styleFrom(
              backgroundColor: BK.accent,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
              padding: const EdgeInsets.all(12),
            ),
          ),
        ]),
      ]),
    );
  }

  Future<bool> _confirmDiscard() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (dctx) => AlertDialog(
        backgroundColor: BK.card,
        title: const Text('Buang perubahan?', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
        content: const Text('Perubahan identitas belum disimpan.', style: TextStyle(fontSize: 13.5, color: BK.ink2)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dctx, false), child: const Text('Lanjut edit')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: BK.crit),
            onPressed: () => Navigator.pop(dctx, true),
            child: const Text('Buang'),
          ),
        ],
      ),
    );
    return ok ?? false;
  }

  /// [location] = kalimat "muncul di mana" pada halaman publik (bukan jargon).
  /// [badge] = penanda wajib/opsional. Keduanya nempel di header field supaya
  /// user tahu perlu-tidaknya + tempat tampilnya tanpa menebak.
  Widget _field(String label, TextEditingController c,
      {String? hint, int maxLines = 1, TextInputType? keyboard, String? location, _Badge? badge, String? field}) {
    final canPreview = field != null && _previewUrl.isNotEmpty;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink2)),
          if (badge != null) ...[const SizedBox(width: 8), _badgeChip(badge)],
          const Spacer(),
          if (canPreview)
            InkWell(
              borderRadius: BorderRadius.circular(6),
              onTap: () => _openPreviewFocus(field),
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.visibility_outlined, size: 13, color: BK.accent),
                  SizedBox(width: 3),
                  Text('Lihat di halaman', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: BK.accent)),
                ]),
              ),
            ),
        ]),
        if (location != null) ...[
          const SizedBox(height: 3),
          Row(children: [
            const Icon(Icons.place_outlined, size: 12, color: BK.ink3),
            const SizedBox(width: 4),
            Expanded(
              child: Text(location, style: const TextStyle(fontSize: 11, color: BK.ink3, height: 1.3)),
            ),
          ]),
        ],
        const SizedBox(height: 6),
        TextField(
          controller: c,
          maxLines: maxLines,
          keyboardType: keyboard,
          onChanged: (_) {
            // Selalu rebuild: banner checklist wajib ikut update real-time.
            setState(() => _dirty = true);
          },
          style: const TextStyle(fontSize: 14, color: BK.ink),
          decoration: InputDecoration(
            hintText: hint,
            isDense: true,
            filled: true,
            fillColor: BK.card,
            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.line)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(11), borderSide: const BorderSide(color: BK.accent)),
          ),
        ),
      ]),
    );
  }

  Widget _timeField(String label, String value, VoidCallback onTap) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: BK.ink2)),
      const SizedBox(height: 6),
      InkWell(
        borderRadius: BorderRadius.circular(11),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 13),
          decoration: BoxDecoration(color: BK.card, borderRadius: BorderRadius.circular(11), border: Border.all(color: BK.line)),
          child: Row(children: [
            const Icon(Icons.schedule, size: 16, color: BK.accent),
            const SizedBox(width: 10),
            Expanded(
              child: Text(value.isEmpty ? '—' : value,
                  style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      color: value.isEmpty ? BK.ink3 : BK.ink)),
            ),
            const Icon(Icons.expand_more_rounded, size: 18, color: BK.ink3),
          ]),
        ),
      ),
    ]);
  }
}
