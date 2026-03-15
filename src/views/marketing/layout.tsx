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
        <title>{title ? `${title} — Yawpr` : "Yawpr — Dev Team Alerting"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        <nav class="nav">
          <div class="nav-brand">
            <a href="/">Yawpr</a>
          </div>
          <div class="nav-links">
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
            <p class="text-muted">Yawpr — Dev team alerting.</p>
          </div>
        </footer>
      </body>
    </html>
  );
};
