import type { FC } from "hono/jsx";
import { MarketingLayout } from "./layout";

export const DocsPage: FC = () => {
  return (
    <MarketingLayout title="Documentation">
      <section class="page-section">
        <div class="container content-narrow">
          <h1>Documentation</h1>

          <div class="docs-toc card">
            <h2>Contents</h2>
            <ul>
              <li><a href="#getting-started">Getting Started</a></li>
              <li><a href="#slack-bot">Slack Bot</a></li>
              <li><a href="#teams-members">Teams &amp; Members</a></li>
              <li><a href="#on-call">On-Call Schedules</a></li>
              <li><a href="#webhooks">Webhook Ingestion</a></li>
              <li><a href="#api">API Reference</a></li>
            </ul>
          </div>

          <h2 id="getting-started">Getting Started</h2>
          <ol class="how-it-works">
            <li>
              <strong>Sign in</strong> — Go to{" "}
              <a href="/app/login">/app/login</a> and sign in with Slack.
            </li>
            <li>
              <strong>Create your organization</strong> — Pick a name and URL
              slug (used in Slack commands).
            </li>
            <li>
              <strong>Connect Slack</strong> — From Settings, click "Connect
              Slack" to install the Yawp'r bot in your workspace.
            </li>
            <li>
              <strong>Create a team</strong> — Teams map to your engineering
              squads (e.g. "backend", "infra", "mobile").
            </li>
            <li>
              <strong>Add members</strong> — Add their Slack user ID and/or
              ntfy topic so they receive notifications.
            </li>
          </ol>

          <h2 id="slack-bot">Slack Bot</h2>
          <h3>Slash Command</h3>
          <p>Trigger incidents from any Slack channel:</p>
          <pre><code>/yawp fire @backend Database is down</code></pre>
          <p>Format: <code>/yawp &lt;severity&gt; @&lt;team-slug&gt; &lt;title&gt;</code></p>
          <p>
            Severity levels: <code>fire</code> (critical),{" "}
            <code>warning</code>, <code>info</code>
          </p>

          <h3>Interactive Buttons</h3>
          <p>
            When an incident notification is sent via Slack DM, it includes
            Acknowledge and Resolve buttons. Clicking them updates the incident
            status and logs who took the action.
          </p>

          <h2 id="teams-members">Teams &amp; Members</h2>
          <p>
            Each team has a <strong>slug</strong> used in Slack commands (e.g.{" "}
            <code>@backend</code>). Members need at least one notification
            channel configured:
          </p>
          <ul>
            <li>
              <strong>Slack User ID</strong> — For Slack DMs. Find it in
              Slack: click a user's profile → More → Copy member ID.
            </li>
            <li>
              <strong>ntfy Topic</strong> — For push notifications via{" "}
              <a href="https://ntfy.sh">ntfy.sh</a>. Fire-severity alerts
              bypass Do Not Disturb.
            </li>
          </ul>

          <h2 id="on-call">On-Call Schedules</h2>
          <p>
            Create time-based schedules to designate who is on-call for each
            team. The dashboard shows the current on-call person per team.
            Schedules use start/end datetime ranges.
          </p>

          <h2 id="webhooks">Webhook Ingestion</h2>
          <p>
            Create webhook sources from the Webhooks page. Each source gets a
            unique ingest URL:
          </p>
          <pre><code>POST https://yawpr.dev/webhooks/&lt;source-id&gt;/ingest</code></pre>

          <h3>Supported Formats</h3>
          <dl>
            <dt>CloudWatch (via SNS)</dt>
            <dd>
              Point an SNS topic at the ingest URL. Yawp'r auto-confirms the
              subscription and parses alarm name, state, and metric.
            </dd>
            <dt>Datadog</dt>
            <dd>
              Configure a Datadog webhook integration. Yawp'r extracts event
              title, body, and maps priority to severity.
            </dd>
            <dt>Generic</dt>
            <dd>
              Send JSON with <code>title</code> (required), <code>severity</code>{" "}
              (fire/warning/info), and <code>description</code> (optional).
            </dd>
          </dl>

          <h3>Authentication</h3>
          <p>
            Each webhook source has a shared secret. Include an HMAC-SHA256
            signature in the <code>X-Signature-256</code> header (with optional{" "}
            <code>sha256=</code> prefix). The secret is shown when you create
            the source.
          </p>

          <h2 id="api">API Reference</h2>
          <p>
            All API routes require authentication (session cookie from Slack
            sign-in) and are scoped to your active organization.
          </p>
          <table class="table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>GET</td><td>/api/incidents</td><td>List incidents (filter: ?status=active&amp;teamId=...)</td></tr>
              <tr><td>GET</td><td>/api/incidents/:id</td><td>Get incident detail</td></tr>
              <tr><td>POST</td><td>/api/incidents</td><td>Create incident</td></tr>
              <tr><td>POST</td><td>/api/incidents/:id/acknowledge</td><td>Acknowledge</td></tr>
              <tr><td>POST</td><td>/api/incidents/:id/resolve</td><td>Resolve</td></tr>
              <tr><td>POST</td><td>/api/incidents/:id/comment</td><td>Add comment</td></tr>
              <tr><td>GET</td><td>/api/teams</td><td>List teams</td></tr>
              <tr><td>POST</td><td>/api/teams</td><td>Create team</td></tr>
              <tr><td>GET</td><td>/api/teams/:id/members</td><td>List members</td></tr>
              <tr><td>POST</td><td>/api/teams/:id/members</td><td>Add member</td></tr>
              <tr><td>GET</td><td>/api/schedules/team/:teamId</td><td>List schedules</td></tr>
              <tr><td>GET</td><td>/api/schedules/team/:teamId/current</td><td>Current on-call</td></tr>
              <tr><td>POST</td><td>/api/schedules</td><td>Create schedule</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </MarketingLayout>
  );
};
