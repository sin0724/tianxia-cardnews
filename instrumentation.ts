export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { default: cron } = await import("node-cron");
  const { getDueSchedules, markRan } = await import("./lib/scheduler");

  // 매 분마다 스케줄 확인
  cron.schedule("* * * * *", async () => {
    const nowUTC = new Date();
    const nowKST = new Date(nowUTC.getTime() + 9 * 60 * 60 * 1000);

    const due = getDueSchedules(nowKST);
    if (due.length === 0) return;

    const appUrl =
      process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : `http://localhost:${process.env.PORT ?? 3000}`;

    const apiKey = process.env.ANTHROPIC_API_KEY ?? "";

    for (const schedule of due) {
      console.log(`[자동화] 스케줄 실행: ${schedule.label} (${schedule.time} KST)`);
      markRan(schedule.id);

      try {
        const res = await fetch(`${appUrl}/api/auto-run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-api-key": apiKey,
          },
        });
        const data = await res.json();
        console.log(`[자동화] 완료: ${data.topic ?? "?"} — ${data.postUrl ?? "포스팅 URL 없음"}`);
      } catch (e) {
        console.error(`[자동화] 실패:`, e);
      }
    }
  });

  console.log("[자동화] 스케줄 체커 시작됨 (매 분 확인)");
}
