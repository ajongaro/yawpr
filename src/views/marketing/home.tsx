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
          <h2 class="section-title">How it works</h2>
          <div class="steps">
            <div class="step">
              <div class="step-number">1</div>
              <div>
                <strong>One person connects the bot</strong>
                <p>Sign in with Slack, name your group. Done in 60 seconds.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div>
                <strong>Set up teams from Slack</strong>
                <p>
                  <code>/yawp setup</code> — everyone you add gets a DM
                  with push notification setup. Nobody visits a website.
                </p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div>
                <strong>Fire when it matters</strong>
                <p>
                  <code>/yawp fire</code> — phones go off, even on silent.
                  No response in 15 min? Auto-escalates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
