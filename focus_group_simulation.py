#!/usr/bin/env python3
"""
10,000-person synthetic focus group simulation
Generates personas, WTP distributions, feature scores, and acquisition funnels
"""

import numpy as np
import pandas as pd
from scipy import stats
import json
from dataclasses import dataclass, asdict
from typing import Dict, List, Tuple
import warnings
warnings.filterwarnings('ignore')

np.random.seed(42)

# ==================== PERSONA DEFINITIONS ====================

@dataclass
class PersonaConfig:
    name: str
    age_range: Tuple[int, int]
    income_mean: int
    income_std: int
    time_scarcity: float  # 0-10 scale
    fashion_interest: float  # 0-10 scale
    price_sensitivity: float  # multiplier for WTP
    platform_preference: str

PERSONAS = {
    'busy_professional': PersonaConfig(
        name='Busy Professional',
        age_range=(28, 40),
        income_mean=85000,
        income_std=25000,
        time_scarcity=8.5,
        fashion_interest=6.0,
        price_sensitivity=0.7,  # Less price sensitive
        platform_preference='LinkedIn'
    ),
    'genz_social': PersonaConfig(
        name='Gen-Z Social Shopper',
        age_range=(18, 25),
        income_mean=35000,
        income_std=15000,
        time_scarcity=4.0,
        fashion_interest=9.0,
        price_sensitivity=1.4,  # More price sensitive
        platform_preference='TikTok'
    ),
    'fashion_anxious_men': PersonaConfig(
        name='Fashion-Anxious Men',
        age_range=(25, 45),
        income_mean=65000,
        income_std=30000,
        time_scarcity=6.5,
        fashion_interest=3.5,
        price_sensitivity=1.0,
        platform_preference='LinkedIn'
    )
}

# Segment distribution (must sum to 1.0)
SEGMENT_DISTRIBUTION = {
    'busy_professional': 0.35,
    'genz_social': 0.40,
    'fashion_anxious_men': 0.25
}

# ==================== RESPONDENT GENERATION ====================

def generate_respondents(n=10000):
    """Generate synthetic respondents across segments"""

    respondents = []

    for segment_key, config in PERSONAS.items():
        n_segment = int(n * SEGMENT_DISTRIBUTION[segment_key])

        for i in range(n_segment):
            age = np.random.randint(config.age_range[0], config.age_range[1] + 1)
            income = max(15000, np.random.normal(config.income_mean, config.income_std))

            # Add individual variation
            time_scarcity = np.clip(np.random.normal(config.time_scarcity, 1.5), 0, 10)
            fashion_interest = np.clip(np.random.normal(config.fashion_interest, 1.2), 0, 10)
            price_sensitivity = np.clip(np.random.normal(config.price_sensitivity, 0.2), 0.3, 2.0)

            respondents.append({
                'id': f'{segment_key}_{i}',
                'segment': segment_key,
                'segment_name': config.name,
                'age': age,
                'income': income,
                'time_scarcity': time_scarcity,
                'fashion_interest': fashion_interest,
                'price_sensitivity': price_sensitivity,
                'platform_preference': config.platform_preference
            })

    return pd.DataFrame(respondents)

# ==================== WTP MODELING ====================

def calculate_wtp(df: pd.DataFrame) -> pd.DataFrame:
    """Calculate willingness-to-pay for different pricing models"""

    def wtp_subscription(row):
        """Monthly subscription WTP based on time saved + fashion interest"""
        base = 15 + (row['time_scarcity'] * 2) + (row['fashion_interest'] * 1.5)
        income_adjusted = base * (1 + np.log10(row['income'] / 50000) * 0.3)
        return max(5, income_adjusted / row['price_sensitivity'])

    def wtp_per_outfit(row):
        """Pay-per-outfit WTP"""
        base = 3 + (row['fashion_interest'] * 0.5)
        income_adjusted = base * (1 + np.log10(row['income'] / 50000) * 0.2)
        return max(1, income_adjusted / row['price_sensitivity'])

    def wtp_bundle_10(row):
        """10-pack bundle WTP (with discount expectation)"""
        per_outfit = wtp_per_outfit(row)
        return per_outfit * 10 * 0.7  # 30% bundle discount expectation

    df['wtp_subscription'] = df.apply(wtp_subscription, axis=1)
    df['wtp_per_outfit'] = df.apply(wtp_per_outfit, axis=1)
    df['wtp_bundle_10'] = df.apply(wtp_bundle_10, axis=1)

    return df

