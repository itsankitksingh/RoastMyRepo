import { BadGatewayException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';

type HeadersShape = Record<string, string>;

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  company: string | null;
  blog: string | null;
  location: string | null;
  hireable: boolean | null;
  twitter_username: string | null;
}

interface GitHubRepo {
  name: string;
  full_name: string;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  description: string | null;
  pushed_at: string;
  created_at: string;
  topics: string[];
  homepage: string | null;
}

interface GitHubEvent {
  type: string;
  created_at: string;
  payload: {
    commits?: { message: string }[];
  };
}

interface RoastInput {
  username: string;
  accessToken?: string;
}

@Injectable()
export class RoastService {
  private groqClient: Groq | null = null;

  async roast({ username, accessToken }: RoastInput) {
    if (!username) {
      throw new HttpException({ error: 'Username required' }, HttpStatus.BAD_REQUEST);
    }

    const token = accessToken || process.env.GITHUB_TOKEN;
    const isOAuth = Boolean(accessToken);

    const headers: HeadersShape = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'GitRoast/3.0',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const userEndpoint = isOAuth
      ? 'https://api.github.com/user'
      : `https://api.github.com/users/${username}`;
    const reposEndpoint = isOAuth
      ? 'https://api.github.com/user/repos?sort=pushed&per_page=100&visibility=all&affiliation=owner'
      : `https://api.github.com/users/${username}/repos?sort=pushed&per_page=100`;
    const eventsEndpoint = isOAuth
      ? `https://api.github.com/users/${username}/events?per_page=50`
      : `https://api.github.com/users/${username}/events/public?per_page=50`;

    const [userRes, reposRes, eventsRes] = await Promise.all([
      fetch(userEndpoint, { headers }),
      fetch(reposEndpoint, { headers }),
      fetch(eventsEndpoint, { headers }),
    ]);

    if (!userRes.ok) {
      if (userRes.status === 404) {
        throw new HttpException(
          { error: 'GitHub user not found. Double-check the username.' },
          HttpStatus.NOT_FOUND,
        );
      }
      if (userRes.status === 403 && userRes.headers.get('x-ratelimit-remaining') === '0') {
        throw new HttpException(
          {
            error:
              'GitHub API rate limit hit. Try again in ~60 minutes, or configure GITHUB_TOKEN.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new BadGatewayException({ error: `GitHub API error (${userRes.status}).` });
    }

    const user = (await userRes.json()) as GitHubUser;
    const repos = reposRes.ok ? ((await reposRes.json()) as GitHubRepo[]) : [];
    const events = eventsRes.ok ? ((await eventsRes.json()) as GitHubEvent[]) : [];

    const profileReadme = await this.getReadme(`${username}/${username}`, headers);

    const ownRepos = repos.filter((repo) => !repo.fork);
    const forkRepos = repos.filter((repo) => repo.fork);
    const totalStars = ownRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

    const languageCount: Record<string, number> = {};
    for (const repo of ownRepos) {
      if (repo.language) {
        languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
      }
    }

    const topLanguages = Object.entries(languageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([lang, count]) => `${lang} (${count} repos)`);

    const suspiciousPatterns = [
      /tutorial/i,
      /practice/i,
      /\blearn/i,
      /todo/i,
      /\btest\b/i,
      /demo/i,
      /example/i,
      /sample/i,
      /hello.world/i,
      /first.*/i,
      /course/i,
      /bootcamp/i,
      /assignment/i,
      /homework/i,
      /-clone$/i,
      /my-portfolio/i,
      /portfolio$/i,
      /playground/i,
      /experiment/i,
    ];

    const suspiciousRepos = ownRepos
      .filter((repo) =>
        suspiciousPatterns.some((pattern) => pattern.test(repo.name) || pattern.test(repo.description || '')),
      )
      .map((repo) => repo.name);

    const zeroStarRepos = ownRepos.filter((repo) => repo.stargazers_count === 0).length;
    const mostStarredRepos = [...ownRepos]
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const staleRepos = ownRepos.filter((repo) => new Date(repo.pushed_at) < oneYearAgo);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentActivity = ownRepos.filter((repo) => new Date(repo.pushed_at) > threeMonthsAgo);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentlyPushed30 = ownRepos.filter((repo) => new Date(repo.pushed_at) > thirtyDaysAgo);
    const recentlyCreated90 = ownRepos.filter((repo) => new Date(repo.created_at) > threeMonthsAgo);

    const pushEventCount = events.filter((event) => event.type === 'PushEvent').length;

    const uniqueLanguages = new Set(ownRepos.map((repo) => repo.language).filter(Boolean));
    const languageDiversityCount = uniqueLanguages.size;

    const accountAgeYears = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24 * 365),
    );

    const lastEvent = events[0];
    const daysSinceActive = lastEvent
      ? Math.floor((Date.now() - new Date(lastEvent.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    const commitMessages: string[] = [];
    for (const event of events) {
      if (event.type === 'PushEvent' && event.payload.commits) {
        for (const commit of event.payload.commits) {
          if (commitMessages.length < 15) {
            commitMessages.push(commit.message.split('\n')[0]);
          }
        }
      }
    }

    const topByStars = [...ownRepos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3);
    const recentPushed = [...ownRepos]
      .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime())
      .slice(0, 3);
    const deployedProjects = ownRepos.filter((repo) => repo.homepage && repo.homepage.length > 0).slice(0, 2);

    const uniqueRepos = Array.from(
      new Map([...topByStars, ...recentPushed, ...deployedProjects].map((repo) => [repo.name, repo])).values(),
    ).slice(0, 7);

    const repoDetails = await Promise.all(
      uniqueRepos.map(async (repo) => {
        const [readme, commits, languages] = await Promise.all([
          this.getReadme(repo.full_name, headers),
          this.getRecentCommits(repo.full_name, headers),
          this.getLanguages(repo.full_name, headers),
        ]);

        const daysSincePush = Math.floor(
          (Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          name: repo.name,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          homepage: repo.homepage,
          topics: repo.topics?.slice(0, 3) || [],
          daysSincePush,
          readme: readme ? readme.slice(0, 300) : null,
          commits: commits.slice(0, 4),
          languages: Object.keys(languages).slice(0, 3),
        };
      }),
    );

    const allRepoSummary = ownRepos.slice(0, 25).map(
      (repo) =>
        `${repo.name} (${repo.stargazers_count}⭐, ${repo.language || '?'}, ${Math.floor((Date.now() - new Date(repo.pushed_at).getTime()) / (1000 * 60 * 60 * 24))}d ago)`,
    );

    let baseScore = 5.0;
    const tutorialRatio = ownRepos.length > 0 ? suspiciousRepos.length / ownRepos.length : 0;
    baseScore += tutorialRatio * 2.5;

    const zeroStarRatio = ownRepos.length > 0 ? zeroStarRepos / ownRepos.length : 0;
    baseScore += zeroStarRatio * 1.0;

    const staleRatio = ownRepos.length > 0 ? staleRepos.length / ownRepos.length : 0;
    baseScore += staleRatio * 1.5;

    if (daysSinceActive > 14) baseScore += 0.3;
    if (daysSinceActive > 30) baseScore += 0.5;
    if (daysSinceActive > 90) baseScore += 0.8;
    if (daysSinceActive > 180) baseScore += 0.8;
    if (daysSinceActive > 365) baseScore += 1.0;

    const expectedStarsForAge = accountAgeYears * 15;
    if (totalStars < expectedStarsForAge && expectedStarsForAge > 0) {
      baseScore += Math.min(0.8, (expectedStarsForAge - totalStars) / expectedStarsForAge);
    }

    const forkRatio = repos.length > 0 ? forkRepos.length / repos.length : 0;
    if (forkRatio > 0.4) baseScore += 0.5;
    if (forkRatio > 0.6) baseScore += 0.5;

    if (ownRepos.length > 5 && languageDiversityCount <= 1) baseScore += 0.5;

    const starBonus = Math.min(2.0, totalStars / 250);
    baseScore -= starBonus;

    const deployedCount = ownRepos.filter((repo) => repo.homepage && repo.homepage.length > 5).length;
    baseScore -= Math.min(1.5, deployedCount * 0.3);

    if (user.followers > 100) baseScore -= 0.3;
    if (user.followers > 500) baseScore -= 0.4;
    if (user.followers > 2000) baseScore -= 0.6;

    const recent30Bonus = Math.min(1.5, recentlyPushed30.length * 0.3);
    baseScore -= recent30Bonus;

    const newProjectBonus = Math.min(0.8, recentlyCreated90.length * 0.2);
    baseScore -= newProjectBonus;

    if (pushEventCount > 10) baseScore -= 0.3;
    if (pushEventCount > 25) baseScore -= 0.4;
    if (pushEventCount > 50) baseScore -= 0.5;

    const highSignalLangs = ['Rust', 'Go', 'Haskell', 'Erlang', 'C', 'C++', 'Zig', 'CUDA', 'Assembly', 'Solidity'];
    const hasHighSignal = topLanguages.some((lang) =>
      highSignalLangs.some((highSignal) => lang.startsWith(highSignal)),
    );
    if (hasHighSignal) baseScore -= 0.5;

    if (languageDiversityCount >= 3) baseScore -= 0.2;
    if (languageDiversityCount >= 5) baseScore -= 0.3;

    if (user.blog && user.blog.length > 5) baseScore -= 0.2;

    baseScore = Math.max(1.5, Math.min(9.8, baseScore));
    const baseScoreRounded = Math.round(baseScore * 10) / 10;

    const isNotable = user.followers > 2000 || totalStars > 5000;
    const isVeryNotable = user.followers > 10000 || totalStars > 20000;
    const notableBoost = isVeryNotable ? 1.5 : isNotable ? 0.7 : 0;

    const techBase = Math.max(
      1.5,
      Math.min(
        9.5,
        Math.round(
          (5.0 -
            starBonus * 0.7 +
            tutorialRatio * 1.5 +
            zeroStarRatio * 0.8 -
            (hasHighSignal ? 1.0 : 0) -
            (languageDiversityCount >= 4 ? 0.4 : 0) -
            recent30Bonus * 0.5 -
            notableBoost) *
            10,
        ) / 10,
      ),
    );

    const aiBase = Math.max(
      1.5,
      Math.min(
        9.5,
        Math.round(
          (5.5 +
            staleRatio * 1.5 +
            (daysSinceActive > 180 ? 1.2 : daysSinceActive > 90 ? 0.6 : 0) -
            (pushEventCount > 20 ? 0.8 : pushEventCount > 10 ? 0.4 : 0) -
            recent30Bonus * 0.6 -
            starBonus * 0.3 -
            notableBoost * 0.5) *
            10,
        ) / 10,
      ),
    );

    const moatBase = Math.max(
      1.5,
      Math.min(
        9.5,
        Math.round(
          (5.0 +
            tutorialRatio * 2.0 -
            starBonus * 0.5 -
            (deployedCount > 1 ? 0.6 : 0) -
            (user.followers > 100 ? 0.3 : 0) -
            notableBoost * 1.2) *
            10,
        ) / 10,
      ),
    );

    const mktBase = Math.max(
      1.5,
      Math.min(
        9.5,
        Math.round(
          (5.0 -
            (user.followers > 100 ? 0.3 : 0) -
            (user.followers > 500 ? 0.4 : 0) -
            (user.blog ? 0.2 : 0) +
            zeroStarRatio * 1.0 +
            (accountAgeYears > 3 && totalStars < 30 ? 0.8 : 0) -
            starBonus * 0.4 -
            notableBoost * 1.0) *
            10,
        ) / 10,
      ),
    );

    const prompt = `You are a brutally honest senior software engineer and tech career advisor. Give this developer a REAL assessment of AI replaceability based on facts.

Base scores from algorithm:
Overall: ${baseScoreRounded}/10
Technical Skills: ${techBase}/10
AI Adaptability: ${aiBase}/10
Career Moat: ${moatBase}/10
Market Positioning: ${mktBase}/10

Account:
${JSON.stringify(
      {
        login: user.login,
        name: user.name,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        accountAgeYears,
        daysSinceActive,
        topLanguages,
        totalStars,
        suspiciousRepos,
      },
      null,
      2,
    )}

Profile README:
${profileReadme ? profileReadme.slice(0, 1200) : '(No profile README)'}

Most starred repos:
${mostStarredRepos.map((repo) => `${repo.name} (${repo.stargazers_count}⭐)`).join('\n')}

Repo summaries:
${allRepoSummary.join('\n')}

Recent commit messages:
${commitMessages.slice(0, 15).map((msg) => `- ${msg}`).join('\n')}

Deep repos:
${repoDetails
      .map(
        (repo, idx) =>
          `[${idx + 1}] ${repo.name} | ${repo.stars}⭐ | ${repo.language || '?'}\nDesc: ${repo.description || '(none)'}\nHomepage: ${repo.homepage || '(none)'}\nREADME: ${repo.readme || '(none)'}\nCommits: ${repo.commits.join(' | ') || '(none)'}`,
      )
      .join('\n---\n')}

Return only valid JSON:
{
  "threatTitle": "ALL CAPS, 3-5 words",
  "mainRoast": "3-5 sentences, specific and grounded in the data",
  "subDescriptions": {
    "technicalSkills": "One line",
    "aiAdaptability": "One line",
    "careerMoat": "One line",
    "marketPositioning": "One line"
  }
}`;

    const content = await this.generateAiContent(prompt);

    const topRepo = repoDetails[0];
    const fallbackDescriptions = {
      technicalSkills: `${topLanguages[0]?.split(' ')[0] || 'Unknown'} as primary stack with ${zeroStarRepos} zero-star repos out of ${ownRepos.length}.`,
      aiAdaptability: `${daysSinceActive > 90 ? `${daysSinceActive} days inactive` : 'Recent activity'} - AI-first thinking not visible in project choices.`,
      careerMoat: `${ownRepos.length} repos, ${deployedCount} deployed, ${totalStars} total stars - the moat is thin.`,
      marketPositioning: `${user.followers} followers after ${accountAgeYears} years - ${user.followers < 50 ? 'flying completely under the radar' : 'some traction but not breakout'}.`,
    };

    const fallbackTitle = isVeryNotable
      ? 'ECOSYSTEM SINGLE POINT OF FAILURE'
      : isNotable
        ? 'INDUSTRY FIGURE, UNCERTAIN FUTURE'
        : tutorialRatio > 0.3
          ? 'TUTORIAL GRAVEYARD CURATOR'
          : staleRatio > 0.5
            ? 'REPO ABANDONMENT ARTIST'
            : totalStars < 10
              ? 'INVISIBLE TO THE INTERNET'
              : 'PROFESSIONAL SIDE PROJECT HOARDER';

    const fallbackRoast = `${user.name || user.login} has been on GitHub for ${accountAgeYears} years and has ${totalStars} total stars across ${ownRepos.length} repos. ${topRepo ? `Their standout project \"${topRepo.name}\" ${topRepo.stars > 0 ? `has ${topRepo.stars} stars.` : 'has zero stars.'}` : ''} ${staleRepos.length > 5 ? `${staleRepos.length} repos have not been touched in over a year.` : ''} ${suspiciousRepos.length > 3 ? `The tutorial graveyard (${suspiciousRepos.slice(0, 3).join(', ')}) speaks volumes.` : ''}`;

    let aiText: { threatTitle?: string; mainRoast?: string; subDescriptions?: Record<string, string> } = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in model response');
      }
      aiText = JSON.parse(jsonMatch[0]) as {
        threatTitle?: string;
        mainRoast?: string;
        subDescriptions?: Record<string, string>;
      };
    } catch {
      aiText = {};
    }

    return {
      username: user.login,
      name: user.name || user.login,
      bio: user.bio,
      company: user.company,
      location: user.location,
      blog: user.blog,
      followers: user.followers,
      publicRepos: user.public_repos,
      totalStars,
      avatarUrl: user.avatar_url,
      isEnhanced: isOAuth,
      overallScore: baseScoreRounded,
      threatTitle: aiText.threatTitle || fallbackTitle,
      mainRoast: aiText.mainRoast || fallbackRoast,
      subScores: {
        technicalSkills: {
          score: Math.round(techBase * 10) / 10,
          description: aiText.subDescriptions?.technicalSkills || fallbackDescriptions.technicalSkills,
        },
        aiAdaptability: {
          score: Math.round(aiBase * 10) / 10,
          description: aiText.subDescriptions?.aiAdaptability || fallbackDescriptions.aiAdaptability,
        },
        careerMoat: {
          score: Math.round(moatBase * 10) / 10,
          description: aiText.subDescriptions?.careerMoat || fallbackDescriptions.careerMoat,
        },
        marketPositioning: {
          score: Math.round(mktBase * 10) / 10,
          description: aiText.subDescriptions?.marketPositioning || fallbackDescriptions.marketPositioning,
        },
      },
      extra: {
        recentActivityCount: recentActivity.length,
      },
    };
  }

  private getGroqClient(): Groq | null {
    if (this.groqClient) {
      return this.groqClient;
    }
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
      return null;
    }
    this.groqClient = new Groq({ apiKey });
    return this.groqClient;
  }

  private async generateAiContent(prompt: string): Promise<string> {
    const groq = this.getGroqClient();
    if (!groq) {
      return '';
    }
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
        max_tokens: 800,
      });
      return completion.choices[0]?.message?.content || '';
    } catch {
      return '';
    }
  }

  private async getReadme(fullName: string, headers: HeadersShape): Promise<string | null> {
    try {
      const res = await fetch(`https://api.github.com/repos/${fullName}/readme`, { headers });
      if (!res.ok) {
        return null;
      }
      const data = (await res.json()) as { content?: string };
      if (!data.content) {
        return null;
      }
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return content
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/`{3}[\s\S]*?`{3}/g, '[code block]')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } catch {
      return null;
    }
  }

  private async getRecentCommits(fullName: string, headers: HeadersShape): Promise<string[]> {
    try {
      const res = await fetch(`https://api.github.com/repos/${fullName}/commits?per_page=8`, { headers });
      if (!res.ok) {
        return [];
      }
      const commits = (await res.json()) as Array<{ commit?: { message?: string } }>;
      return commits
        .map((commit) => commit.commit?.message?.split('\n')[0])
        .filter((message): message is string => Boolean(message))
        .slice(0, 8);
    } catch {
      return [];
    }
  }

  private async getLanguages(fullName: string, headers: HeadersShape): Promise<Record<string, number>> {
    try {
      const res = await fetch(`https://api.github.com/repos/${fullName}/languages`, { headers });
      if (!res.ok) {
        return {};
      }
      return (await res.json()) as Record<string, number>;
    } catch {
      return {};
    }
  }
}
