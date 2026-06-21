// app/layout.js

import './globals.css';

export const metadata = {
  title: 'AIscentra Observatory',
  description: 'Structured signals tracking the AI ecosystem.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="site-nav">
          <a href="/" className="nav-brand">
            <span className="dot" />
            AIscentra
          </a>
          <div className="nav-links">
            <a href="/">Home</a>
            <a href="/signals">All signals</a>
            <a href="/models">Models</a>
            <a href="/about">About</a>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="site-foot">
          <span className="foot-brand">AIscentra Observatory</span>
          <div className="foot-links">
            <a href="/">Home</a>
            <a href="/signals">All signals</a>
            <a href="/models">Models</a>
            <a href="/about">About</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
