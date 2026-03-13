# 应用图标

源图标位于 `.image/claw-tool-icon.png`。

打包时，`scripts/build.mjs` 会自动将源图标复制到 `dist/icons/icon.png`。

如需生成各平台优化图标，请在此目录放置：

- `icon.ico` — Windows 图标（包含 16/32/48/64/128/256 尺寸）
- `icon.icns` — macOS 图标

## 从 PNG 源文件生成

### Windows (.ico)

```bash
magick ../../.image/claw-tool-icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### macOS (.icns)

```bash
mkdir icon.iconset
for size in 16 32 64 128 256 512 1024; do
  magick ../../.image/claw-tool-icon.png -resize ${size}x${size} icon.iconset/icon_${size}x${size}.png
done
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
```

如果未生成平台特定图标，打包脚本会使用 PNG 作为 fallback。
