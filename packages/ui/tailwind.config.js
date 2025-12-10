const baseConfig = require('@greenenergy/config/tailwind.config');

/** @type {import('tailwindcss').Config} */
module.exports = {
  ...baseConfig,
  content: ['./src/**/*.{ts,tsx}'],
};
