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
              <li><a href="#tldr">TL;DR</a></li>
              <li><a href="#admin-setup">Admin Setup (one-time)</a></li>
              <li><a href="#commands">Bot Commands</a></li>
              <li><a href="#on-call">On-Call &amp; Escalation</a></li>
              <li><a href="#incidents">Incidents &amp; Auto-Resolve</a></li>
              <li><a href="#ntfy">Push Notifications (ntfy)</a></li>
              <li><a href="#webhooks">Webhooks</a></li>
            </ul>
          </div>

          <h2 id="tldr">TL;DR</h2>
          <p>
            Yawpr is a Slack bot. One admin sets it up. Everyone else just
            uses Slack — no website needed.
          </p>
          <ol class="how-it-works">
            <li>Admin signs in at <a href="/app/login">yawpr.dev</a>, creates the group, connects the Slack bot</li>
            <li>Admin runs <code>/yawp setup</code> in Slack to create teams and add members</li>
            <li>Members get a DM with push notification setup (ntfy app)</li>
            <li><code>/yawp fire @oncall DB is down</code> — phones go off</li>
            <li>No ack in 15 min? Auto-escalates to the full team</li>
            <li>Monitoring tools auto-create and auto-resolve incidents via webhooks</li>
          </ol>

          <h2 id="admin-setup">Admin Setup (one-time)</h2>
          <p>Only the admin needs to do this. Everyone else just uses Slack.</p>
          <ol class="how-it-works">
            <li>
              <strong>Sign in</strong> at{" "}
              <a href="/app/login">yawpr.dev/app/login</a> with Slack
            </li>
            <li>
              <strong>Name your group</strong> — this is your isolated
              workspace (e.g. "Michigan Team"). Other groups in the same
              Slack workspace won't see your data.
            </li>
            <li>
              <strong>Connect Slack</strong> — from{" "}
              <a href="/app/settings">Settings</a>, install the Yawpr bot
            </li>
            <li>
              <strong>Create teams</strong> — in Slack, run{" "}
              <code>/yawp setup</code>. Create your alert teams
              (e.g. <code>@michigan-oncall</code> and{" "}
              <code>@michigan-all</code>)
            </li>
            <li>
              <strong>Set escalation</strong> — <code>/yawp team @michigan-oncall</code>{" "}
              → Set Escalation → pick <code>@michigan-all</code>.
              Now unacked incidents auto-escalate after 15 minutes.
            </li>
          </ol>
          <p>Done. Everyone the admin added gets a DM with ntfy setup instructions.</p>

          <h2 id="commands">Bot Commands</h2>
          <p>Type <code>/yawp</code> to see all commands.</p>

          <table class="table">
            <thead>
              <tr><th>Command</th><th>What it does</th></tr>
            </thead>
            <tbody>
              <tr><td><code>/yawp setup</code></td><td>Create a team + add members (wizard)</td></tr>
              <tr><td><code>/yawp teams</code></td><td>List all teams</td></tr>
              <tr><td><code>/yawp team @slug</code></td><td>Manage team (add/remove members, set escalation, rename, delete)</td></tr>
              <tr><td><code>/yawp fire</code></td><td>Trigger incident (form)</td></tr>
              <tr><td><code>/yawp fire @team msg</code></td><td>Quick-fire (no form)</td></tr>
              <tr><td><code>/yawp status</code></td><td>Active incidents</td></tr>
              <tr><td><code>/yawp history</code></td><td>Recent incidents</td></tr>
              <tr><td><code>/yawp stats</code></td><td>30-day metrics (incident count, avg ack time, avg resolve time)</td></tr>
              <tr><td><code>/yawp mytopic</code></td><td>DM yourself your ntfy topic (if you lost it or got a new phone)</td></tr>
            </tbody>
          </table>

          <h2 id="on-call">On-Call &amp; Escalation</h2>
          <p>
            There's no scheduling. Use teams to manage on-call:
          </p>
          <ul>
            <li>Create a small on-call team (e.g. <code>@michigan-oncall</code>) with whoever is on duty</li>
            <li>Create a full team (e.g. <code>@michigan-all</code>) with everyone</li>
            <li>Set <code>@michigan-oncall</code> to escalate to <code>@michigan-all</code></li>
            <li>Fire at <code>@michigan-oncall</code> — if no ack in 15 min, the full team gets paged</li>
            <li>Swap on-call by adding/removing members — their ntfy topic carries over</li>
          </ul>

          <h2 id="incidents">Incidents &amp; Auto-Resolve</h2>
          <p>
            When an incident is triggered, every member of the target team
            gets a Slack DM with Acknowledge/Resolve buttons and an ntfy
            push notification.
          </p>
          <ul>
            <li>
              <strong>Fire</strong> — requires explicit resolve after ack.
              Bypasses Do Not Disturb via ntfy.
            </li>
            <li>
              <strong>Warning / Info</strong> — auto-resolves when
              acknowledged (one click, less noise).
            </li>
            <li>
              <strong>Deduplication</strong> — repeated webhook alerts for
              the same alarm don't create duplicate incidents.
            </li>
            <li>
              <strong>Auto-resolve from monitoring</strong> — CloudWatch OK,
              Datadog recovery, or generic <code>"status": "resolved"</code>{" "}
              webhooks auto-resolve the matching incident.
            </li>
          </ul>

          <h2 id="ntfy">Push Notifications (ntfy)</h2>
          <p>
            When you're added to a team, Yawpr DMs you a unique topic.
            Install the <a href="https://ntfy.sh">ntfy app</a>, subscribe
            to your topic, and you're done. Lost it? Run{" "}
            <code>/yawp mytopic</code> to get it again.
          </p>
          <p><strong>To bypass Do Not Disturb:</strong></p>
          <ul>
            <li><strong>iPhone</strong>: Settings → ntfy → Notifications → Time Sensitive Notifications</li>
            <li><strong>Android</strong>: Settings → Apps → ntfy → Notifications → Urgent, then allow ntfy in DND exceptions</li>
          </ul>

          <h2 id="webhooks">Webhooks</h2>
          <p>
            Connect monitoring tools to auto-create and auto-resolve
            incidents. Set up via the{" "}
            <a href="/app/webhooks">web dashboard</a>. Supports
            CloudWatch/SNS, Datadog, and generic JSON.
          </p>
          <p>
            Each source gets a unique URL with HMAC-SHA256 verification.
            The signing secret is shown once at creation — copy it then.
            Duplicate alerts are automatically deduplicated by alarm name
            or alert ID.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
};
