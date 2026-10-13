import { Injectable } from '@nitrostack/core';
import { Shoe, QuizAnswers } from '../schemas/shoe.schema.js';

@Injectable()
export class ShoeService {
  private shoes: Shoe[] = [];

  constructor() {
    this.initializeShoes();
  }

  private initializeShoes(): void {
    this.shoes = [
      { itemNo: 'SHOE-001', brand: 'Nike', model: 'Air Force 1 \'07', category: 'Casual', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 29.3, width_cm: 11.4, aspect_ratio: 2.57, tags: ['classic', 'versatile', 'iconic'], price_tier: 'mid' },
      { itemNo: 'SHOE-002', brand: 'Nike', model: 'Air Max 90', category: 'Casual', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 29.3, width_cm: 11.4, aspect_ratio: 2.57, tags: ['comfort', 'retro', 'bold'], price_tier: 'mid' },
      { itemNo: 'SHOE-003', brand: 'Nike', model: 'Dunk Low Retro', category: 'Casual', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 29.3, width_cm: 11.4, aspect_ratio: 2.57, tags: ['basketball', 'heritage', 'clean'], price_tier: 'mid' },
      { itemNo: 'SHOE-004', brand: 'Nike', model: 'Pegasus 40', category: 'Sports', gender: 'Men', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28.5, width_cm: 10.9, aspect_ratio: 2.61, tags: ['running', 'responsive', 'lightweight'], price_tier: 'mid' },
      { itemNo: 'SHOE-005', brand: 'Nike', model: 'Blazer Mid \'77 Vintage', category: 'Casual', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28, width_cm: 10.5, aspect_ratio: 2.67, tags: ['vintage', 'basketball', 'sleek'], price_tier: 'mid' },
      { itemNo: 'SHOE-021', brand: 'Adidas', model: 'Samba OG', category: 'Casual', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28, width_cm: 10.5, aspect_ratio: 2.67, tags: ['iconic', 'soccer', 'timeless'], price_tier: 'mid' },
      { itemNo: 'SHOE-022', brand: 'Adidas', model: 'Gazelle', category: 'Casual', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28, width_cm: 10.5, aspect_ratio: 2.67, tags: ['retro', 'elegant', 'versatile'], price_tier: 'mid' },
      { itemNo: 'SHOE-026', brand: 'Adidas', model: 'Stan Smith', category: 'Professional', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28, width_cm: 10.5, aspect_ratio: 2.67, tags: ['tennis', 'iconic', 'clean'], price_tier: 'mid' },
      { itemNo: 'SHOE-041', brand: 'Puma', model: 'Suede Classic XXI', category: 'Casual', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28, width_cm: 10.5, aspect_ratio: 2.67, tags: ['suede', 'classic', 'soft'], price_tier: 'budget' },
      { itemNo: 'SHOE-061', brand: 'New Balance', model: '550', category: 'Casual', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28.5, width_cm: 10.9, aspect_ratio: 2.61, tags: ['retro', 'basketball', 'chunky'], price_tier: 'mid' },
      { itemNo: 'SHOE-081', brand: 'Jordan', model: 'Air Jordan 1 Retro High OG', category: 'Casual', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 29.3, width_cm: 11.4, aspect_ratio: 2.57, tags: ['basketball', 'iconic', 'premium'], price_tier: 'premium' },
      { itemNo: 'SHOE-101', brand: 'Reebok', model: 'Club C 85', category: 'Professional', gender: 'Unisex', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28, width_cm: 10.5, aspect_ratio: 2.67, tags: ['tennis', 'vintage', 'clean'], price_tier: 'budget' },
      { itemNo: 'SHOE-161', brand: 'Skechers', model: 'Go Walk 6 - Big Splash', category: 'Casual', gender: 'Women', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28.5, width_cm: 10.9, aspect_ratio: 2.61, tags: ['comfort', 'walking', 'casual'], price_tier: 'budget' },
      { itemNo: 'SHOE-181', brand: 'Nike', model: 'Air Max 270 Women\'s', category: 'Casual', gender: 'Women', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28.5, width_cm: 10.9, aspect_ratio: 2.61, tags: ['comfort', 'bold', 'feminine'], price_tier: 'mid' },
      { itemNo: 'SHOE-191', brand: 'Adidas', model: 'Samba Rose Women\'s', category: 'Casual', gender: 'Women', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 29.3, width_cm: 11.4, aspect_ratio: 2.57, tags: ['soccer', 'platform', 'feminine'], price_tier: 'mid' },
      { itemNo: 'SHOE-221', brand: 'Jordan', model: 'Air Jordan 1 Low SE Women\'s', category: 'Casual', gender: 'Women', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop', size: 'US 10', length_cm: 28, width_cm: 10.5, aspect_ratio: 2.67, tags: ['basketball', 'iconic', 'feminine'], price_tier: 'premium' },
    ];
  }

  getAllShoes(): Shoe[] {
    return this.shoes;
  }

  searchShoes(filters: Partial<QuizAnswers>): Shoe[] {
    return this.shoes.filter((shoe) => {
      if (filters.gender && shoe.gender !== filters.gender && shoe.gender !== 'Unisex') {
        return false;
      }
      if (filters.use && shoe.category !== filters.use) {
        return false;
      }
      if (filters.budget && shoe.price_tier !== filters.budget) {
        return false;
      }
      return true;
    });
  }

  getShoeById(itemNo: string): Shoe | undefined {
    return this.shoes.find((s) => s.itemNo === itemNo);
  }

  scoreShoes(answers: QuizAnswers, shoes: Shoe[]): Array<{ shoe: Shoe; score: number; reasons: string[] }> {
    return shoes
      .map((shoe) => {
        let score = 50;
        const reasons: string[] = [];

        // Gender match
        if (shoe.gender === answers.gender || shoe.gender === 'Unisex') {
          score += 15;
          reasons.push('Perfect gender fit');
        }

        // Category match
        if (shoe.category === answers.use) {
          score += 20;
          reasons.push(`Designed for ${answers.use}`);
        }

        // Width preference
        const widthScore = this.getWidthScore(shoe.width_cm, answers.fit);
        score += widthScore;
        if (widthScore > 0) {
          reasons.push(`${answers.fit} fit match`);
        }

        // Style match
        const styleMatch = this.getStyleMatch(shoe.tags, answers.style);
        score += styleMatch;
        if (styleMatch > 0) {
          reasons.push(`${answers.style} aesthetic`);
        }

        // Budget match
        if (shoe.price_tier === answers.budget) {
          score += 10;
          reasons.push(`Within ${answers.budget} budget`);
        }

        return {
          shoe,
          score: Math.min(100, Math.max(0, score)),
          reasons,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  private getWidthScore(width: number, fit: string): number {
    if (fit === 'narrow' && width <= 10.7) return 10;
    if (fit === 'normal' && width > 10.7 && width < 11.2) return 10;
    if (fit === 'wide' && width >= 11.2) return 10;
    return 0;
  }

  private getStyleMatch(tags: string[], style: string): number {
    const styleMap: Record<string, string[]> = {
      classic: ['classic', 'timeless', 'iconic', 'heritage'],
      trendy: ['bold', 'futuristic', 'platform', 'chunky'],
      minimalist: ['clean', 'sleek', 'minimal', 'elegant'],
    };

    const styleKeywords = styleMap[style] || [];
    const matches = tags.filter((tag) => styleKeywords.includes(tag)).length;
    return matches > 0 ? 5 : 0;
  }
}
