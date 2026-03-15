import type { FC } from "hono/jsx";
import { MarketingLayout } from "./layout";

export const PricingPage: FC = () => {
  return (
    <MarketingLayout title="Pricing">
      <section class="page-section">
        <div class="container">
          <h1 class="section-title">Simple Pricing</h1>
          <p class="section-subtitle">
            Two tiers. No negotiations.
          </p>

          <div class="pricing-grid">
            <div class="pricing-card">
              <div class="pricing-header">
                <h3>Free</h3>
                <div class="pricing-price">$0</div>
                <p>Exclusively for Gambyt employees. You know who you are.</p>
              </div>
              <ul class="pricing-features">
                <li>Unlimited teams</li>
                <li>Unlimited members</li>
                <li>Unlimited incidents</li>
                <li>Slack integration</li>
                <li>ntfy.sh notifications</li>
                <li>Webhook ingestion</li>
                <li>The warm feeling of being chosen</li>
              </ul>
              <a href="/app/login" class="btn btn-primary btn-lg pricing-cta">
                Sign In with Gambyt Slack
              </a>
            </div>

            <div class="pricing-card pricing-card-featured">
              <div class="pricing-header">
                <h3>Pro</h3>
                <div class="pricing-price">$1,000,000<span>/mo</span></div>
                <p>For everyone else</p>
              </div>
              <ul class="pricing-features">
                <li>Unlimited teams</li>
                <li>Unlimited members</li>
                <li>Unlimited incidents</li>
                <li>Everything in Free</li>
                <li>Priority support</li>
                <li>Custom webhook parsers</li>
                <li>A personal thank-you call from the founder</li>
              </ul>
              <a href="/app/login" class="btn btn-primary btn-lg pricing-cta">
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
