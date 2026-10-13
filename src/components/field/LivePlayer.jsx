// Плеєр трансляції з камери майданчика.
// Саме відео віддає YouTube — сайт лише вставляє плеєр.
import { useStream, embedUrl } from '../../lib/live.js';

export default function LivePlayer({ objectKey }) {
  const { stream, loading } = useStream(objectKey);

  if (loading) return <p className="live-note">Завантажую трансляцію…</p>;

  const url = embedUrl(stream);
  if (!url) return <p className="live-note">Трансляція зараз не ведеться.</p>;

  return (
    <div className="live-player">
      <iframe
        src={url}
        title="Трансляція з камери"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
      ></iframe>
    </div>
  );
}
