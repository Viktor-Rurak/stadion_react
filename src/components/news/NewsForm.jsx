// Форма новини: заголовок, текст і фото.
// Одна й та сама форма і для нової новини, і для редагування наявної.
import { useEffect, useRef, useState } from 'react';

export default function NewsForm({ editing, busy, onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageFile, setImageFile] = useState(null); // нове фото, яке оберуть
  const [preview, setPreview] = useState(null); // що показати під формою
  const [removeImage, setRemoveImage] = useState(false);
  const fileInput = useRef(null);

  // Перейшли до редагування іншої новини — підставляємо її дані
  useEffect(() => {
    setTitle(editing?.title ?? '');
    setBody(editing?.body ?? '');
    setImageFile(null);
    setRemoveImage(false);
    setPreview(editing?.image_url ?? null);
    if (fileInput.current) fileInput.current.value = '';
  }, [editing]);

  // Тимчасове посилання на обране фото треба звільняти, інакше воно висить у пам'яті
  useEffect(() => {
    if (preview && preview.startsWith('blob:')) {
      return () => URL.revokeObjectURL(preview);
    }
  }, [preview]);

  function chooseFile(file) {
    setImageFile(file ?? null);
    setRemoveImage(false);
    setPreview(file ? URL.createObjectURL(file) : (editing?.image_url ?? null));
  }

  function dropImage() {
    setImageFile(null);
    setRemoveImage(true);
    setPreview(null);
    if (fileInput.current) fileInput.current.value = '';
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ title, body, imageFile, removeImage });
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Заголовок</span>
        <input
          className="field-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="На головному полі поклали новий газон"
          maxLength={200}
        />
      </label>

      <label className="field">
        <span className="field-label">Текст новини</span>
        <textarea
          className="field-input news-textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={7}
          placeholder="Що сталося, коли і що це означає для відвідувачів."
          maxLength={8000}
        />
      </label>

      <div className="field">
        <span className="field-label">Фото (необов&#39;язково)</span>
        <input
          ref={fileInput}
          className="field-file"
          type="file"
          accept="image/*"
          onChange={(e) => chooseFile(e.target.files?.[0])}
        />

        {preview && (
          <div className="image-preview">
            <img src={preview} alt="" />
            <button type="button" className="btn-small" onClick={dropImage}>
              Прибрати фото
            </button>
          </div>
        )}
      </div>

      <div className="admin-form-actions">
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? 'Зберігаємо…' : editing ? 'Зберегти зміни' : 'Опублікувати'}
        </button>

        {editing && (
          <button type="button" className="btn-small" onClick={onCancel} disabled={busy}>
            Скасувати редагування
          </button>
        )}
      </div>
    </form>
  );
}
