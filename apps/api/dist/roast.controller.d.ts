import { RoastService } from './roast.service';
export declare class RoastController {
    private readonly roastService;
    constructor(roastService: RoastService);
    roast(body: {
        username?: string;
        accessToken?: string;
    }): Promise<{
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
}
