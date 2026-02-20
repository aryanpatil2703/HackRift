/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#050B14", // Deep void blue
                surface: "#0F172A",     // Base slate
                surfaceHighlight: "#1E293B",
                primary: "#3B82F6",    // Electric blue
                accent: "#10B981",     // Neon green
                danger: "#EF4444",     // Alert red
                warning: "#F59E0B",    // Warning amber
                muted: "#64748B",
            },
            animation: {
                'spin-slow': 'spin 8s linear infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'hero-glow': 'conic-gradient(from 180deg at 50% 50%, #1e293b 0deg, #0f172a 180deg, #1e293b 360deg)',
            }
        },
    },
    plugins: [],
}
