const fs = require('fs');

// Read the JSON file
const data = JSON.parse(fs.readFileSync('app/blog/fxmed-content (1).json', 'utf8'));
console.log('Total articles:', data.length);

// Generate CSV content
let csv = 'title,slug,excerpt,author,category,read_time,status,content,thumbnail_url,thumbnail_alt\n';

data.forEach(item => {
  const title = item.title.replace(/"/g, '""'); // Escape quotes
  const excerpt = item.description.replace(/"/g, '""'); // Escape quotes
  const baseSlug = item.title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const slug = `${baseSlug}-${item.id}`;
  
  csv += `"${title}","${slug}","${excerpt}","FXMed Team","${item.category}","5 min read","draft","","",""\n`;
});

// Write to CSV file
fs.writeFileSync('blog-content-mapping.csv', csv);
console.log('CSV file updated with all articles');
console.log('Lines in CSV:', csv.split('\n').length);
