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
              <li><a href="#slack-bot">Slack Bot Commands</a></li>
              <li><a href="#teams">Managing Teams</a></li>
              <li><a href="#on-call">On-Call Schedules</a></li>
              <li><a href="#incidents">Incidents</a></li>
              <li><a href="#ntfy">ntfy Push Notifications</a></li>
              <li><a href="#webhooks">Webhook Ingestion</a></li>
              <li><a href="#api">API Reference</a></li>
            </ul>
          </div>

          <h2 id="getting-started">Getting Started</h2>
          <p>
            Everything in Yawp'r happens through Slack. Here's the full setup:
          </p>
          <ol class="how-it-works">
            <li>
              <strong>Sign in</strong> — Visit{" "}
              <a href="/app/login">yawpr.dev/app/login</a> and sign in with
              Slack. The first person to sign in creates the organization
              (everyone else auto-joins).
            </li>
            <li>
              <strong>Install the Slack app</strong> — From{" "}
              <a href="/app/settings">Settings</a>, click "Connect Slack" to
              add the Yawp'r bot to your workspace.
            </li>
            <li>
              <strong>Create a team</strong> — In Slack, type{" "}
              <code>/yawp setup</code>. The bot walks you through naming a
              team and picking members.
            </li>
            <li>
              <strong>Done</strong> — Each member gets a DM with instructions
              to install the ntfy app for push notifications. You're ready to
              fire.
            </li>
          </ol>

          <h2 id="slack-bot">Slack Bot Commands</h2>
          <p>
            All commands use <code>/yawp</code>. Type <code>/yawp</code> with
            no arguments to see the full list.
          </p>

          <h3>Setup &amp; Teams</h3>
          <table class="table">
            <thead>
              <tr><th>Command</th><th>What it does</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>/yawp setup</code></td>
                <td>Create a new team (wizard modal — pick a name, select members)</td>
              </tr>
              <tr>
                <td><code>/yawp teams</code></td>
                <td>List all your teams</td>
              </tr>
              <tr>
                <td><code>/yawp team @slug</code></td>
                <td>Open the team management modal (add/remove members, schedule on-call, rename, delete)</td>
              </tr>
            </tbody>
          </table>

          <h3>Incidents</h3>
          <table class="table">
            <thead>
              <tr><th>Command</th><th>What it does</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>/yawp fire</code></td>
                <td>Open the incident form (pick team, severity, type a message)</td>
              </tr>
              <tr>
                <td><code>/yawp fire @backend DB is down</code></td>
                <td>Quick-fire shortcut — triggers immediately, no modal</td>
              </tr>
              <tr>
                <td><code>/yawp warning @backend ...</code></td>
                <td>Trigger a warning-level incident</td>
              </tr>
              <tr>
                <td><code>/yawp info @backend ...</code></td>
                <td>Trigger an info-level incident</td>
              </tr>
              <tr>
                <td><code>/yawp status</code></td>
                <td>Show all active (unresolved) incidents</td>
              </tr>
              <tr>
                <td><code>/yawp history</code></td>
                <td>View recent incident history</td>
              </tr>
            </tbody>
          </table>

          <h3>On-Call</h3>
          <table class="table">
            <thead>
              <tr><th>Command</th><th>What it does</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><code>/yawp oncall @slug</code></td>
                <td>Check who's currently on call for a team</td>
              </tr>
            </tbody>
          </table>
          <p>
            To <em>schedule</em> on-call, use{" "}
            <code>/yawp team @slug</code> and click <strong>Schedule On-Call</strong>.
            The modal has date and time pickers — no typing dates.
          </p>

          <h2 id="teams">Managing Teams</h2>
          <p>
            Type <code>/yawp team @slug</code> to open the team management
            modal. From there you can:
          </p>
          <ul>
            <li><strong>Add Members</strong> — Multi-select from your Slack workspace. Each new member gets a DM with ntfy setup instructions.</li>
            <li><strong>Remove Member</strong> — Pick from a dropdown. Their schedules are also removed.</li>
            <li><strong>Schedule On-Call</strong> — Pick a member, start date/time, end date/time.</li>
            <li><strong>Rename Team</strong> — Updates the name and slug.</li>
            <li><strong>Delete Team</strong> — Removes the team, all members, and all schedules. Requires confirmation.</li>
          </ul>

          <h2 id="on-call">On-Call Schedules</h2>
          <p>
            Schedules are simple time ranges: a member is on-call from a start
            date/time to an end date/time. When an incident is triggered,
            Yawp'r checks who is currently on-call for that team.
          </p>
          <p>
            Schedule on-call via the team management modal
            (<code>/yawp team @slug</code> → <strong>Schedule On-Call</strong>)
            or from the <a href="/app/schedules">Schedules page</a> in the web
            dashboard.
          </p>

          <h2 id="incidents">Incidents</h2>
          <p>
            When an incident is triggered, every member of the target team
            receives:
          </p>
          <ul>
            <li>A <strong>Slack DM</strong> with Acknowledge and Resolve buttons</li>
            <li>An <strong>ntfy push notification</strong> on their phone (if they've subscribed to their topic)</li>
          </ul>

          <h3>Severity Levels</h3>
          <table class="table">
            <thead>
              <tr><th>Severity</th><th>ntfy Priority</th><th>Behavior</th></tr>
            </thead>
            <tbody>
              <tr><td>🔥 Fire</td><td>5 (max)</td><td>Bypasses Do Not Disturb</td></tr>
              <tr><td>⚠️ Warning</td><td>4 (high)</td><td>Standard notification</td></tr>
              <tr><td>ℹ️ Info</td><td>3 (default)</td><td>Standard notification</td></tr>
            </tbody>
          </table>

          <h3>Lifecycle</h3>
          <p>
            Every incident moves through: <strong>Active</strong> →{" "}
            <strong>Acknowledged</strong> → <strong>Resolved</strong>. Each
            state change is logged with who took the action and when.
          </p>

          <h2 id="ntfy">ntfy Push Notifications</h2>
          <p>
            <a href="https://ntfy.sh">ntfy</a> is a free push notification
            service. When you're added to a team, Yawp'r auto-generates a
            unique, private topic for you and DMs you the setup instructions:
          </p>
          <ol>
            <li>Install the <strong>ntfy app</strong> (<a href="https://ntfy.sh">iOS + Android</a>)</li>
            <li>Open the app, tap <strong>+</strong></li>
            <li>Enter your personal topic (sent to you in the DM)</li>
          </ol>

          <h3>Enable DND Bypass</h3>
          <p>
            Yawpr sends fire alerts at ntfy priority 5, but your phone
            needs to be configured to let them through Do Not Disturb:
          </p>
          <ul>
            <li>
              <strong>iPhone</strong>: Settings → ntfy → Notifications →
              turn on <strong>Time Sensitive Notifications</strong>
            </li>
            <li>
              <strong>Android</strong>: Settings → Apps → ntfy →
              Notifications → set channel to <strong>Urgent</strong>.
              Then Settings → Do Not Disturb → Exceptions → allow ntfy.
            </li>
          </ul>
          <p>
            Without this step, fire alerts will arrive silently during DND.
          </p>

          <h2 id="webhooks">Webhook Ingestion</h2>
          <p>
            Connect external monitoring tools to auto-create incidents. Create
            webhook sources from the <a href="/app/webhooks">Webhooks page</a>{" "}
            in the web dashboard. Each source gets a unique ingest URL:
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
            <dt>Generic JSON</dt>
            <dd>
              Send JSON with <code>title</code> (required),{" "}
              <code>severity</code> (fire/warning/info), and{" "}
              <code>description</code> (optional).
            </dd>
          </dl>

          <h3>Authentication</h3>
          <p>
            Each webhook source has a shared secret. Include an HMAC-SHA256
            signature in the <code>X-Signature-256</code> header. The secret
            is shown when you create the source.
          </p>

          <h2 id="api">API Reference</h2>
          <p>
            All API routes require authentication (session cookie from Slack
            sign-in) and are scoped to your organization.
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
              <tr><td>GET</td><td>/api/incidents</td><td>List incidents</td></tr>
              <tr><td>GET</td><td>/api/incidents/:id</td><td>Get incident detail</td></tr>
              <tr><td>POST</td><td>/api/incidents</td><td>Create incident</td></tr>
              <tr><td>POST</td><td>/api/incidents/:id/acknowledge</td><td>Acknowledge</td></tr>
              <tr><td>POST</td><td>/api/incidents/:id/resolve</td><td>Resolve</td></tr>
              <tr><td>POST</td><td>/api/incidents/:id/comment</td><td>Add comment</td></tr>
              <tr><td>GET</td><td>/api/teams</td><td>List teams</td></tr>
              <tr><td>POST</td><td>/api/teams</td><td>Create team</td></tr>
              <tr><td>PUT</td><td>/api/teams/:id</td><td>Update team</td></tr>
              <tr><td>DELETE</td><td>/api/teams/:id</td><td>Delete team</td></tr>
              <tr><td>GET</td><td>/api/teams/:id/members</td><td>List members</td></tr>
              <tr><td>POST</td><td>/api/teams/:id/members</td><td>Add member</td></tr>
              <tr><td>DELETE</td><td>/api/teams/:tid/members/:mid</td><td>Remove member</td></tr>
              <tr><td>GET</td><td>/api/schedules/team/:teamId</td><td>List schedules</td></tr>
              <tr><td>GET</td><td>/api/schedules/team/:teamId/current</td><td>Current on-call</td></tr>
              <tr><td>POST</td><td>/api/schedules</td><td>Create schedule</td></tr>
              <tr><td>DELETE</td><td>/api/schedules/:id</td><td>Delete schedule</td></tr>
              <tr><td>POST</td><td>/api/checkout</td><td>Start Stripe checkout ($1M/mo plan)</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </MarketingLayout>
  );
};
