import { Hono } from "hono";
import { eq, desc, and, ne } from "drizzle-orm";
import type { Env } from "../lib/types";
import { getDb } from "../db/client";
import {
  alerts,
  alertEvents,
  teams,
  teamMembers,
  onCallSchedules,
} from "../db/schema";
import { authGuard } from "../middleware/auth";
import {
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  addComment,
} from "../services/alert";
import { getOnCall } from "../services/oncall";

// Page components
import { LoginPage } from "../views/pages/login";
import { HomePage } from "../views/pages/home";
import { AlertsListPage } from "../views/pages/alerts-list";
import { AlertDetailPage } from "../views/pages/alert-detail";
import { AlertNewPage } from "../views/pages/alert-new";
import { TeamsPage } from "../views/pages/teams";
import { TeamDetailPage } from "../views/pages/team-detail";
import { SchedulesPage } from "../views/pages/schedules";

const dashboard = new Hono<Env>();

// ─── Public ──────────────────────────────────────────────

dashboard.get("/login", (c) => {
  return c.html(<LoginPage />);
});

// ─── Protected routes ────────────────────────────────────
dashboard.use("/*", authGuard);

// Home / Dashboard
dashboard.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;

  const activeAlerts = await db
    .select({
      id: alerts.id,
      title: alerts.title,
      severity: alerts.severity,
      status: alerts.status,
      createdAt: alerts.createdAt,
      teamId: alerts.teamId,
    })
    .from(alerts)
    .where(ne(alerts.status, "resolved"))
    .orderBy(desc(alerts.createdAt))
    .limit(20);

  // Enrich with team names
  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t.name]));

  const enrichedAlerts = activeAlerts.map((a) => ({
    ...a,
    teamName: teamMap.get(a.teamId) || "Unknown",
  }));

  // On-call summary
  const onCallSummary = [];
  for (const team of allTeams) {
    const onCall = await getOnCall(db, team.id);
    if (onCall) {
      onCallSummary.push({
        teamName: team.name,
        memberName: onCall.member.userId,
      });
    }
  }

  return c.html(
    <HomePage
      user={user}
      activeAlerts={enrichedAlerts}
      onCallSummary={onCallSummary}
    />
  );
});

// Alerts list
dashboard.get("/alerts", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  const status = c.req.query("status");

  let query = db
    .select({
      id: alerts.id,
      title: alerts.title,
      severity: alerts.severity,
      status: alerts.status,
      createdAt: alerts.createdAt,
      teamId: alerts.teamId,
    })
    .from(alerts)
    .orderBy(desc(alerts.createdAt))
    .limit(100);

  if (status) {
    query = query.where(eq(alerts.status, status as any)) as any;
  }

  const result = await query;
  const allTeams = await db.select().from(teams);
  const teamMap = new Map(allTeams.map((t) => [t.id, t.name]));

  const enriched = result.map((a) => ({
    ...a,
    teamName: teamMap.get(a.teamId) || "Unknown",
  }));

  return c.html(
    <AlertsListPage
      user={user}
      alerts={enriched}
      currentFilter={status || "all"}
    />
  );
});

// New alert form
dashboard.get("/alerts/new", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  const allTeams = await db.select().from(teams);
  return c.html(<AlertNewPage user={user} teams={allTeams} />);
});

// Create alert (form POST)
dashboard.post("/alerts", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  const body = await c.req.parseBody();

  const alert = await createAlert(db, c.env.NOTIFICATION_QUEUE, c.env.APP_URL, {
    teamId: body.teamId as string,
    severity: (body.severity as "fire" | "info") || "info",
    title: body.title as string,
    description: (body.description as string) || undefined,
    source: "web",
    createdBy: user?.id,
  });

  return c.redirect(`/alerts/${alert.id}`);
});

