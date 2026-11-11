// Apply the saved theme before the first paint so dark mode doesn't flash
// white on reload. Same key as src/utils/theme.ts. Kept as a file rather than
// an inline script so the Content-Security-Policy can stay at script-src 'self'.
try {
  if (localStorage.getItem('jobflow-theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
} catch (e) {}
