import type { FC } from "hono/jsx";

type MarketingLayoutProps = {
  title?: string;
  children: any;
};

export const MarketingLayout: FC<MarketingLayoutProps> = ({
  title,
  children,
}) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} — Yawp'r` : "Yawp'r — Dev Team Alerting"}</title>
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        <nav class="nav">
          <div class="nav-brand">
            <a href="/">Yawp'r</a>
          </div>
          <div class="nav-links">
            <a href="/about">About</a>
            <a href="/pricing">Pricing</a>
            <a href="/docs">Docs</a>
            <a href="/app/login" class="btn btn-sm btn-primary">
              Sign in
            </a>
          </div>
        </nav>
        <main>{children}</main>
        <footer class="marketing-footer">
          <div class="container">
            <div class="footer-grid">
              <div>
                <strong>Yawp'r</strong>
                <p class="text-muted">Dev team alerting platform.</p>
              </div>
              <div>
                <strong>Product</strong>
                <a href="/pricing">Pricing</a>
                <a href="/docs">Documentation</a>
              </div>
              <div>
                <strong>Company</strong>
                <a href="/about">About</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
};