// Alert detail
dashboard.get("/alerts/:id", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  const alertId = c.req.param("id");

  const [alert] = await db
    .select()
    .from(alerts)
    .where(eq(alerts.id, alertId));
  if (!alert) return c.notFound();

  const events = await db
    .select()
    .from(alertEvents)
    .where(eq(alertEvents.alertId, alertId))
    .orderBy(alertEvents.createdAt);

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, alert.teamId));

  return c.html(
    <AlertDetailPage
      user={user}
      alert={alert}
      events={events}
      teamName={team?.name || "Unknown"}
    />
  );
});

// Acknowledge alert (form POST)
dashboard.post("/alerts/:id/acknowledge", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  await acknowledgeAlert(db, c.req.param("id"), user?.id);
  return c.redirect(`/alerts/${c.req.param("id")}`);
});

// Resolve alert (form POST)
dashboard.post("/alerts/:id/resolve", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  await resolveAlert(db, c.req.param("id"), user?.id);
  return c.redirect(`/alerts/${c.req.param("id")}`);
});

// Add comment (form POST)
dashboard.post("/alerts/:id/comment", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  const body = await c.req.parseBody();
  await addComment(db, c.req.param("id"), user?.id, body.message as string);
  return c.redirect(`/alerts/${c.req.param("id")}`);
});

// ─── Teams ───────────────────────────────────────────────

dashboard.get("/teams", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  const allTeams = await db.select().from(teams);
  return c.html(<TeamsPage user={user} teams={allTeams} />);
});

dashboard.post("/teams", async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.parseBody();
  await db.insert(teams).values({
    name: body.name as string,
    slackChannelId: (body.slackChannelId as string) || null,
    ntfyTopic: (body.ntfyTopic as string) || null,
  });
  return c.redirect("/teams");
});

dashboard.get("/teams/:id", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;
  const teamId = c.req.param("id");

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  if (!team) return c.notFound();

  const members = await db
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.teamId, teamId));

  return c.html(<TeamDetailPage user={user} team={team} members={members} />);
});

dashboard.post("/teams/:id/members", async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.parseBody();
  await db.insert(teamMembers).values({
    teamId: c.req.param("id"),
    userId: body.userId as string,
    slackUserId: (body.slackUserId as string) || null,
    ntfyTopic: (body.ntfyTopic as string) || null,
    role: (body.role as "admin" | "member") || "member",
  });
  return c.redirect(`/teams/${c.req.param("id")}`);
});

dashboard.post("/teams/:id/members/:memberId/delete", async (c) => {
  const db = getDb(c.env.DB);
  await db
    .delete(teamMembers)
    .where(eq(teamMembers.id, c.req.param("memberId")));
  return c.redirect(`/teams/${c.req.param("id")}`);
});

// ─── Schedules ───────────────────────────────────────────

dashboard.get("/schedules", async (c) => {
  const db = getDb(c.env.DB);
  const user = c.get("user" as never) as any;

  const allTeams = await db.select().from(teams);
  const allMembers = await db.select().from(teamMembers);
  const allSchedules = await db
    .select({
      schedule: onCallSchedules,
      member: teamMembers,
    })
    .from(onCallSchedules)
    .innerJoin(teamMembers, eq(onCallSchedules.memberId, teamMembers.id))
    .orderBy(desc(onCallSchedules.startTime));

  return c.html(
    <SchedulesPage
      user={user}
      teams={allTeams}
      schedules={allSchedules}
      members={allMembers}
    />
  );
});

dashboard.post("/schedules", async (c) => {
  const db = getDb(c.env.DB);
  const body = await c.req.parseBody();
  await db.insert(onCallSchedules).values({
    teamId: body.teamId as string,
    memberId: body.memberId as string,
    startTime: new Date(body.startTime as string),
    endTime: new Date(body.endTime as string),
  });
  return c.redirect("/schedules");
});

dashboard.post("/schedules/:id/delete", async (c) => {
  const db = getDb(c.env.DB);
  await db
    .delete(onCallSchedules)
    .where(eq(onCallSchedules.id, c.req.param("id")));
  return c.redirect("/schedules");
});

export { dashboard };
