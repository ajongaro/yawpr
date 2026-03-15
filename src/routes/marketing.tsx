import { Hono } from "hono";
import type { Env } from "../lib/types";
import { MarketingHomePage } from "../views/marketing/home";
import { AboutPage } from "../views/marketing/about";
import { PricingPage } from "../views/marketing/pricing";
import { DocsPage } from "../views/marketing/docs";

const marketing = new Hono<Env>();

marketing.get("/", (c) => c.html(<MarketingHomePage />));
marketing.get("/about", (c) => c.html(<AboutPage />));
marketing.get("/pricing", (c) => c.html(<PricingPage />));
marketing.get("/docs", (c) => c.html(<DocsPage />));

export { marketing };
