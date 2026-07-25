import { ResourceDecorator as Resource, ExecutionContext } from '@nitrostack/core';

export class MedicalResources {
  /**
   * Resource 1: WHO Guidelines
   */
  @Resource({
    uri: 'medical://who-guidelines',
    name: 'WHO Pediatric Clinical Guidelines',
    description: 'World Health Organization standards for pediatric growth, infant feeding, and clinical deficiency protocols.',
    mimeType: 'application/json'
  })
  async getWhoGuidelines(ctx: ExecutionContext) {
    ctx.logger.info('[medical://who-guidelines] Accessing WHO clinical standards resource');
    return {
      organization: 'World Health Organization (WHO)',
      title: 'Pediatric Growth & Clinical Nutrition Standards',
      keyGuidelines: [
        {
          topic: 'Pediatric Anemia',
          threshold: 'Hemoglobin < 11.0 g/dL in children 6-59 months',
          protocol: 'Daily oral iron supplementation paired with ascorbic acid (Vitamin C); dietary diversification with animal/plant iron sources.'
        },
        {
          topic: 'Growth Faltering & Malnutrition',
          threshold: 'Weight-for-height < -2 SD on WHO growth charts',
          protocol: 'Community-based management of acute malnutrition (CMAM), therapeutic feeding, and micronutrient powders (MNP).'
        },
        {
          topic: 'Infant and Young Child Feeding (IYCF)',
          threshold: 'Children 6-23 months',
          protocol: 'Minimum dietary diversity (>= 5 of 8 food groups daily) and continued breastfeeding up to 2 years or beyond.'
        }
      ]
    };
  }

  /**
   * Resource 2: ICMR Guidelines
   */
  @Resource({
    uri: 'medical://icmr-guidelines',
    name: 'ICMR 2020 RDA & NIN Guidelines',
    description: 'Indian Council of Medical Research (ICMR) & National Institute of Nutrition (NIN) India pediatric dietary guidelines.',
    mimeType: 'application/json'
  })
  async getIcmrGuidelines(ctx: ExecutionContext) {
    ctx.logger.info('[medical://icmr-guidelines] Accessing ICMR 2020 RDA resource');
    return {
      institution: 'Indian Council of Medical Research (ICMR) & NIN Hyderabad',
      edition: 'Dietary Guidelines for Indians & Recommended Dietary Allowances (RDA) 2020',
      keyStandards: [
        {
          ageGroup: '1-3 years',
          calories: '1010 kcal/day',
          protein: '12.5 g/day',
          calcium: '500 mg/day',
          iron: '8 mg/day'
        },
        {
          ageGroup: '4-6 years',
          calories: '1360 kcal/day',
          protein: '16.0 g/day',
          calcium: '550 mg/day',
          iron: '11 mg/day'
        },
        {
          ageGroup: '7-9 years',
          calories: '1700 kcal/day',
          protein: '23.0 g/day',
          calcium: '650 mg/day',
          iron: '15 mg/day'
        }
      ]
    };
  }