def calculate_price_elasticity(df: pd.DataFrame, segment: str) -> Dict:
    """Estimate price elasticity for segment"""
    seg_df = df[df['segment'] == segment]

    # Simulate demand at different price points
    prices_sub = np.arange(5, 60, 5)
    demand_sub = []

    for price in prices_sub:
        willing = (seg_df['wtp_subscription'] >= price).sum() / len(seg_df)
        demand_sub.append(willing)

    # Calculate elasticity (% change in demand / % change in price)
    # Using arc elasticity between points
    elasticities = []
    for i in range(1, len(prices_sub)):
        pct_change_demand = (demand_sub[i] - demand_sub[i-1]) / demand_sub[i-1] if demand_sub[i-1] > 0 else 0
        pct_change_price = (prices_sub[i] - prices_sub[i-1]) / prices_sub[i-1]
        elasticity = pct_change_demand / pct_change_price if pct_change_price != 0 else 0
        elasticities.append(elasticity)

    avg_elasticity = np.mean(elasticities)

    return {
        'segment': segment,
        'price_elasticity': avg_elasticity,
        'optimal_price_sub': prices_sub[np.argmax([p * d for p, d in zip(prices_sub, demand_sub)])],
        'demand_curve': list(zip(prices_sub.tolist(), demand_sub))
    }

# ==================== FEATURE PRIORITIZATION ====================

FEATURES = [
    'upload_photo_body_scan',
    'combine_full_outfits',
    'direct_store_links',
    'save_share_looks',
    'outfit_dupes_finder',
    'occasion_packs',
    'confidence_mode',
    'creator_sets_marketplace'
]

def score_features(segment: str) -> Dict[str, float]:
    """Score features 0-10 by segment based on JTBD"""

    scores = {
        'busy_professional': {
            'upload_photo_body_scan': 7.5,
            'combine_full_outfits': 9.5,
            'direct_store_links': 9.0,
            'save_share_looks': 5.0,
            'outfit_dupes_finder': 4.0,
            'occasion_packs': 9.5,
            'confidence_mode': 8.5,
            'creator_sets_marketplace': 6.0
        },
        'genz_social': {
            'upload_photo_body_scan': 8.5,
            'combine_full_outfits': 8.0,
            'direct_store_links': 9.5,
            'save_share_looks': 10.0,
            'outfit_dupes_finder': 10.0,
            'occasion_packs': 6.5,
            'confidence_mode': 3.0,
            'creator_sets_marketplace': 9.5
        },
        'fashion_anxious_men': {
            'upload_photo_body_scan': 6.0,
            'combine_full_outfits': 9.0,
            'direct_store_links': 8.5,
            'save_share_looks': 4.0,
            'outfit_dupes_finder': 5.5,
            'occasion_packs': 8.5,
            'confidence_mode': 10.0,
            'creator_sets_marketplace': 7.0
        }
    }

    return scores[segment]

# ==================== JTBD FORCES DIAGRAM ====================

