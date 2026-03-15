import type { FC } from "hono/jsx";
import { MarketingLayout } from "./layout";

export const MarketingHomePage: FC = () => {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section class="hero">
        <div class="container">
          <h1 class="hero-title">
            Mute everything.
            <br />
            Miss nothing.
          </h1>
          <p class="hero-subtitle">
            Your team deserves to silence Slack, close their laptop, and
            actually focus — knowing that if something truly breaks, they'll
            hear about it. Yawp'r is the line between peace and chaos.
          </p>
          <div class="hero-actions">
            <a href="/app/login" class="btn btn-primary btn-lg">
              Get Started Free
            </a>
            <a href="/docs" class="btn btn-lg">
              How It Works
            </a>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section class="problem-section">
        <div class="container content-narrow">
          <h2 class="section-title">You shouldn't have to choose</h2>
          <div class="problem-grid">
            <div class="problem-card">
              <p class="problem-quote">"I keep notifications on for everything just in case — I'm exhausted"</p>
            </div>
            <div class="problem-card">
              <p class="problem-quote">"I muted Slack for an hour of deep work and missed a P0"</p>
            </div>
            <div class="problem-card">
              <p class="problem-quote">"I just need to know when it actually matters"</p>
            </div>
          </div>
          <p class="problem-explainer">
            Right now your team has two options: leave notifications on and
            get pinged every 30 seconds, or turn them off and risk missing
            the one that matters. That's a broken choice. Most things can
            wait. Some things can't. You need a way to tell the difference.
          </p>
        </div>
      </section>

      {/* Solution */}
      <section class="features-section">
        <div class="container">
          <h2 class="section-title">Turn off the noise. Keep the signal.</h2>
          <p class="section-subtitle">
            Yawp'r gives your team permission to go quiet — because when
            something actually matters, it breaks through anyway.
          </p>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">&#x1F54A;</div>
              <h3>Silence Without Guilt</h3>
              <p>
                Mute Slack. Close your laptop. Go heads-down. Yawp'r only
                reaches out when something is truly on fire — not for every
                bot message and thread reply.
              </p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">&#x1F4F1;</div>
              <h3>Breaks Through When It Matters</h3>
              <p>
                Critical alerts bypass Do Not Disturb and silent mode.
                Your phone vibrates for a real incident — not because someone
                reacted to your message with a thumbs up.
              </p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">&#x1F3AF;</div>
              <h3>Only Alerts the Right Person</h3>
              <p>
                On-call schedules mean the person who can fix it gets
                paged — not an entire channel. Everyone else stays
                undisturbed.
              </p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">&#x1F916;</div>
              <h3>Works Right From Slack</h3>
              <p>
                Type <code>/yawp fire @backend DB is down</code> and
                the on-call engineer's phone lights up. Acknowledge and
                resolve from Slack — no context switching.
              </p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">&#x1F517;</div>
              <h3>Your Monitoring, Connected</h3>
              <p>
                CloudWatch alarm? Datadog alert? Grafana notification?
                Point the webhook at Yawp'r and the right person knows
                before anyone has to ask.
              </p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">&#x2705;</div>
              <h3>Know It's Handled</h3>
              <p>
                See who acknowledged, who's working on it, and when it's
                resolved. No more "is someone looking at this?" in Slack.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section class="how-section">
        <div class="container content-narrow">
          <h2 class="section-title">Set up in 2 minutes</h2>
          <div class="steps">
            <div class="step">
              <div class="step-number">1</div>
              <div>
                <strong>Sign in with Slack</strong>
                <p>One click. No password to remember.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div>
                <strong>Create a team, add your people</strong>
                <p>Set up on-call schedules so alerts always reach the right person.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div>
                <strong>Go quiet. For real.</strong>
                <p>Mute Slack, close the tab. If something breaks, Yawp'r cuts through. Everything else can wait.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section class="cta-section">
        <div class="container">
          <h2>Give your team their focus back.</h2>
          <p>Free for small teams. No credit card required.</p>
          <a href="/app/login" class="btn btn-primary btn-lg">
            Get Started Free
          </a>
        </div>
      </section>
    </MarketingLayout>
  );
};
