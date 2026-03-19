import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface SubScore {
  score: number;
  description: string;
}

interface RoastResponse {
  username: string;
  name: string;
  bio: string | null;
  followers: number;
  publicRepos: number;
  totalStars: number;
  avatarUrl: string;
  overallScore: number;
  threatTitle: string;
  mainRoast: string;
  subScores: {
    technicalSkills: SubScore;
    aiAdaptability: SubScore;
    careerMoat: SubScore;
    marketPositioning: SubScore;
  };
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly http = inject(HttpClient);

  protected username = '';
  protected loading = false;
  protected error = '';
  protected roast: RoastResponse | null = null;
  protected readonly apiUrl = '/api/roast';

  protected submit() {
    const clean = this.username
      .replace(/^https?:\/\//i, '')
      .replace(/^github\.com\//i, '')
      .replace(/^@/, '')
      .replace(/\/$/, '')
      .trim();

    if (!clean || this.loading) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.roast = null;

    this.http.post<RoastResponse>(this.apiUrl, { username: clean }).subscribe({
      next: (data) => {
        this.roast = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Failed to roast this profile.';
        this.loading = false;
      },
    });
  }
}
