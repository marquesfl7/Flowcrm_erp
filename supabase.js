/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-slate-50 text-slate-800;
    font-family: 'Inter', system-ui, sans-serif;
  }

  /* Scrollbar sutil */
  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-slate-300 rounded-full;
  }
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-slate-400;
  }
}

@layer utilities {
  .animate-in {
    animation: slideIn 0.18s ease-out;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
}
