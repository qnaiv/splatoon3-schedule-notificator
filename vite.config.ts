import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// データファイルをpublicディレクトリにコピーする関数
const copyDataFiles = () => {
  const publicDataDir = resolve(__dirname, 'public/data');

  // public/dataディレクトリを作成（存在しない場合）
  if (!existsSync(publicDataDir)) {
    mkdirSync(publicDataDir, { recursive: true });
  }

  // データファイルをコピー
  const dataFiles = ['event-types.txt', 'stage-types.txt'];
  dataFiles.forEach((file) => {
    const src = resolve(__dirname, `data/${file}`);
    const dest = resolve(__dirname, `public/data/${file}`);
    if (existsSync(src)) {
      copyFileSync(src, dest);
      console.log(`Copied ${file} to public/data/`);
    }
  });
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-data-files',
      buildStart() {
        // ビルド開始時にデータファイルをコピー
        copyDataFiles();
      },
      configureServer(_server) {
        // 開発サーバー起動時にもデータファイルをコピー
        copyDataFiles();
      },
    },
  ],
  base:
    process.env.GITHUB_PAGES === 'true'
      ? '/splatoon3-schedule-notificator/'
      : '/',
  server: {
    port: 3000,
  },
});
