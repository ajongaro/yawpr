import type { FC } from "hono/jsx";
import { MarketingLayout } from "./layout";

export const AboutPage: FC = () => {
  return (
    <MarketingLayout title="About">
      <section class="page-section">
        <div class="container content-narrow">
          <h1>About Yawp'r</h1>
          <p class="lead">
            Yawp'r exists so your team can finally turn off notifications
            without the anxiety of missing something critical.
          </p>

          <h2>The Real Problem</h2>
          <p>
            Developers are drowning in pings. Every Slack message, every
            bot notification, every thread reply — it all demands attention.
            So your team does the rational thing: they mute channels, set
            Do Not Disturb, close the app entirely. They have to, just to
            get anything done.
          </p>
          <p>
            But now there's a knot in their stomach. What if something
            breaks? What if there's a P0 and nobody sees it? So some
            people leave notifications on for everything — and burn out
            from the constant interruptions. Others mute everything — and
            pray nothing goes wrong on their watch.
          </p>
          <p>
            That's a terrible choice. You shouldn't have to pick between
            your sanity and your reliability.
          </p>

          <h2>It's Not Your PM's Job Either</h2>
          <p>
            When something breaks right now, someone — usually a PM or
            team lead — has to figure out who's on call this week, dig
            through a spreadsheet for phone numbers, and personally chase
            people down across Slack, text, and phone calls. That's not
            project management. That's being a human pager.
          </p>
          <p>
            Your PM has better things to do than be the routing layer
            between an outage and the person who can fix it.
          </p>

          <h2>What Yawp'r Does</h2>
          <p>
            Yawp'r draws a clear line between noise and signal. Your team
            mutes Slack with confidence, knowing that if something truly
            matters, it will break through:
          </p>
          <ul>
            <li>
              <strong>Critical alerts bypass silent mode</strong> — fire-severity
              incidents hit your phone at max priority, even through Do Not
              Disturb. Your phone vibrates for a real outage, not a bot
              message.
            </li>
            <li>
              <strong>On-call schedules handle the routing</strong> — the
              system always knows who to page. No one has to look it up,
              no one has to ask, no one has to be the human switchboard.
            </li>
            <li>
              <strong>Everything else stays quiet</strong> — Slack DMs,
              dashboard, webhooks are there when you want them. But
              they're not screaming at you when you don't.
            </li>
          </ul>

          <h2>The Result</h2>
          <p>
            Your team gets to focus. Really focus — without the low-grade
            anxiety of wondering what they're missing. When something
            actually matters, they'll know. When it doesn't, they won't
            be interrupted.
          </p>
          <p>
            That's it. Peace when things are fine. A clear signal when
            they're not.
          </p>

          <h2>How It's Different</h2>
          <p>
            PagerDuty and Opsgenie are built for enterprises with complex
            escalation policies and six-figure contracts. Yawp'r is built
            for the team that just wants to mute Slack and still sleep at
            night. Set up takes two minutes. Free tier covers most small
            teams.
          </p>

          <h2>Built With</h2>
          <p>
            Cloudflare Workers, Hono, Drizzle ORM, D1, and Cloudflare
            Queues. Globally distributed, no cold starts, no servers to
            manage. Alerts deliver in milliseconds.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
};
