/// Pembungkus status async sederhana: loading / data / error.
class AsyncValue<T> {
  final T? data;
  final Object? error;
  final bool isLoading;

  const AsyncValue._({this.data, this.error, this.isLoading = false});

  const AsyncValue.loading() : this._(isLoading: true);
  const AsyncValue.data(T value) : this._(data: value);
  const AsyncValue.error(Object err) : this._(error: err);

  bool get hasData => data != null;
  bool get hasError => error != null;

  R when<R>({
    required R Function() loading,
    required R Function(Object error) error,
    required R Function(T data) data,
  }) {
    if (isLoading) return loading();
    if (this.error != null) return error(this.error!);
    return data(this.data as T);
  }
}
