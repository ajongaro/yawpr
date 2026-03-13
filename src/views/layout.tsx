import type { FC } from "hono/jsx";

type LayoutProps = {
  title?: string;
  children: any;
  user?: { name: string; email: string } | null;
};

export const Layout: FC<LayoutProps> = ({ title, children, user }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} — mi-fire` : "mi-fire"}</title>
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        <nav class="nav">
          <div class="nav-brand">
            <a href="/">🔥 mi-fire</a>
          </div>
          <div class="nav-links">
            <a href="/">Dashboard</a>
            <a href="/alerts">Alerts</a>
            <a href="/teams">Teams</a>
            <a href="/schedules">Schedules</a>
            {user ? (
              <span class="nav-user">
                {user.name}
                <a href="/api/auth/sign-out" class="btn btn-sm">
                  Sign out
                </a>
              </span>
            ) : (
              <a href="/login" class="btn btn-sm btn-primary">
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
