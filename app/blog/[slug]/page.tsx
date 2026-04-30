'use client'

import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { useState, useEffect } from 'react'

// Simple markdown to HTML converter - preserves ReactQuill HTML content
const markdownToHtml = (content: string): string => {
  if (!content) return ''
  
  // Check if content contains common HTML tags (from ReactQuill or AI)
  const hasHtmlTags = /<(p|div|span|h[1-6]|ul|ol|li|strong|em|b|i|br|a|img)[^>]*>/i.test(content)
  
  // If content already contains HTML tags, return as-is (it's from ReactQuill)
  if (hasHtmlTags) {
    return content
  }
  
  // Otherwise, treat as markdown and convert
  let html = content
    // Convert headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Convert bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Convert lists
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+\.) (.*$)/gim, '<li>$2</li>')
    // Wrap consecutive list items in ul/ol
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Convert paragraphs (must be after lists)
    .replace(/^(?!<[hl]|<li|<ul|<ol)(.*$)/gim, '<p>$1</p>')
    // Remove empty paragraphs
    .replace(/<p><\/p>/g, '')
    // Convert line breaks
    .replace(/\n/g, '')
  
  return html
}

const blogPosts = {
  'understanding-lab-results': {
    title: 'Understanding Your Lab Results',
    content: `
# Understanding Your Lab Results

Lab results can be confusing, but understanding them is crucial for taking control of your health. At FXMed, we believe that informed patients make better health decisions.

## What Your Blood Work Tells You

Your blood work provides a snapshot of your overall health, including:

- **Complete Blood Count (CBC)**: Red blood cells, white blood cells, and platelets
- **Metabolic Panel**: Kidney function, liver function, and electrolyte balance
- **Lipid Panel**: Cholesterol levels and cardiovascular risk factors
- **Hormone Levels**: Thyroid, reproductive, and stress hormones

## Key Markers to Watch

### Inflammatory Markers
- **CRP (C-Reactive Protein)**: Indicates inflammation in body
- **ESR (Erythrocyte Sedimentation Rate)**: Another inflammation marker

### Metabolic Health
- **Fasting Glucose**: Blood sugar levels
- **HbA1c**: Average blood sugar over 3 months
- **Insulin Levels**: How your body processes sugar

### Hormonal Balance
- **TSH, T3, T4**: Thyroid function
- **Cortisol**: Stress hormone
- **Sex Hormones**: Estrogen, progesterone, testosterone

## When to Be Concerned

Don't panic if you see values outside the "normal range." Consider:

1. **Trends are more important than single values**
2. **Optimal ranges differ from "normal" ranges**
3. **Context matters** (age, gender, symptoms)

## Next Steps

1. **Review with your healthcare provider**
2. **Track changes over time**
3. **Consider functional medicine approaches**
4. **Make lifestyle adjustments based on results**

## How FXMed Can Help

Our team specializes in:
- Comprehensive lab result interpretation
- Functional medicine approaches
- Personalized treatment plans
- Ongoing monitoring and support

Remember, your lab results are tools for understanding your health, not verdicts on your wellbeing.
    `,
    author: 'FXMed Team',
    date: '2024-03-15',
    readTime: '5 min read',
    category: 'Health Education'
  },
  'preventive-care-strategies': {
    title: 'Preventive Care Strategies',
    content: `
# Preventive Care Strategies

Preventive care is the foundation of optimal health. At FXMed, we focus on stopping health issues before they start through proactive, evidence-based approaches.

## The Philosophy of Prevention

Traditional medicine often treats symptoms after they appear. Functional medicine takes a different approach:

- **Identify root causes** of potential health issues
- **Strengthen body systems** before problems develop
- **Create resilience** against disease
- **Optimize function** rather than just treat dysfunction

## Key Preventive Strategies

### 1. Nutritional Optimization

**Foundation Foods:**
- Whole, unprocessed foods
- Colorful fruits and vegetables
- Quality proteins and healthy fats
- Fermented foods for gut health

**Targeted Supplementation:**
- Vitamin D for immune support
- Omega-3s for inflammation
- Probiotics for gut health
- Magnesium for stress management

### 2. Lifestyle Medicine

**Movement:**
- Regular exercise (150+ minutes/week)
- Strength training for metabolism
- Flexibility work for mobility
- Daily walking for circulation

**Sleep Optimization:**
- 7-9 hours quality sleep
- Consistent sleep schedule
- Dark, cool sleep environment
- Limited screen time before bed

### 3. Stress Management

**Mind-Body Techniques:**
- Meditation and mindfulness
- Deep breathing exercises
- Yoga or tai chi
- Time in nature

**Hormonal Balance:**
- Cortisol regulation
- Adrenal support
- Nervous system regulation

### 4. Environmental Health

**Reduce Toxin Exposure:**
- Clean water and air
- Non-toxic personal care
- Organic when possible
- Filter out environmental pollutants

## Screening and Early Detection

### Regular Health Screenings
- Annual physical exams
- Age-appropriate cancer screenings
- Cardiovascular risk assessment
- Hormone level testing

### Advanced Testing
- Genetic testing for predispositions
- Microbiome analysis
- Nutrient deficiency testing
- Inflammatory marker panels

## Building Your Preventive Plan

### Step 1: Assessment
- Comprehensive health history
- Current lifestyle evaluation
- Risk factor identification
- Goal setting

### Step 2: Personalization
- Tailored nutrition plan
- Exercise prescription
- Stress management techniques
- Supplement recommendations

### Step 3: Implementation
- Gradual habit changes
- Regular monitoring
- Adjustments as needed
- Support systems

### Step 4: Maintenance
- Ongoing education
- Regular check-ins
- Plan refinement
- Long-term success strategies

## The FXMed Approach

Our preventive care program includes:

1. **Comprehensive Assessment**: Full health evaluation
2. **Personalized Planning**: Custom strategies for your needs
3. **Mobile Services**: We come to you
4. **Ongoing Support**: Regular monitoring and adjustments
5. **Education**: Empowering you to take control

## Success Stories

Many of our patients have:
- Reversed pre-diabetes
- Improved cardiovascular markers
- Enhanced immune function
- Increased energy and vitality
- Reduced medication needs

## Getting Started

Preventive care is an investment in your future health. The sooner you start, the greater the benefits.

Contact FXMed today to create your personalized preventive health plan.
    `,
    author: 'FXMed Team',
    date: '2024-03-10',
    readTime: '8 min read',
    category: 'Preventive Medicine'
  },
  'nutrition-mental-wellness': {
    title: 'Nutrition for Mental Wellness',
    content: `
# Nutrition for Mental Wellness

The connection between what we eat and how we feel is profound. At FXMed, we've seen firsthand how targeted nutritional interventions can transform mental health outcomes.

## The Gut-Brain Connection

Your gut and brain are in constant communication through:

- **The Vagus Nerve**: Direct nervous system connection
- **Neurotransmitters**: 90% produced in the gut
- **Immune System**: Inflammation affects mood
- **Microbiome**: Gut bacteria influence brain function

## Key Nutrients for Mental Health

### 1. Omega-3 Fatty Acids

**Benefits:**
- Reduce depression and anxiety
- Improve cognitive function
- Decrease inflammation
- Support brain development

**Sources:**
- Fatty fish (salmon, sardines)
- Walnuts and flaxseeds
- Chia seeds and hemp seeds
- High-quality fish oil supplements

### 2. B Vitamins

**B6, B9 (Folate), B12:**
- Neurotransmitter synthesis
- Energy production
- Homocysteine regulation
- Myelin formation

**Food Sources:**
- Leafy greens
- Eggs and poultry
- Legumes and nuts
- Fortified foods

### 3. Magnesium

**Functions:**
- Stress response regulation
- Sleep quality improvement
- Anxiety reduction
- Muscle relaxation

**Rich Sources:**
- Dark chocolate
- Nuts and seeds
- Whole grains
- Leafy greens

### 4. Vitamin D

**Mental Health Impact:**
- Seasonal affective disorder prevention
- Depression risk reduction
- Cognitive function support
- Mood regulation

**Sources:**
- Sunlight exposure
- Fatty fish
- Fortified dairy
- Supplementation (often needed)

### 5. Amino Acids

**Tryptophan → Serotonin:**
- Turkey and chicken
- Nuts and seeds
- Tofu and tempeh
- Complex carbohydrates

**Tyrosine → Dopamine/Norepinephrine:**
- Lean proteins
- Dairy products
- Legumes
- Whole grains

### 6. Probiotics and Prebiotics

**Gut-Brain Axis:**
- Fermented foods (yogurt, kefir)
- High-fiber foods
- Prebiotic foods (garlic, onions)
- Diverse plant foods

## Foods to Limit for Mental Health

### 1. Processed Foods
- Artificial additives
- Refined sugars
- Trans fats
- Excessive sodium

### 2. Inflammatory Foods
- Excessive omega-6 oils
- Processed meats
- Refined carbohydrates
- Artificial sweeteners

### 3. Caffeine and Alcohol
- Can disrupt sleep
- May increase anxiety
- Affects neurotransmitter balance
- Depletes nutrients

## The FXMed Nutritional Approach

### Assessment Phase
- Comprehensive dietary analysis
- Nutrient deficiency testing
- Gut health evaluation
- Mental health symptom tracking

### Personalized Planning
- Individual nutrient needs
- Food sensitivity testing
- Lifestyle considerations
- Cultural food preferences

### Implementation Strategy
- Gradual dietary changes
- Meal planning support
- Supplement protocols
- Monitoring and adjustments

## Meal Planning for Mental Wellness

### Breakfast Options
- Omega-rich smoothie bowls
- Protein-packed oatmeal
- Vegetable egg scrambles
- Greek yogurt with berries

### Lunch Ideas
- Large salads with quality protein
- Grain bowls with vegetables
- Fish with roasted vegetables
- Soup and sandwich combinations

### Dinner Choices
- Baked fish with vegetables
- Lean protein with complex carbs
- Plant-based curry dishes
- Stir-fry with brown rice

### Snack Options
- Nuts and seeds
- Fresh fruit with nut butter
- Dark chocolate squares
- Vegetable sticks with hummus

## Success Stories

Our patients have experienced:
- Reduced anxiety and depression
- Improved focus and concentration
- Better sleep quality
- Enhanced mood stability
- Increased energy levels

## Getting Started

1. **Schedule a nutritional Assessment**
2. **Complete dietary analysis**
3. **Receive personalized plan**
4. **Implement with support**
5. **Monitor and adjust**

## Supplements vs. Food

While food should be the foundation, targeted supplements can help:
- Fill nutritional gaps
- Address specific deficiencies
- Support therapeutic goals
- Accelerate progress

## Long-term Success

Sustainable mental wellness through nutrition requires:
- Consistent eating patterns
- Regular monitoring
- Flexibility and balance
- Ongoing education

Your mental health is worth investing in. Let FXMed help you create a nutritional plan that supports your mind and body.
    `,
    author: 'FXMed Team',
    date: '2024-03-05',
    readTime: '6 min read',
    category: 'Nutrition',
    emoji: '🧠'
  }
}

