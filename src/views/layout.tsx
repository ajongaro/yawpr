import type { FC } from "hono/jsx";

type LayoutProps = {
  title?: string;
  children: any;
  user?: { name: string; email: string } | null;
  orgName?: string;
};

export const Layout: FC<LayoutProps> = ({ title, children, user, orgName }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} — Yawpr` : "Yawpr"}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        <nav class="nav">
          <div class="nav-brand">
            <a href="/app">Yawpr</a>
            {orgName && <span class="nav-org">{orgName}</span>}
          </div>
          <div class="nav-links">
            <a href="/app">Home</a>
            <a href="/app/teams">Teams</a>
            <a href="/app/schedules">Schedules</a>
            <a href="/app/incidents">History</a>
            <a href="/app/settings">Settings</a>
            {user ? (
              <span class="nav-user">
                {user.name}
                <form method="post" action="/app/sign-out" style="display:inline">
                  <button type="submit" class="btn btn-sm">
                    Sign out
                  </button>
                </form>
              </span>
            ) : (
              <a href="/app/login" class="btn btn-sm btn-primary">
                Sign in
              </a>
            )}
          </div>
        </nav>
        <main class="container">{children}</main>
        <script src="/static/app.js"></script>
      </body>
    </html>
  );
};
