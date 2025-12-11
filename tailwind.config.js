/** @type {import('tailwindcss').Config} */
export default {
  // 补充的核心内容：指定 Tailwind 要扫描的文件路径
  content: [
    "./src/**/*.{html,ts,tsx}", // 匹配 src 目录下所有 html/ts/tsx 文件
    "./index.html" // 匹配项目根目录的 index.html
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}