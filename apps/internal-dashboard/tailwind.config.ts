import type { Config } from 'tailwindcss';
import baseConfig from '@greenenergy/config/tailwind.config';

const config: Config = {
  ...baseConfig,
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'],
};

export default config;