JTBD_FORCES = {
    'busy_professional': {
        'job': 'Help me look stylish without thinking about it',
        'push': ['Boring wardrobe', 'No time to shop', 'Decision fatigue'],
        'pull': ['Pre-vetted outfits', 'Save 3+ hours/week', 'Effortless style'],
        'anxiety': ['Will AI understand my style?', 'Quality of recommendations', 'Return hassle'],
        'habit': ['Already have go-to stores', 'Personal shopper relationships', 'Shopping as stress relief']
    },
    'genz_social': {
        'job': 'Help me look like my favorite influencer without the guesswork',
        'push': ['Can\'t recreate IG looks', 'Budget constraints', 'Too many options'],
        'pull': ['Instant outfit dupes', 'Shareable transformations', 'Social validation'],
        'anxiety': ['Will it actually look like the inspo?', 'Friends already have it', 'Shipping time'],
        'habit': ['Hours scrolling for deals', 'Pinterest boards', 'Ask friends for opinions']
    },
    'fashion_anxious_men': {
        'job': 'Make me look better without making me learn fashion',
        'push': ['Shopping is overwhelming', 'Don\'t know what matches', 'Low confidence'],
        'pull': ['No-brainer formulas', 'Look good in photos', 'Simple process'],
        'anxiety': ['Will it fit?', 'Too trendy/young?', 'Wasting money on wrong choices'],
        'habit': ['Buy same brands', 'Let partner choose', 'Avoid shopping entirely']
    }
}

# ==================== ACQUISITION FUNNEL ====================

def model_acquisition_funnel(segment: str, channel: str) -> Dict:
    """Model 4-week funnel with confidence intervals via bootstrapping"""

    # Base metrics by segment x channel
    funnel_params = {
        ('busy_professional', 'LinkedIn'): {
            'impressions': 100000,
            'ctr': (0.025, 0.005),  # (mean, std)
            'cvr_signup': (0.12, 0.02),
            'try_first_look': (0.65, 0.08),
            'share_rate': (0.15, 0.05),
            'day7_retention': (0.45, 0.08),
            'cac_range': (25, 45)
        },
        ('busy_professional', 'TikTok'): {
            'impressions': 80000,
            'ctr': (0.015, 0.004),
            'cvr_signup': (0.08, 0.015),
            'try_first_look': (0.55, 0.08),
            'share_rate': (0.25, 0.06),
            'day7_retention': (0.35, 0.07),
            'cac_range': (35, 60)
        },
        ('genz_social', 'TikTok'): {
            'impressions': 250000,
            'ctr': (0.045, 0.008),
            'cvr_signup': (0.18, 0.03),
            'try_first_look': (0.75, 0.06),
            'share_rate': (0.55, 0.08),
            'day7_retention': (0.50, 0.09),
            'cac_range': (8, 18)
        },
        ('genz_social', 'LinkedIn'): {
            'impressions': 30000,
            'ctr': (0.008, 0.003),
            'cvr_signup': (0.05, 0.012),
            'try_first_look': (0.50, 0.10),
            'share_rate': (0.30, 0.08),
            'day7_retention': (0.25, 0.08),
            'cac_range': (45, 80)
        },
        ('fashion_anxious_men', 'LinkedIn'): {
            'impressions': 75000,
            'ctr': (0.020, 0.005),
            'cvr_signup': (0.15, 0.025),
            'try_first_look': (0.70, 0.07),
            'share_rate': (0.10, 0.04),
            'day7_retention': (0.55, 0.08),
            'cac_range': (18, 35)
        },
        ('fashion_anxious_men', 'TikTok'): {
            'impressions': 120000,
            'ctr': (0.028, 0.006),
            'cvr_signup': (0.10, 0.02),
            'try_first_look': (0.65, 0.08),
            'share_rate': (0.20, 0.06),
            'day7_retention': (0.48, 0.08),
            'cac_range': (22, 40)
        }
    }

    params = funnel_params.get((segment, channel), funnel_params[('busy_professional', 'LinkedIn')])

    # Bootstrap for confidence intervals
    n_bootstrap = 1000
    impressions = params['impressions']

    results = {
        'segment': segment,
        'channel': channel,
        'impressions': impressions
    }

    # Simulate funnel
    for metric in ['ctr', 'cvr_signup', 'try_first_look', 'share_rate', 'day7_retention']:
        mean, std = params[metric]
        samples = np.random.normal(mean, std, n_bootstrap)
        samples = np.clip(samples, 0, 1)

        results[metric] = {
            'mean': float(np.mean(samples)),
            'ci_lower': float(np.percentile(samples, 2.5)),
            'ci_upper': float(np.percentile(samples, 97.5)),
            'std': float(np.std(samples))
        }

    # Calculate absolute numbers
    clicks = impressions * results['ctr']['mean']
    signups = clicks * results['cvr_signup']['mean']
    tried = signups * results['try_first_look']['mean']
    shared = tried * results['share_rate']['mean']
    retained = signups * results['day7_retention']['mean']

    results['absolute_numbers'] = {
        'clicks': int(clicks),
        'signups': int(signups),
        'tried_first_look': int(tried),
        'shared': int(shared),
        'day7_retained': int(retained)
    }

    results['cac_range'] = params['cac_range']

    return results