  /**
   * Resource 3: Nutrition Deficiencies
   */
  @Resource({
    uri: 'medical://nutrition-deficiencies',
    name: 'Pediatric Deficiency Diagnostic Library',
    description: 'Comprehensive clinical catalog of 5 core pediatric nutrient deficiencies, clinical signs, and dietary solutions.',
    mimeType: 'application/json'
  })
  async getNutritionDeficiencies(ctx: ExecutionContext) {
    ctx.logger.info('[medical://nutrition-deficiencies] Accessing deficiency library resource');
    return {
      deficiencies: [
        {
          name: 'Iron Deficiency Anemia',
          signs: ['Pallor', 'Fatigue', 'Pica (eating dirt/ice)', 'Irritability', 'Poor concentration'],
          dietarySources: ['Spinach (Palak)', 'Ragi', 'Beetroot', 'Jaggery', 'Poha', 'Legumes']
        },
        {
          name: 'Vitamin D Deficiency (Rickets)',
          signs: ['Bowlegs', 'Delayed walking', 'Bone pain', 'Restless sleep', 'Delayed tooth eruption'],
          dietarySources: ['Sunlight exposure (20 mins)', 'Fortified Milk', 'Egg Yolks', 'Mushrooms']
        },
        {
          name: 'Calcium Deficiency',
          signs: ['Muscle cramps', 'Brittle nails', 'Enamel hypoplasia', 'Growth delay'],
          dietarySources: ['Milk', 'Paneer', 'Curd', 'Ragi', 'Sesame Seeds (Til)', 'Broccoli']
        },
        {
          name: 'Protein-Energy Undernutrition',
          signs: ['Muscle wasting', 'Frequent infections', 'Thin hair', 'Pediatric edema'],
          dietarySources: ['Pulses/Legumes', 'Paneer', 'Eggs', 'Soya Chunks', 'Sprouts']
        },
        {
          name: 'Vitamin B12 Deficiency',
          signs: ['Megaloblastic anemia', 'Neurological paresthesia', 'Glossitis (smooth tongue)', 'Lethargy'],
          dietarySources: ['Milk', 'Curd', 'Eggs', 'Fortified Cereals']
        }
      ]
    };
  }

  /**
   * Resource 4: Symptom Library
   */
  @Resource({
    uri: 'medical://symptom-library',
    name: 'Pediatric Clinical Symptom Library',
    description: 'Clinical mapping of common pediatric symptoms to differential nutritional and medical conditions.',
    mimeType: 'application/json'
  })
  async getSymptomLibrary(ctx: ExecutionContext) {
    ctx.logger.info('[medical://symptom-library] Accessing symptom library resource');
    return {
      symptoms: [
        { symptom: 'Fatigue / Lethargy', possibleCauses: ['Anemia', 'Caloric insufficiency', 'Hypothyroidism', 'Chronic infection'] },
        { symptom: 'Constipation', possibleCauses: ['Low dietary fiber', 'Inadequate water intake', 'Excess unfortified cow milk', 'Hypothyroidism'] },
        { symptom: 'Bone / Joint Pain', possibleCauses: ['Vitamin D deficiency rickets', 'Growing pains', 'Calcium deficit', 'Hypermobility'] },
        { symptom: 'Frequent Infections', possibleCauses: ['Zinc / Vitamin C / Vitamin A deficiency', 'Protein energy malnutrition', 'Immune deficits'] },
        { symptom: 'Poor Growth / Height Stalling', possibleCauses: ['Caloric-protein deficit', 'Growth hormone deficiency', 'Celiac disease', 'Parasitic infection'] }
      ]
    };
  }

  /**
   * Resource 5: Medication Information
   */
  @Resource({
    uri: 'medical://medication-information',
    name: 'Pediatric Pharmacopoeia & Food Interaction Guide',
    description: 'Pediatric medication safety reference, food-drug interactions, and clinical administration rules.',
    mimeType: 'application/json'
  })
  async getMedicationInformation(ctx: ExecutionContext) {
    ctx.logger.info('[medical://medication-information] Accessing medication info resource');
    return {
      notice: 'CLINICAL REFERENCE ONLY. Do NOT prescribe medication or dosage without a licensed physician.',
      commonMedications: [
        {
          drug: 'Ferrous Ascorbate (Iron Drops/Syrup)',
          foodInteraction: 'Dairy/milk inhibits absorption by 60%. Orange juice/Vitamin C boosts absorption by 300%. Take on an empty stomach.'
        },
        {
          drug: 'Vitamin D3 Syrup',
          foodInteraction: 'Fat-soluble vitamin. Administer with fat-rich food (milk, curd, ghee) to maximize intestinal uptake.'
        },
        {
          drug: 'Paracetamol Syrup',
          foodInteraction: 'Can be given with food to prevent mild gastric upset. Maintain adequate fluid hydration.'
        },
        {
          drug: 'Amoxicillin Oral Suspension',
          foodInteraction: 'May disrupt gut flora. Co-administer probiotic food like curd/yogurt 2 hours after dose.'
        }
      ]
    };
  }
}
