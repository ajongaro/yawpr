import { Hono } from "hono";
import { eq, desc, and, ne } from "drizzle-orm";
import type { Env } from "../lib/types";
import { getDb } from "../db/client";
import {
  incidents,
  incidentEvents,
  teams,
  members,
  schedules,
  organizations,
  slackInstallations,
  webhookSources,
} from "../db/schema";
import { authGuard } from "../middleware/auth";
import { getAuth } from "./auth/auth";
import {
  createIncident,
  acknowledgeIncident,
  resolveIncident,
  addComment,
} from "../services/incident";
import { getOnCall } from "../services/oncall";
import { decryptSecret, generateNtfyTopic } from "../lib/crypto";
import { checkIncidentLimit, checkTeamLimit } from "../middleware/limits";

// Page components
import { LoginPage } from "../views/pages/login";
import { OnboardingPage } from "../views/pages/onboarding";
import { HomePage } from "../views/pages/home";
import { IncidentsListPage } from "../views/pages/incidents-list";
import { IncidentDetailPage } from "../views/pages/incident-detail";
import { IncidentNewPage } from "../views/pages/incident-new";
import { TeamsPage } from "../views/pages/teams";
import { TeamDetailPage } from "../views/pages/team-detail";
import { SchedulesPage } from "../views/pages/schedules";
import { SettingsPage } from "../views/pages/settings";
import { WebhooksPage } from "../views/pages/webhooks";

const pages = new Hono<Env>();

// ─── Public ──────────────────────────────────────────────

pages.get("/login", (c) => {
  return c.html(<LoginPage />);
});

pages.post("/sign-out", async (c) => {
  const auth = getAuth(c.env);
  await auth.api.signOut({ headers: c.req.raw.headers });
  return c.redirect("/");
});

// ─── Protected routes ────────────────────────────────────
pages.use("/*", authGuard);

// ─── Onboarding ─────────────────────────────────────────

pages.get("/onboarding", (c) => {
  const user = c.get("user");
  const error = c.req.query("error");
  return c.html(<OnboardingPage user={user} error={error} />);
});

pages.post("/onboarding", async (c) => {
  const user = c.get("user");
  const body = await c.req.parseBody();
  const name = body.name as string;
  const slug = (body.slug as string).toLowerCase().replace(/[^a-z0-9-]/g, "");

  if (!name || !slug) {
    return c.html(
      <OnboardingPage user={user} error="Name and slug are required." />
    );
  }

  const db = getDb(c.env.DB);

  // Check slug uniqueness
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, slug));
  if (existing) {
    return c.html(
      <OnboardingPage user={user} error="That slug is already taken." />
    );
  }

  try {
    // Create org via Better Auth (handles auth-level membership)
    const auth = getAuth(c.env);
    const baOrg = await auth.api.createOrganization({
      body: { name, slug },
      headers: c.req.raw.headers,
    });

    const orgId = (baOrg as any).id;
    if (!orgId) {
      console.error("Better Auth createOrganization returned:", baOrg);
      return c.html(
        <OnboardingPage user={user} error="Failed to create organization. Please try again." />
      );
    }

    // Create our domain org with the same ID
    await db.insert(organizations).values({
      id: orgId,
      name,
      slug,
    });

    // Set as active org
    await auth.api.setActiveOrganization({
      body: { organizationId: orgId },
      headers: c.req.raw.headers,
    });

    return c.redirect("/app");
  } catch (err) {
    console.error("Onboarding error:", err);
    const message = err instanceof Error ? err.message : "Something went wrong";
    return c.html(
      <OnboardingPage user={user} error={message} />
    );
  }
});

// ─── Dashboard Home ──────────────────────────────────────

pages.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const org = c.get("org");

  const activeIncidents = await db
    .select({
      id: incidents.id,
      title: incidents.title,
      severity: incidents.severity,
      status: incidents.status,
      createdAt: incidents.createdAt,
      teamId: incidents.teamId,
    })
    .from(incidents)
    .where(and(eq(incidents.orgId, orgId), ne(incidents.status, "resolved")))
    .orderBy(desc(incidents.createdAt))
    .limit(20);

  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, orgId));
  const teamMap = new Map(allTeams.map((t) => [t.id, t.name]));

  const enrichedIncidents = activeIncidents.map((i) => ({
    ...i,
    teamName: teamMap.get(i.teamId) || "Unknown",
  }));

  const onCallSummary = [];
  for (const team of allTeams) {
    const onCall = await getOnCall(db, orgId, team.id);
    if (onCall) {
      onCallSummary.push({
        teamName: team.name,
        memberName: onCall.member.displayName,
      });
    }
  }

  return c.html(
    <HomePage
      user={user}
      orgName={org.name}
      teams={allTeams}
      activeIncidents={enrichedIncidents}
      onCallSummary={onCallSummary}
    />
  );
});

