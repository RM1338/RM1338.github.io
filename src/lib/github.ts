/** One year of public GitHub contributions, fetched at build time. Null when no token is set, so the section hides. */
export type Day = { date: string; count: number };

export async function contributions(login = 'RM1338'): Promise<{ total: number; weeks: Day[][] } | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  const query = `query { user(login: "${login}") { contributionsCollection { contributionCalendar {
    totalContributions weeks { contributionDays { date contributionCount } } } } } }`;
  try {
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });
    const cal = (await res.json()).data?.user?.contributionsCollection?.contributionCalendar;
    if (!cal) return null;
    return {
      total: cal.totalContributions,
      weeks: cal.weeks.map((w: { contributionDays: { date: string; contributionCount: number }[] }) =>
        w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })),
      ),
    };
  } catch {
    return null;
  }
}
