# Souffle — сайт школы фридайвинга (набросок)

Статичный сайт без сборки и библиотек: `index.html`, `styles.css`, `main.js` и папка `frames/` (466 кадров WebP, ~12 МБ).

## Как опубликовать на GitHub Pages
1. Создайте на github.com новый **публичный** репозиторий, например `souffle`.
2. Нажмите **Add file → Upload files** и перетащите **содержимое** этой папки (не саму папку): `index.html`, `styles.css`, `main.js`, `poster.webp`, `.nojekyll`, `README.md` и папку `frames`. Нажмите **Commit changes**.
   - Если браузер не загружает папку целиком, загрузите сначала файлы, потом отдельно папку `frames`.
3. Откройте **Settings → Pages**, в разделе *Build and deployment* выберите **Deploy from a branch**, ветку `main` и папку `/ (root)`, нажмите **Save**.
4. Через 1–2 минуты сайт будет доступен по адресу `https://ВАШ-ЛОГИН.github.io/souffle/`.

## Что где менять
- **Тексты, курсы, цены, контакты:** `index.html`. Номер WhatsApp — в ссылке `wa.me/...`, почта — в `mailto:`.
- **На какой глубине появляется текст:** атрибуты `data-from` и `data-to` у блоков `.station` (0 — начало спуска, 1 — конец).
- **Цвета и шрифты:** блок `:root` в начале `styles.css`.
- **Другое видео:** нарежьте его на кадры и поменяйте `FRAME_COUNT` в `main.js`:
  ```bash
  ffmpeg -i video.mp4 -vf fps=15 -c:v libwebp -quality 70 frames/f_%04d.webp
  ```
- **Длина скролла:** `.descent { height: 700vh; }` в `styles.css`. Больше — спуск медленнее.
