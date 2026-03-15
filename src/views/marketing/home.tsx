import type { FC } from "hono/jsx";
import { MarketingLayout } from "./layout";

export const MarketingHomePage: FC = () => {
  return (
    <MarketingLayout>
      <section class="hero hero-compact">
        <div class="container">
          <h1 class="hero-title">
            Mute everything.
            <br />
            Miss nothing.
          </h1>
          <p class="hero-subtitle">
            When something breaks, your phone lights up — even on Do Not
            Disturb. Everything else can wait.
          </p>
          <div class="hero-actions">
            <a href="/app/login" class="btn btn-primary btn-lg">
              Sign in with Slack
            </a>
          </div>
        </div>
      </section>

      <section class="how-section how-section-compact">
        <div class="container content-narrow">
          <h2 class="section-title">Set up in 2 minutes</h2>
          <div class="steps">
            <div class="step">
              <div class="step-number">1</div>
              <div>
                <strong>Sign in with Slack</strong>
                <p>One click. No password.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div>
                <strong>Run /yawp setup</strong>
                <p>Name a team, pick members. Everyone gets a DM with push notification setup.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div>
                <strong>Type /yawp fire</strong>
                <p>Pick a team, describe the problem, hit send. Phones go off.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
