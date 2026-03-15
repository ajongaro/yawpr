import type { FC } from "hono/jsx";
import { MarketingLayout } from "./layout";

export const MarketingHomePage: FC = () => {
  return (
    <MarketingLayout>
      <section class="hero">
        <div class="container">
          <h1 class="hero-title">
            Mute everything.
            <br />
            Miss nothing.
          </h1>
          <p class="hero-subtitle">
            When something actually breaks, your phone lights up — even on Do
            Not Disturb. Everything else can wait.
          </p>
          <div class="hero-actions">
            <a href="/app/login" class="btn btn-primary btn-lg">
              Sign in with Slack
            </a>
          </div>
        </div>
      </section>

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
                <strong>Run /yawp setup</strong>
                <p>
                  The bot walks you through creating a team and adding members.
                  Everyone gets a DM with setup instructions.
                </p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div>
                <strong>Go quiet. For real.</strong>
                <p>
                  Mute Slack. If something breaks, type{" "}
                  <code>/yawp fire @backend DB is down</code> and the right
                  person's phone goes off.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
