import type { FC } from "hono/jsx";
import { MarketingLayout } from "./layout";

export const PricingPage: FC = () => {
  return (
    <MarketingLayout title="Pricing">
      <section class="page-section">
        <div class="container">
          <h1 class="section-title">Simple Pricing</h1>
          <p class="section-subtitle">
            Start free. Upgrade when you need more.
          </p>

          <div class="pricing-grid">
            <div class="pricing-card">
              <div class="pricing-header">
                <h3>Free</h3>
                <div class="pricing-price">$0</div>
                <p>For small teams getting started</p>
              </div>
              <ul class="pricing-features">
                <li>5 teams</li>
                <li>20 members per team</li>
                <li>50 incidents / month</li>
                <li>Slack integration</li>
                <li>ntfy.sh notifications</li>
                <li>Webhook ingestion</li>
              </ul>
              <a href="/app/login" class="btn btn-primary btn-lg pricing-cta">
                Get Started
              </a>
            </div>

            <div class="pricing-card pricing-card-featured">
              <div class="pricing-header">
                <h3>Pro</h3>
                <div class="pricing-price">$29<span>/mo</span></div>
                <p>For growing engineering orgs</p>
              </div>
              <ul class="pricing-features">
                <li>25 teams</li>
                <li>100 members per team</li>
                <li>500 incidents / month</li>
                <li>Everything in Free</li>
                <li>Priority support</li>
                <li>Custom webhook parsers</li>
              </ul>
              <a href="/app/login" class="btn btn-primary btn-lg pricing-cta">
                Start Free Trial
              </a>
            </div>

            <div class="pricing-card">
              <div class="pricing-header">
                <h3>Enterprise</h3>
                <div class="pricing-price">Custom</div>
                <p>For organizations with specific needs</p>
              </div>
              <ul class="pricing-features">
                <li>Unlimited teams</li>
                <li>Unlimited members</li>
                <li>Unlimited incidents</li>
                <li>Everything in Pro</li>
                <li>SSO / SAML</li>
                <li>Dedicated support</li>
              </ul>
              <a href="mailto:hello@yawpr.dev" class="btn btn-lg pricing-cta">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};
