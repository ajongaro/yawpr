// ─── Progressive Enhancement ────────────────────────────

// Auto-refresh: reload the page every 30 seconds on dashboard
(function () {
  const dashboard = document.querySelector(".dashboard");
  if (!dashboard) return;

  setInterval(() => {
    window.location.reload();
  }, 30000);
})();

// Format ISO timestamps to local time
document.querySelectorAll("time[datetime]").forEach((el) => {
  try {
    const d = new Date(el.getAttribute("datetime"));
    el.textContent = d.toLocaleString();
  } catch (e) {}
});

// Async form submissions for alert actions (ack/resolve)
document.querySelectorAll(".alert-actions form").forEach((form) => {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button");
    btn.disabled = true;
    btn.textContent = "Working...";

    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "text/html" },
      });
      if (res.redirected) {
        window.location.href = res.url;
      } else {
        window.location.reload();
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Error — try again";
    }
  });
});