# ==================== VALIDATION EXPERIMENTS ====================

VALIDATION_EXPERIMENTS = {
    'busy_professional': {
        'title': 'Corporate Professional Interview Study',
        'method': 'In-depth interviews + price testing',
        'steps': [
            '1. Recruit 20 corporate professionals (LinkedIn + referrals)',
            '2. Pre-screen: Must shop <1x/month, care about appearance, income >$70k',
            '3. Show mockups of 5 pre-styled "work week" outfit sets',
            '4. Conduct 30-min interviews asking:',
            '   - How much time spent on outfit decisions weekly?',
            '   - Current shopping pain points',
            '   - Van Westendorp pricing: Too cheap? Cheap? Expensive? Too expensive?',
            '5. A/B test pricing: $29/mo vs $49/mo tier messaging',
            '6. Track email signup rate by price point shown'
        ],
        'success_threshold': {
            'min_wtp_median': 35,
            'email_signup_rate': 0.40,
            'time_saved_claim': '3+ hours/week'
        },
        'stop_rule': 'If <30% would pay $25/mo, pivot to pay-per-outfit model',
        'iterate_rule': 'If anxiety around "AI understanding style" >60%, add style quiz flow'
    },
    'genz_social': {
        'title': 'TikTok Outfit Transformation Virality Test',
        'method': 'UGC content test + engagement tracking',
        'steps': [
            '1. Create 10 TikTok videos: "Influencer outfit for $50" format',
            '2. Show side-by-side: Expensive IG look → AI-matched affordable dupe',
            '3. Include swipe-up link to waitlist',
            '4. Partner with 3 micro-influencers (50k-200k followers) for posts',
            '5. Track for 2 weeks:',
            '   - Save rate (benchmark: >8% = high intent)',
            '   - DM requests asking "how did you do this?"',
            '   - Waitlist signups per 1k views',
            '   - Share rate + duets/stitches',
            '6. Run IG story polls: "Would you pay $3 per outfit dupe?" Y/N'
        ],
        'success_threshold': {
            'save_rate': 0.08,
            'dm_request_rate': 0.02,
            'waitlist_per_1k_views': 5,
            'poll_yes_rate': 0.60
        },
        'stop_rule': 'If save rate <3%, creative not resonating - test new hooks',
        'iterate_rule': 'If share rate high but signup low, reduce friction (remove waitlist, add instant try-on)'
    },
    'fashion_anxious_men': {
        'title': 'Dating Profile Photo A/B Test (Partner with Dating Coaches)',
        'method': 'Styled vs. unstyled profile performance',
        'steps': [
            '1. Partner with 3-5 dating coaches with male clients',
            '2. Recruit 30 men struggling with dating app photos',
            '3. Control group: Current photos',
            '4. Test group: AI-styled outfits → new photos in suggested looks',
            '5. Run profiles for 2 weeks, measure:',
            '   - Match rate increase',
            '   - Right swipe rate (if data available)',
            '   - Conversation start rate',
            '6. Exit survey: "How confident did you feel?" (1-10)',
            '7. Ask: "Would you pay $X for outfit recommendations?" (test $15, $25, $40 one-time)'
        ],
        'success_threshold': {
            'match_rate_lift': 1.5,  # 50% increase
            'confidence_score': 7.5,
            'wtp_40_percent': 0.35
        },
        'stop_rule': 'If match rate lift <20%, styling not differentiated enough',
        'iterate_rule': 'If confidence high but WTP low, bundle with photography service for higher perceived value'
    }
}

