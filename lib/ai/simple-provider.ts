export interface AIGeneratedContent {
  title: string
  excerpt: string
  content: string
  suggestedTags: string[]
  suggestedCategory: string
}

export interface AIProvider {
  generateBlogContent(prompt: string, category: string): Promise<AIGeneratedContent>
}

// Simple template-based provider as fallback
class SimpleTemplateProvider implements AIProvider {
  async generateBlogContent(prompt: string, category: string): Promise<AIGeneratedContent> {
    // Generate content based on templates
    const title = this.generateTitle(prompt);
    const excerpt = this.generateExcerpt(prompt);
    const content = this.generateContent(prompt, category);
    
    return {
      title,
      excerpt,
      content,
      suggestedTags: this.generateTags(prompt, category),
      suggestedCategory: category || 'Health Education'
    };
  }

  private generateTitle(prompt: string): string {
    const templates = [
      `Understanding ${prompt}: A Complete Guide`,
      `How ${prompt} Can Transform Your Health`,
      `The Ultimate Guide to ${prompt}`,
      `${prompt}: What You Need to Know`,
      `Discover the Benefits of ${prompt}`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateExcerpt(prompt: string): string {
    return `Learn everything you need to know about ${prompt}. This comprehensive guide covers the key benefits, practical applications, and expert insights to help you make informed decisions about your health and wellness journey.`;
  }

  private generateContent(prompt: string, category: string): string {
    return `<h2>What is ${prompt}?</h2>
<p>${prompt} is an important aspect of health and wellness that deserves careful consideration. Understanding its role in your overall well-being can help you make better decisions for your health journey.</p>

<h2>Key Benefits</h2>
<p>Research has shown numerous benefits associated with ${prompt}. These include improved health outcomes, enhanced quality of life, and better overall wellness. Many patients have experienced positive results when incorporating these approaches into their daily routines.</p>

<h2>Practical Applications</h2>
<p>Implementing ${prompt} in your life doesn't have to be complicated. Start with small, manageable steps and gradually build upon your successes. Consistency is key when working toward better health outcomes.</p>

<h3>Getting Started</h3>
<ul>
<li>Consult with a healthcare professional before making significant changes</li>
<li>Start with small, achievable goals</li>
<li>Track your progress and adjust as needed</li>
<li>Stay consistent with your new habits</li>
</ul>

<h2>Expert Insights</h2>
<p>Healthcare professionals agree that ${prompt} plays a crucial role in preventive health and wellness. By taking a proactive approach, you can better support your body's natural healing processes and maintain optimal health.</p>

<h2>Conclusion</h2>
<p>${prompt} offers valuable benefits for those seeking to improve their health and wellness. By understanding the key principles and implementing practical strategies, you can take meaningful steps toward better health. Remember to work with qualified healthcare providers to ensure the best outcomes for your individual needs.</p>`;
  }

  private generateTags(prompt: string, category: string): string[] {
    const baseTags = ['health', 'wellness', 'functional medicine', 'preventive care'];
    const promptWords = prompt.toLowerCase().split(' ').filter(word => word.length > 3);
    
    return [...baseTags, ...promptWords.slice(0, 2)];
  }
}

export function createSimpleProvider(): AIProvider {
  return new SimpleTemplateProvider();
}
