import type { Metadata } from "next";
import { Instrument_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Editorial / cinematic pairing: dramatic serif display + refined humanist body.
// Weights trimmed to the minimum in use + display:swap so fonts never block the
// globe's first paint (text shows instantly in a fallback, swaps when ready).
const displaySerif = Instrument_Serif({
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const bodySans = IBM_Plex_Sans({
  variable: "--font-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const dataMono = IBM_Plex_Mono({
  variable: "--font-mono",
  weight: ["500"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "24 Hours on Earth — How the world sleeps, works, and lives",
  description:
    "An interactive exploration of how the world spends its 24 hours. VizCon 2026.",
};

// Resolve the theme BEFORE first paint so there's no dark-flash on a light
// system (or vice-versa). Stored choice wins; otherwise follow the OS setting.
// Kept as a string so it runs synchronously in <head>, ahead of React.
const themeInit = `(function(){try{var s=localStorage.getItem("theme");var light=s==="light";var c=document.documentElement.classList;c.toggle("light",light);c.toggle("dark",!light);document.documentElement.style.colorScheme=light?"light":"dark";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Default class is dark; the inline script corrects it before paint.
      className={`${displaySerif.variable} ${bodySans.variable} ${dataMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
