interface RoastInput {
    username: string;
    accessToken?: string;
}
export declare class RoastService {
    private groqClient;
    roast({ username, accessToken }: RoastInput): Promise<{
        username: string;
        name: string;
        bio: string | null;
        company: string | null;
        location: string | null;
        blog: string | null;
        followers: number;
        publicRepos: number;
        totalStars: number;
        avatarUrl: string;
        isEnhanced: boolean;
        overallScore: number;
        threatTitle: string;
        mainRoast: string;
        subScores: {
            technicalSkills: {
                score: number;
                description: string;
            };
            aiAdaptability: {
                score: number;
                description: string;
            };
            careerMoat: {
                score: number;
                description: string;
            };
            marketPositioning: {
                score: number;
                description: string;
            };
        };
        extra: {
            recentActivityCount: number;
        };
    }>;
    private getGroqClient;
    private generateAiContent;
    private getReadme;
    private getRecentCommits;
    private getLanguages;
}
export {};
