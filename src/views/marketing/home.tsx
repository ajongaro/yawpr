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
                <strong>Admin signs in once</strong>
                <p>Sign in with Slack, name your group, connect the bot. One-time setup.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div>
                <strong>Build your teams in Slack</strong>
                <p>
                  <code>/yawp setup</code> — pick members, they get a DM
                  with push notification setup. No one else touches the website.
                </p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div>
                <strong>Fire when it matters</strong>
                <p>
                  <code>/yawp fire</code> — the team's phones go off.
                  No response in 15 min? Auto-escalates to the full team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
