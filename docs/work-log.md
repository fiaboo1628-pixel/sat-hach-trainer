# Work log

## 2026-11-05 — Audio update and cleanup

- Updated 18 synthesized error/fail announcements, including the requested wording changes and removal of the “Lên vỉa hè” button. Fixed truncated endings by applying FFmpeg input duration before tempo changes and adding quiet tails. Commit: `a517755`, cache v43.
- Separated backing music from 12 recorded announcements using Demucs 4.1.0 / HTDemucs. Preserved source context while separating and added 400 ms quiet tails. Rebuild script: `tools/separate-recorded-audio.py`; provenance: `docs/audio-recorded-source.json`. Commit: `c787d37`, cache v44.
- Verification: 29 application tests passed; all 12 recorded files decoded with the expected duration and quiet tails. ASR comparison is only a rough aid: recognition errors occur on both original and separated recordings; perceptual accuracy is not certified.
- Pushed both audio changes to `main` and deployed to https://sat-hach-trainer.vercel.app. Verified live cache v44 and the deployed pass announcement checksum against the local file.
- Removed the temporary separation environment, intermediate stems, input WAVs, verification scripts and deployment-check downloads (960 MiB).
- Kept the original source MP3, five final synthesis WAV batches and the combined v43 preview in sibling folder `../sat-hach-audio-preview/` for future audio edits. Model download caches remain reusable.
- Android APK was not rebuilt in this update.

## Việc để làm sau — Android

- [ ] Build lại APK Android từ bản web mới nhất (hiện tại cache v44), đưa đủ 18 câu báo lỗi đã sửa và 12 câu thông báo đã tách nhạc vào bản cài.
- [ ] Kiểm tra trên Android: cập nhật từ bản cũ, phát âm thanh offline, tốc độ đọc và chữ cuối câu; xác nhận không còn nút “Lên vỉa hè”.
- [ ] Ghi phiên bản APK, kết quả kiểm tra và vị trí file cài vào work log khi hoàn tất.

Người dùng yêu cầu ngày 2026-11-05: ghi lại để làm lúc rảnh; chưa build hoặc phát hành Android trong lần này.