// ─── Quick Yawp (primary action) ─────────────────────────

pages.post("/yawp", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const body = await c.req.parseBody();

  const limit = await checkIncidentLimit(db, orgId);
  if (!limit.allowed) {
    return c.text("Monthly limit reached", 402);
  }

  let botToken: string | undefined;
  const [installation] = await db
    .select()
    .from(slackInstallations)
    .where(eq(slackInstallations.orgId, orgId));
  if (installation) {
    botToken = await decryptSecret(installation.botToken, c.env.ENCRYPTION_KEY);
  }

  await createIncident(db, c.env.NOTIFICATION_QUEUE, c.env.APP_URL, {
    orgId,
    teamId: body.teamId as string,
    severity: (body.severity as "fire" | "warning" | "info") || "fire",
    title: body.title as string,
    source: "web",
    createdBy: user?.id,
    botToken,
  });

  return c.redirect("/app");
});

// ─── Incidents ───────────────────────────────────────────

pages.get("/incidents", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const org = c.get("org");
  const status = c.req.query("status");

  const conditions = [eq(incidents.orgId, orgId)];
  if (status) conditions.push(eq(incidents.status, status as any));

  const result = await db
    .select({
      id: incidents.id,
      title: incidents.title,
      severity: incidents.severity,
      status: incidents.status,
      createdAt: incidents.createdAt,
      teamId: incidents.teamId,
    })
    .from(incidents)
    .where(and(...conditions))
    .orderBy(desc(incidents.createdAt))
    .limit(100);

  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, orgId));
  const teamMap = new Map(allTeams.map((t) => [t.id, t.name]));

  const enriched = result.map((i) => ({
    ...i,
    teamName: teamMap.get(i.teamId) || "Unknown",
  }));

  return c.html(
    <IncidentsListPage
      user={user}
      orgName={org.name}
      incidents={enriched}
      currentFilter={status || "all"}
    />
  );
});

pages.get("/incidents/new", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const org = c.get("org");
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, orgId));
  return c.html(
    <IncidentNewPage user={user} orgName={org.name} teams={allTeams} />
  );
});

pages.post("/incidents", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const body = await c.req.parseBody();

  // Check quota
  const limit = await checkIncidentLimit(db, orgId);
  if (!limit.allowed) {
    return c.text("Monthly incident limit reached", 402);
  }

  // Get bot token if Slack connected
  let botToken: string | undefined;
  const [installation] = await db
    .select()
    .from(slackInstallations)
    .where(eq(slackInstallations.orgId, orgId));
  if (installation) {
    botToken = await decryptSecret(installation.botToken, c.env.ENCRYPTION_KEY);
  }

  const incident = await createIncident(
    db,
    c.env.NOTIFICATION_QUEUE,
    c.env.APP_URL,
    {
      orgId,
      teamId: body.teamId as string,
      severity:
        (body.severity as "fire" | "warning" | "info") || "info",
      title: body.title as string,
      description: (body.description as string) || undefined,
      source: "web",
      createdBy: user?.id,
      botToken,
    }
  );

  return c.redirect(`/app/incidents/${incident.id}`);
});

pages.get("/incidents/:id", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const org = c.get("org");
  const incidentId = c.req.param("id");

  const [incident] = await db
    .select()
    .from(incidents)
    .where(and(eq(incidents.id, incidentId), eq(incidents.orgId, orgId)));
  if (!incident) return c.notFound();

  const events = await db
    .select()
    .from(incidentEvents)
    .where(eq(incidentEvents.incidentId, incidentId))
    .orderBy(incidentEvents.createdAt);

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, incident.teamId));

  return c.html(
    <IncidentDetailPage
      user={user}
      orgName={org.name}
      incident={incident}
      events={events}
      teamName={team?.name || "Unknown"}
    />
  );
});

pages.post("/incidents/:id/acknowledge", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  await acknowledgeIncident(db, orgId, c.req.param("id"), user?.id);
  return c.redirect(`/app/incidents/${c.req.param("id")}`);
});

pages.post("/incidents/:id/resolve", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  await resolveIncident(db, orgId, c.req.param("id"), user?.id);
  return c.redirect(`/app/incidents/${c.req.param("id")}`);
});

pages.post("/incidents/:id/comment", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const body = await c.req.parseBody();
  await addComment(db, c.req.param("id"), user?.id, body.message as string);
  return c.redirect(`/app/incidents/${c.req.param("id")}`);
});

// ─── Teams ───────────────────────────────────────────────

pages.get("/teams", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const org = c.get("org");
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, orgId));
  return c.html(
    <TeamsPage user={user} orgName={org.name} teams={allTeams} />
  );
});