export default function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const [post, setPost] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [slug, setSlug] = useState<string>('')

  // Category color mapping
  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Health Education': 'bg-blue-500 text-white',
      'Preventive Medicine': 'bg-purple-500 text-white',
      'Nutrition': 'bg-orange-500 text-white',
      'Functional Medicine': 'bg-green-500 text-white',
      'Mobile Health': 'bg-red-500 text-white',
      'Hormonal Health': 'bg-pink-500 text-white'
    }
    return colors[category] || 'bg-gray-500 text-white'
  }

  useEffect(() => {
    const loadPost = async () => {
      try {
        const resolvedParams = await params
        const resolvedSlug = resolvedParams.slug
        setSlug(resolvedSlug)
        
        // Fetch from API
        const response = await fetch(`/api/blog?slug=${resolvedSlug}`)
        if (!response.ok) {
          notFound()
          return
        }
        
        const { posts } = await response.json()
        const postData = posts?.[0]
        
        if (!postData) {
          notFound()
          return
        }
        
        console.log('Loaded post:', postData.title)
        console.log('Content length:', postData.content?.length)
        console.log('Content preview:', postData.content?.substring(0, 200))
        
        setPost(postData)
        setLoading(false)
      } catch (error) {
        console.error('Error loading post:', error)
        setLoading(false)
      }
    }
    
    loadPost()
  }, [params])

  return (
    <main className="min-h-screen bg-[#FCFFF0]">
      <Navigation />
      
      {/* Article Header */}
      <article className="pt-[180px] px-[5%]">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">Loading...</div>
              <p className="font-dm-sans text-text-mid text-[1.1rem]">
                Loading article...
              </p>
            </div>
          ) : !post ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">❌</div>
              <p className="font-dm-sans text-text-mid text-[1.1rem]">
                Article not found
              </p>
            </div>
          ) : (
            <>
              {/* Breadcrumb */}
              <nav className="mb-8 relative z-10">
                <Link 
                  href="/blog" 
                  className="font-dm-sans text-green-mid text-[0.95rem] no-underline hover:text-green-deep transition-all hover:underline cursor-pointer inline-block px-2 py-1 rounded-lg hover:bg-green-deep/10"
                  style={{ 
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    userSelect: 'none',
                    WebkitTapHighlightColor: 'transparent'
                  }}
                >
                  ← Back to Articles
                </Link>
              </nav>

              {/* Article Thumbnail */}
              {post.thumbnail_url && (
                <div className="mb-8 rounded-[20px] overflow-hidden shadow-lg">
                  <img 
                    src={post.thumbnail_url} 
                    alt={post.title}
                    className="w-full h-64 md:h-80 object-cover"
                    onError={(e) => {
                      const target = e.currentTarget
                      target.style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Article Meta */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">📝</div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-[20px] text-[0.8rem] font-dm-sans font-semibold mb-2 ${getCategoryColor(post.category)}`}>
                      {post.category}
                    </span>
                    <div className="text-text-mid text-[0.9rem]">
                      {new Date(post.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • {post.read_time}
                    </div>
                  </div>
                </div>
                
                <h1 className="font-dm-sans font-bold text-green-deep text-[clamp(2rem,5vw,3rem)] leading-[1.2] mb-4">
                  {post.title}
                </h1>
                
                <div className="flex items-center justify-between text-text-mid">
                  <span className="font-medium">By {post.author}</span>
                  <div className="flex gap-4">
                    <button className="font-dm-sans text-green-mid hover:text-green-deep transition-colors">
                      Share →
                    </button>
                  </div>
                </div>
              </div>

              {/* Article Content */}
              <div className="bg-white rounded-[20px] p-8 shadow-lg">
                <div 
                  className="prose prose-lg max-w-none font-dm-sans text-text-mid leading-[1.7]"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(post.content) }}
                />
              </div>

              {/* Article Footer */}
              <div className="mt-12 pt-8 border-t border-green-deep/20">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h3 className="font-dm-sans font-bold text-green-deep mb-2">About the Author</h3>
                    <p className="font-dm-sans text-text-mid">{post.author}</p>
                  </div>
                  
                  <div className="flex gap-4">
                    <button className="font-dm-sans bg-gold text-green-deep px-6 py-3 rounded-[50px] font-semibold text-[0.95rem] transition-all hover:bg-gold-light">
                      Share Article
                    </button>
                    <button className="font-dm-sans bg-transparent text-green-deep px-6 py-3 rounded-[50px] font-semibold text-[0.95rem] border-2 border-green-deep transition-all hover:bg-green-deep hover:text-white">
                      Subscribe
                    </button>
                  </div>
                </div>
              </div>

              {/* Related Articles */}
              <div className="mt-16">
                <h2 className="font-dm-sans font-bold text-green-deep text-[2rem] mb-8">Related Articles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.values(blogPosts)
                    .filter(p => p.title !== post.title)
                    .slice(0, 2)
                    .map((relatedPost) => (
                      <Link 
                        key={relatedPost.title}
                        href={`/blog/${Object.keys(blogPosts).find(key => blogPosts[key as keyof typeof blogPosts].title === relatedPost.title)}`}
                        className="bg-white rounded-[16px] p-6 border border-green-deep/8 shadow-sm hover:shadow-md transition-shadow no-underline"
                      >
                        <div className="flex items-start mb-3">
                          <div>
                            <h3 className="font-dm-sans font-semibold text-green-deep text-[1.1rem] mb-2">
                              {relatedPost.title}
                            </h3>
                            <p className="font-dm-sans text-text-mid text-[0.9rem] mb-2">
                              {relatedPost.content.slice(0, 100)}...
                            </p>
                            <div className="text-green-mid text-[0.85rem] font-medium">
                              {relatedPost.readTime}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </article>

      <Footer />
    </main>
  )
}
