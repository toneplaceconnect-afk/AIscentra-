// app/layout.js

import './globals.css';

export const metadata = {
  title: 'AIscentra Signals',
  description: 'Structured signals tracking the AI ecosystem.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <a href="/" className="site-header__brand">AIscentra</a>
          <nav className="site-header__nav">
            <a href="/">Home</a>
            <a href="/signals">All signals</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