pages.post("/teams", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const body = await c.req.parseBody();

  const limit = await checkTeamLimit(db, orgId);
  if (!limit.allowed) {
    return c.text("Team limit reached", 402);
  }

  const slug = (body.slug as string || body.name as string)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");

  await db.insert(teams).values({
    orgId,
    name: body.name as string,
    slug,
    slackChannelId: (body.slackChannelId as string) || null,
  });
  return c.redirect("/app/teams");
});

pages.get("/teams/:id", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const org = c.get("org");
  const teamId = c.req.param("id");

  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.orgId, orgId)));
  if (!team) return c.notFound();

  const teamMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.teamId, teamId), eq(members.orgId, orgId)));

  return c.html(
    <TeamDetailPage
      user={user}
      orgName={org.name}
      team={team}
      members={teamMembers}
    />
  );
});

pages.post("/teams/:id/members", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const body = await c.req.parseBody();
  await db.insert(members).values({
    orgId,
    teamId: c.req.param("id"),
    displayName: body.displayName as string,
    userId: (body.userId as string) || null,
    slackUserId: (body.slackUserId as string) || null,
    ntfyTopic: generateNtfyTopic(),
    role: (body.role as "admin" | "member") || "member",
  });
  return c.redirect(`/app/teams/${c.req.param("id")}`);
});

pages.post("/teams/:id/members/:memberId/delete", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  await db
    .delete(members)
    .where(
      and(eq(members.id, c.req.param("memberId")), eq(members.orgId, orgId))
    );
  return c.redirect(`/app/teams/${c.req.param("id")}`);
});

// ─── Schedules ───────────────────────────────────────────

pages.get("/schedules", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const org = c.get("org");

  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, orgId));
  const allMembers = await db
    .select()
    .from(members)
    .where(eq(members.orgId, orgId));
  const allSchedules = await db
    .select({
      schedule: schedules,
      member: members,
    })
    .from(schedules)
    .innerJoin(members, eq(schedules.memberId, members.id))
    .where(eq(schedules.orgId, orgId))
    .orderBy(desc(schedules.startTime));

  return c.html(
    <SchedulesPage
      user={user}
      orgName={org.name}
      teams={allTeams}
      schedules={allSchedules}
      members={allMembers}
    />
  );
});

pages.post("/schedules", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const body = await c.req.parseBody();
  await db.insert(schedules).values({
    orgId,
    teamId: body.teamId as string,
    memberId: body.memberId as string,
    startTime: new Date(body.startTime as string),
    endTime: new Date(body.endTime as string),
  });
  return c.redirect("/app/schedules");
});

pages.post("/schedules/:id/delete", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  await db
    .delete(schedules)
    .where(
      and(eq(schedules.id, c.req.param("id")), eq(schedules.orgId, orgId))
    );
  return c.redirect("/app/schedules");
});

// ─── Settings ────────────────────────────────────────────

pages.get("/settings", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const org = c.get("org");

  const [installation] = await db
    .select()
    .from(slackInstallations)
    .where(eq(slackInstallations.orgId, orgId));

  const slackParam = c.req.query("slack");
  const errorParam = c.req.query("error");

  return c.html(
    <SettingsPage
      user={user}
      orgName={org.name}
      org={org}
      slackConnected={!!installation}
      slackTeamName={installation?.slackTeamName || undefined}
      message={slackParam === "connected" ? "Slack workspace connected!" : undefined}
      error={errorParam || undefined}
    />
  );
});

// ─── Webhooks ────────────────────────────────────────────

pages.get("/webhooks", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user");
  const orgId = c.get("orgId");
  const org = c.get("org");

  const sources = await db
    .select()
    .from(webhookSources)
    .where(eq(webhookSources.orgId, orgId));
  const allTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.orgId, orgId));

  return c.html(
    <WebhooksPage
      user={user}
      orgName={org.name}
      appUrl={c.env.APP_URL}
      sources={sources}
      teams={allTeams}
    />
  );
});

pages.post("/webhooks", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  const body = await c.req.parseBody();

  // Generate a shared secret for HMAC verification
  const secret = crypto.randomUUID() + crypto.randomUUID();

  await db.insert(webhookSources).values({
    orgId,
    teamId: body.teamId as string,
    name: body.name as string,
    sourceType: body.sourceType as any,
    secret,
    severityDefault: (body.severityDefault as any) || "warning",
  });

  return c.redirect("/app/webhooks");
});

pages.post("/webhooks/:id/delete", async (c) => {
  const db = getDb(c.env.DB);
  const orgId = c.get("orgId");
  await db
    .delete(webhookSources)
    .where(
      and(
        eq(webhookSources.id, c.req.param("id")),
        eq(webhookSources.orgId, orgId)
      )
    );
  return c.redirect("/app/webhooks");
});

export { pages };