# ==================== MAIN ANALYSIS ====================

def main():
    print("🎯 Generating 10,000 synthetic respondents...")
    df = generate_respondents(10000)

    print("💰 Calculating WTP distributions...")
    df = calculate_wtp(df)

    # WTP Summary Stats
    print("\n" + "="*60)
    print("WILLINGNESS-TO-PAY ANALYSIS")
    print("="*60)

    wtp_summary = []
    for segment in PERSONAS.keys():
        seg_df = df[df['segment'] == segment]
        seg_name = PERSONAS[segment].name

        for pricing_model in ['wtp_subscription', 'wtp_per_outfit', 'wtp_bundle_10']:
            values = seg_df[pricing_model]

            # Bootstrap for CI
            bootstrap_means = [values.sample(len(values), replace=True).mean() for _ in range(1000)]
            ci_lower = np.percentile(bootstrap_means, 2.5)
            ci_upper = np.percentile(bootstrap_means, 97.5)

            wtp_summary.append({
                'segment': seg_name,
                'pricing_model': pricing_model.replace('wtp_', ''),
                'mean': f"${values.mean():.2f}",
                'median': f"${values.median():.2f}",
                'ci_95': f"[${ci_lower:.2f}, ${ci_upper:.2f}]",
                'p25': f"${values.quantile(0.25):.2f}",
                'p75': f"${values.quantile(0.75):.2f}"
            })

    wtp_df = pd.DataFrame(wtp_summary)
    print("\n" + wtp_df.to_string(index=False))

    # Price Elasticity
    print("\n" + "="*60)
    print("PRICE ELASTICITY & OPTIMAL PRICING")
    print("="*60)

    elasticity_results = []
    for segment in PERSONAS.keys():
        result = calculate_price_elasticity(df, segment)
        elasticity_results.append(result)
        print(f"\n{PERSONAS[segment].name}:")
        print(f"  Price Elasticity: {result['price_elasticity']:.3f}")
        print(f"  Optimal Price (subscription): ${result['optimal_price_sub']:.0f}/mo")

    # Feature Prioritization
    print("\n" + "="*60)
    print("FEATURE PRIORITIZATION (0-10 scale)")
    print("="*60)

    feature_scores = {}
    for segment in PERSONAS.keys():
        feature_scores[segment] = score_features(segment)

    feature_df = pd.DataFrame(feature_scores).T
    feature_df.index = [PERSONAS[s].name for s in feature_df.index]
    print("\n" + feature_df.to_string())

    # Top 5 features per segment
    print("\n" + "="*60)
    print("TOP 5 FEATURES BY SEGMENT")
    print("="*60)
    for segment in PERSONAS.keys():
        seg_name = PERSONAS[segment].name
        scores = feature_scores[segment]
        top_5 = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:5]
        print(f"\n{seg_name}:")
        for i, (feature, score) in enumerate(top_5, 1):
            print(f"  {i}. {feature.replace('_', ' ').title()}: {score}/10")

    # JTBD Forces Diagrams
    print("\n" + "="*60)
    print("JOBS-TO-BE-DONE FORCES DIAGRAMS")
    print("="*60)
    for segment in PERSONAS.keys():
        forces = JTBD_FORCES[segment]
        seg_name = PERSONAS[segment].name
        print(f"\n{seg_name}:")
        print(f"  📋 Job: \"{forces['job']}\"")
        print(f"  ⬅️  Push (away from current): {', '.join(forces['push'])}")
        print(f"  ➡️  Pull (toward solution): {', '.join(forces['pull'])}")
        print(f"  😰 Anxiety (fears): {', '.join(forces['anxiety'])}")
        print(f"  🔄 Habit (inertia): {', '.join(forces['habit'])}")

    # Acquisition Funnels
    print("\n" + "="*60)
    print("4-WEEK ACQUISITION FUNNELS")
    print("="*60)

    funnel_results = []
    for segment in PERSONAS.keys():
        for channel in ['TikTok', 'LinkedIn']:
            result = model_acquisition_funnel(segment, channel)
            funnel_results.append(result)

            seg_name = PERSONAS[segment].name
            print(f"\n{seg_name} → {channel}:")
            print(f"  Impressions: {result['impressions']:,}")
            print(f"  CTR: {result['ctr']['mean']*100:.2f}% (95% CI: {result['ctr']['ci_lower']*100:.2f}%-{result['ctr']['ci_upper']*100:.2f}%)")
            print(f"  Signup CVR: {result['cvr_signup']['mean']*100:.2f}% (95% CI: {result['cvr_signup']['ci_lower']*100:.2f}%-{result['cvr_signup']['ci_upper']*100:.2f}%)")
            print(f"  Try 1st Look: {result['try_first_look']['mean']*100:.2f}%")
            print(f"  Share Rate: {result['share_rate']['mean']*100:.2f}%")
            print(f"  Day-7 Retention: {result['day7_retention']['mean']*100:.2f}%")
            print(f"  CAC Range: ${result['cac_range'][0]}-${result['cac_range'][1]}")
            print(f"  📊 Funnel: {result['absolute_numbers']['clicks']:,} clicks → {result['absolute_numbers']['signups']:,} signups → {result['absolute_numbers']['day7_retained']:,} D7 retained")

    # Validation Experiments
    print("\n" + "="*60)
    print("VALIDATION EXPERIMENT PLAYBOOKS")
    print("="*60)

    for segment in PERSONAS.keys():
        exp = VALIDATION_EXPERIMENTS[segment]
        seg_name = PERSONAS[segment].name
        print(f"\n{'─'*60}")
        print(f"🧪 {seg_name}: {exp['title']}")
        print(f"{'─'*60}")
        print(f"Method: {exp['method']}\n")
        print("Steps:")
        for step in exp['steps']:
            print(f"  {step}")
        print(f"\n✅ Success Threshold:")
        for key, val in exp['success_threshold'].items():
            print(f"  • {key.replace('_', ' ').title()}: {val}")
        print(f"\n🛑 Stop Rule: {exp['stop_rule']}")
        print(f"🔄 Iterate Rule: {exp['iterate_rule']}")

    # Save all results (convert numpy types to native Python)
    output = {
        'wtp_summary': wtp_summary,
        'elasticity': elasticity_results,
        'feature_scores': feature_scores,
        'jtbd_forces': JTBD_FORCES,
        'acquisition_funnels': funnel_results,
        'validation_experiments': VALIDATION_EXPERIMENTS
    }

    with open('/Users/alyonayanuchek/godlovesme-ai/focus_group_results.json', 'w') as f:
        json.dump(output, f, indent=2, default=float)

    df.to_csv('/Users/alyonayanuchek/godlovesme-ai/respondents.csv', index=False)

    print("\n" + "="*60)
    print("✅ Results saved to:")
    print("  • focus_group_results.json")
    print("  • respondents.csv")
    print("="*60)

    # Recommended Pricing Tiers
    print("\n" + "="*60)
    print("💡 RECOMMENDED PRICING TIERS")
    print("="*60)

    print("""
    TIER 1: Gen-Z Social ($12/mo or $2.99/outfit)
      • Outfit dupes finder
      • Save & share (unlimited)
      • 10 looks/month
      • Target: 40% of Gen-Z segment

    TIER 2: Essentials ($29/mo or $4.99/outfit)
      • Everything in Tier 1
      • Occasion packs (date, work, travel)
      • Unlimited looks
      • Body scan & fit optimization
      • Target: 35% of Busy Professionals

    TIER 3: Confidence Pro ($49/mo)
      • Everything in Tier 2
      • Confidence Mode (auto-approve)
      • Creator Sets Marketplace access
      • Personal style learning AI
      • Priority support
      • Target: 25% of Fashion-Anxious Men + high-income Professionals

    PAY-PER-OUTFIT: $3.99 (no subscription)
      • Single outfit generation
      • Direct store links
      • Target: Trial users, low-frequency shoppers
    """)

if __name__ == '__main__':
    main()
