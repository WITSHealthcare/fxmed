-- Seed: Autism education series (10 posts) for the blog.
-- This is data, not schema, so it is kept out of the migrations folder. Run it in
-- the Supabase SQL editor. Hero images live in public/blog/autism/.
--
-- Safe to run more than once: INSERT ... SELECT ... WHERE NOT EXISTS skips any
-- post whose slug is already present. Posts go live as soon as this runs; change
-- status to 'draft' below to review them in the admin Blog tab first.

-- 1. Understanding Autism: What the Spectrum Really Means
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$Understanding Autism: What the Spectrum Really Means$p$,
  'understanding-autism-what-the-spectrum-really-means',
  $p$Autism is called a spectrum because no two autistic people are the same. Here is what that really means for communication, senses, strengths and support.$p$,
  $p$<p>You may have heard the phrase “if you’ve met one autistic person, you’ve met one autistic person.” It is a good place to start. Autism is called a <strong>spectrum</strong> not because people sit somewhere between “a little” and “a lot” autistic, but because autism shows up in many different ways, and each person has their own mix of strengths, challenges and needs.</p>
<h2>What is autism?</h2>
<div class="not-prose fx-block"><div class="fx-stats"><div class="fx-stat"><div class="fx-stat-value">1 in 100</div><div class="fx-stat-label">children worldwide are autistic</div><div class="fx-stat-source">World Health Organization, 2023</div></div><div class="fx-stat"><div class="fx-stat-value">1 in 31</div><div class="fx-stat-label">8-year-olds in the United States were identified as autistic in 2022</div><div class="fx-stat-source">CDC, 2025</div></div><div class="fx-stat"><div class="fx-stat-value">2</div><div class="fx-stat-label">core areas doctors look at: social communication, and repetitive behaviours and sensory differences</div></div></div></div>
<p>Autism is a lifelong developmental difference in how a person’s brain processes information, communicates and experiences the world. Doctors look at two broad areas when making a diagnosis:</p>
<ul>
<li><strong>Social communication and interaction.</strong> Differences in using and reading eye contact, facial expressions, gestures and tone of voice, in back-and-forth conversation, and in making and keeping friendships.</li>
<li><strong>Repetitive behaviours, focused interests and sensory differences.</strong> This can include repeated movements or phrases, a strong preference for routine, deep interests in particular topics, and being over- or under-sensitive to sound, light, touch, taste or smell.</li>
</ul>
<p>These traits appear in early childhood, although they are sometimes not recognised until much later, when life demands more than a person can manage without support.</p>
<figure class="not-prose fx-block fx-figure"><img src="/blog/autism/graphics/spectrum-profiles.svg" alt="Radar chart comparing two autistic children across six areas. Child A needs more support with communication and focused interests; Child B needs more support with sensory processing, routine and movement." /><figcaption>Two autistic children, two very different profiles. The spectrum is not a line from “mild” to “severe”: each person has their own mix of strengths and support needs. Illustrative example.</figcaption></figure>
<h2>Communication comes in many forms</h2>
<div class="not-prose fx-block"><p class="fx-block-title">All of these are communication</p><div class="fx-chips"><span class="fx-chip">Speech</span><span class="fx-chip">Gestures</span><span class="fx-chip">Pictures</span><span class="fx-chip">Writing</span><span class="fx-chip">Sign language</span><span class="fx-chip">Communication devices</span></div></div>
<p>Some autistic people talk early and fluently; others use few or no spoken words. Many fall somewhere in between, or find that their ability to speak changes with stress and tiredness. Communication can include speech, gestures, pictures, writing, sign language and communication devices. All of these are real communication and deserve to be respected.</p>
<p>Autistic people may also communicate more directly, take words literally or find small talk tiring. These are differences, not failures. Many autistic people say they communicate easily with other autistic people. The difficulty often lies in the gap between two styles.</p>
<h2>Sensory experiences</h2>
<p>For many autistic people, the senses work differently. A ticking clock might feel unbearable; the label in a shirt might feel like sandpaper; a crowded market might be overwhelming. Others seek out sensations, such as spinning, deep pressure or strong flavours. Understanding a person’s sensory profile often explains behaviour that looks puzzling from the outside, and small changes like ear defenders or softer clothing can make a big difference.</p>
<h2>Strengths matter too</h2>
<div class="not-prose fx-block"><p class="fx-block-title">Common strengths</p><div class="fx-chips"><span class="fx-chip fx-chip-strong">Attention to detail</span><span class="fx-chip fx-chip-strong">Deep knowledge</span><span class="fx-chip fx-chip-strong">Honesty</span><span class="fx-chip fx-chip-strong">Strong memory</span><span class="fx-chip fx-chip-strong">Pattern spotting</span><span class="fx-chip fx-chip-strong">Loyalty</span></div></div>
<p>Autism is not only a list of challenges. Many autistic people have strengths such as attention to detail, deep knowledge of their interests, honesty, strong memory, pattern spotting and loyalty. Building on these strengths, rather than only working on weaknesses, helps children grow in confidence.</p>
<h2>Support needs differ, and change over time</h2>
<p>Some autistic people need help with most daily activities. Others live independently but still need understanding at school or work. Clinicians sometimes describe three “levels” of support need, but a single level never tells the whole story. A child may be very capable in one area and need a lot of help in another, and needs often change with age, stress and environment.</p>
<p>Autism also often comes with other conditions, which can affect quality of life as much as autism itself. These include:</p>
<ul>
<li>ADHD, anxiety and sleep difficulties</li>
<li>Digestive problems such as constipation and tummy pain</li>
<li>Epilepsy, which is more common in autistic people than in the general population</li>
<li>Intellectual disability in some people, though many autistic people have average or above-average intelligence</li>
</ul>
<h2>Words and labels</h2>
<p>You will see both “autistic person” and “person with autism.” Many autistic adults prefer “autistic person” because they see autism as part of who they are. Some families prefer the other. The kindest approach is to ask, and to follow the person’s own preference.</p>
<h2>Key takeaways</h2>
<div class="not-prose fx-block fx-takeaways"><p class="fx-block-title">At a glance</p><ul><li>Autism is a lifelong difference in communication, interaction and sensory processing, not an illness.</li><li>The spectrum describes variety, not a scale from mild to severe.</li><li>Every autistic person has a unique mix of strengths and support needs.</li><li>Co-occurring health conditions are common and worth looking for.</li></ul></div>
<h2>How FXMed can help</h2>
<p>Many autistic children also live with physical health problems that can go unnoticed, especially when a child finds it hard to say what hurts. Our <a href="/programs/autism-support">Autism Support program</a> works alongside your child’s paediatrician, therapists and school. It does not aim to cure or change autism. It focuses on the physical health issues, such as digestion, nutrition and sleep, that can make everyday life harder.</p>
<p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/01-understanding-autism.webp',
  $p$A mother smiles as her two children draw and build with wooden blocks at the table$p$,
  '4 min read',
  'published',
  '2026-10-29 10:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'understanding-autism-what-the-spectrum-really-means'
);

-- 2. What Causes Autism? Genetics, Environmental Factors, and Common Myths
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$What Causes Autism? Genetics, Environmental Factors, and Common Myths$p$,
  'what-causes-autism-genetics-environment-and-myths',
  $p$What does research actually show about the causes of autism? We explain the role of genetics, prenatal factors, what remains uncertain, and why an association is not the same as a cause.$p$,
  $p$<p>When a child is diagnosed with autism, one of the first questions parents ask is “why?” Many also quietly wonder whether they did something to cause it. The short answer is no. Autism develops through a complex mix of factors, most of which are present before birth, and none of which is a parent’s fault.</p>
<h2>Genetics play the largest part</h2>
<div class="not-prose fx-block"><div class="fx-bars"><div><p class="fx-bar-label"><span>Share of autism likelihood explained by genetics (estimates)</span><span class="fx-bar-value">60–90%</span></p><div class="fx-bar-track"><div class="fx-bar-fill fx-w-75 "></div></div></div></div><p class="fx-source">Estimates from twin and family studies vary between about 60 and 90 percent; the bar shows the middle of that range.</p></div>
<p>Studies of twins and families show that autism is strongly <strong>heritable</strong>. Estimates suggest that genetic factors explain roughly 60 to 90 percent of the differences in who becomes autistic. This does not mean there is a single “autism gene.” Researchers have identified hundreds of genes that each add a small amount to the likelihood of autism, and a smaller number of gene changes that have a larger effect.</p>
<p>Some of these genetic changes are inherited from parents who may have no diagnosis at all. Others are new changes that arise for the first time in the child. This is why autism can appear in a family with no known history of it.</p>
<h2>Factors around pregnancy and birth</h2>
<p>Research has linked some prenatal and birth factors with a higher likelihood of autism. These include:</p>
<ul>
<li>Older parents, particularly an older father</li>
<li>Being born very early or with a very low birth weight</li>
<li>Some health conditions during pregnancy, such as diabetes or a serious infection with fever</li>
<li>Exposure in the womb to certain medicines, most clearly the epilepsy medicine valproate</li>
</ul>
<p>These factors increase the likelihood only slightly for most families. The great majority of children exposed to them are not autistic, and many autistic children had none of them.</p>
<h2>Association is not the same as cause</h2>
<figure class="not-prose fx-block fx-figure"><img src="/blog/autism/graphics/association-vs-cause.svg" alt="Diagram: a shared factor such as genes makes both an exposure and autism more likely, so the exposure and autism look linked even though one does not cause the other." /><figcaption>How a hidden shared factor can make two things look linked when neither causes the other.</figcaption></figure>
<p>Headlines often report that something is “linked to” autism. A link, or <strong>association</strong>, means two things tend to appear together. It does not prove that one causes the other. Often a third factor, such as shared genes or a health condition, explains both.</p>
<p>Paracetamol (acetaminophen) in pregnancy is a good example. Some earlier studies found an association with autism. But when a large Swedish study of nearly 2.5 million children compared brothers and sisters from the same family, so that shared genes and home life were taken into account, the link disappeared. If you are pregnant, talk to your doctor before stopping any medicine you need, as a high fever that is left untreated carries its own risks.</p>
<h2>What remains uncertain</h2>
<p>Scientists still do not fully understand how different genes and early-life factors combine, or why autism looks so different from one person to the next. Research is also exploring areas such as the immune system and the gut microbiome. These are active questions, and you should be cautious of anyone who claims to have found “the cause” or a cure.</p>
<h2>Common myths and concerns</h2>
<ul>
<li><strong>A common concern: “my child changed after their vaccines.”</strong> Many parents first notice signs of autism between 12 and 18 months, the same age children get several routine vaccines, so the timing can feel like more than coincidence. What you saw is real, and any change in your child deserves a doctor’s attention. Large studies following millions of children, including a Danish study of more than 650,000 children, have found autism is just as common in children who were not vaccinated, which tells us vaccines are not the cause.</li>
<li><strong>Myth: poor parenting causes autism.</strong> The old idea of cold “refrigerator mothers” was proven wrong decades ago. Parenting does not cause autism.</li>
<li><strong>Myth: screens or diet cause autism.</strong> There is no good evidence that screen time, gluten, sugar or any food causes autism.</li>
<li><strong>Myth: there is an autism epidemic.</strong> Diagnoses have risen mainly because the definition has broadened and awareness and screening have improved, so more people, including girls and adults, are recognised.</li>
</ul>
<div class="not-prose fx-block fx-callout fx-callout-info"><p class="fx-callout-title">A quick test for any headline</p><p>Ask: did the study compare like with like, for example brothers and sisters from the same family? Did the link survive once shared genes and health were taken into account? If not, it shows an association, not a cause.</p></div>
<h2>Why the cause matters less than support</h2>
<p>Understanding causes helps research and can sometimes guide medical care, for example when a specific genetic condition is found. But for most families, the most useful questions are practical ones: what does my child need, and what support will help them thrive?</p>
<h2>How FXMed can help</h2>
<p>While we cannot change what causes autism, we can help you understand and address health issues that affect how your child feels day to day. Our <a href="/programs/autism-support">Autism Support program</a> works alongside your child’s paediatrician, therapists and school. It does not aim to cure or change autism. It focuses on the physical health issues, such as digestion, nutrition and sleep, that can make everyday life harder.</p><p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/02-causes-and-research.webp',
  $p$A doctor explains a DNA model to a parent across a desk in a bright consulting room$p$,
  '4 min read',
  'published',
  '2026-10-29 09:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'what-causes-autism-genetics-environment-and-myths'
);

-- 3. Early Signs of Autism in Babies and Toddlers: When to Seek Support
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$Early Signs of Autism in Babies and Toddlers: When to Seek Support$p$,
  'early-signs-of-autism-in-babies-and-toddlers',
  $p$Signs of autism can often be seen in the first two years. Learn what to look for in communication, play and behaviour, and how to raise your concerns with a paediatrician.$p$,
  $p$<p>Parents are often the first to notice that something about their child’s development feels different. Trusting that instinct matters. Signs of autism can often be seen before a child’s second birthday, and getting support early can make a real difference to a child’s communication, learning and wellbeing.</p>
<div class="not-prose fx-block"><p class="fx-block-title">Signs to discuss with your doctor, by age</p><div class="fx-timeline"><div class="fx-timeline-item"><span class="fx-timeline-age">6–9 months</span><p class="fx-timeline-body">Few shared smiles or back-and-forth looks with you.</p></div><div class="fx-timeline-item"><span class="fx-timeline-age">12 months</span><p class="fx-timeline-body">Not responding to their name; little babbling, pointing, waving or reaching to be picked up.</p></div><div class="fx-timeline-item"><span class="fx-timeline-age">16 months</span><p class="fx-timeline-body">No single words yet.</p></div><div class="fx-timeline-item"><span class="fx-timeline-age">24 months</span><p class="fx-timeline-body">Not putting two words together on their own, such as “more milk”.</p></div><div class="fx-timeline-item fx-timeline-alert"><span class="fx-timeline-age">Any age</span><p class="fx-timeline-body">Losing words, social skills or other abilities they once had. Speak to a doctor promptly.</p></div></div></div>
<h2>Social communication</h2>
<p>Some of the earliest signs involve how a baby connects and shares attention with others. You might notice that your child:</p>
<ul>
<li>Rarely looks at faces, or seldom shares smiles back and forth by around 6 to 9 months</li>
<li>Does not regularly respond to their name by around 12 months</li>
<li>Rarely babbles back and forth with you</li>
<li>Does not look where you point, or bring things to show you because they want to share them</li>
<li>Seems content to play alone for long periods and is not interested in simple games such as peek-a-boo</li>
</ul>
<h2>Gestures and words</h2>
<p>Gestures come before words and are an important part of communication. Pay attention if your child:</p>
<ul>
<li>Is not pointing, waving or reaching to be picked up by around 12 months</li>
<li>Has no single words by around 16 months</li>
<li>Is not putting two words together on their own, such as “more milk”, by 24 months</li>
<li>Repeats words or phrases they have heard, but rarely uses language to ask for things or share interest</li>
</ul>
<h2>Play</h2>
<p>Autistic toddlers may play in ways that look different. For example, they may line up toys, spin wheels or open and close doors over and over, rather than using toys in pretend play such as feeding a doll. They may also find it hard to copy what others do.</p>
<h2>Repetitive behaviours and sensory differences</h2>
<ul>
<li>Repeated movements, such as hand flapping, rocking or spinning</li>
<li>Strong distress at small changes in routine</li>
<li>Very intense interest in particular objects or parts of objects</li>
<li>Unusual reactions to sounds, textures, lights or smells, such as covering ears or refusing certain clothes or foods</li>
</ul>
<h2>Loss of skills needs prompt attention</h2>
<p>If your child <strong>loses words, social skills or other abilities</strong> they used to have, at any age, speak to a doctor promptly. Loss of skills can happen in autism, but it can also be a sign of other medical conditions that need to be checked.</p>
<h2>Remember: one sign is not a diagnosis</h2>
<p>Every child develops at their own pace. Many children show one or two of these signs and are not autistic. What matters is the overall pattern, especially in social communication. If you are unsure, it is always better to ask than to “wait and see.”</p>
<h2>How to talk to your paediatrician</h2>
<div class="not-prose fx-block"><div class="fx-steps"><div class="fx-step"><p class="fx-step-title">Write things down</p><p class="fx-step-text">Note what you have seen, when it started and how often it happens.</p></div><div class="fx-step"><p class="fx-step-title">Take short videos</p><p class="fx-step-text">A clip of your child at home shows what a clinic visit may not.</p></div><div class="fx-step"><p class="fx-step-title">Ask about screening</p><p class="fx-step-text">Tools such as the M-CHAT-R/F are designed for toddlers aged 16 to 30 months.</p></div><div class="fx-step"><p class="fx-step-title">Ask for a hearing test</p><p class="fx-step-text">Hearing problems can affect speech and responding to name.</p></div><div class="fx-step"><p class="fx-step-title">Ask what happens next</p><p class="fx-step-text">Request a developmental assessment and early speech or developmental support.</p></div></div></div>
<p>If you feel your concerns are being dismissed, it is reasonable to ask for a second opinion. You know your child best.</p>
<h2>How FXMed can help</h2>
<p>If your child is autistic or being assessed, we can look at physical health factors, such as digestion, sleep and nutrition, that can affect how they feel and behave. Our <a href="/programs/autism-support">Autism Support program</a> works alongside your child’s paediatrician, therapists and school. It does not aim to cure or change autism. It focuses on the physical health issues, such as digestion, nutrition and sleep, that can make everyday life harder.</p><p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/03-early-signs.webp',
  $p$A father sits on the floor playing with stacking toys alongside his toddler$p$,
  '4 min read',
  'published',
  '2026-10-29 08:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'early-signs-of-autism-in-babies-and-toddlers'
);

-- 4. Developmental Milestones: What to Track and When to Ask for an Evaluation
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$Developmental Milestones: What to Track and When to Ask for an Evaluation$p$,
  'developmental-milestones-what-to-track-and-when-to-ask-for-an-evaluation',
  $p$A practical guide to speech, movement, play and social milestones from 6 months to 5 years, how much variation is normal, and when to ask for a developmental evaluation.$p$,
  $p$<p>Milestones are the skills most children develop by a certain age, such as smiling, walking, talking and playing with others. Tracking them helps you notice early if your child might need extra support. But milestones are a guide, not a race. Children develop at different speeds, and missing one milestone on its own is rarely a cause for alarm.</p>
<h2>The four areas to watch</h2>
<ul>
<li><strong>Communication:</strong> babbling, understanding words, talking and using gestures</li>
<li><strong>Movement:</strong> sitting, crawling, walking, running and using hands</li>
<li><strong>Play and thinking:</strong> exploring, copying, pretend play and solving simple problems</li>
<li><strong>Social and emotional:</strong> smiling, sharing attention, playing with others and managing feelings</li>
</ul>
<h2>Milestones by age</h2>
<p>The skills below are ones that most children, around three out of four, can do by each age.</p>
<div class="not-prose fx-block"><p class="fx-block-title">Milestones at a glance</p><div class="fx-table-wrap"><table class="fx-table"><thead><tr><th scope="col">Age</th><th scope="col">Communication</th><th scope="col">Movement</th><th scope="col">Play and social</th></tr></thead><tbody><tr><td>6 months</td><td>Laughs, squeals and takes turns making sounds</td><td>Rolls from tummy to back; reaches for toys</td><td>Knows familiar people</td></tr><tr><td>12 months</td><td>Waves bye-bye; says “mama” or “dada”</td><td>Pulls to stand; walks holding furniture</td><td>Plays peek-a-boo</td></tr><tr><td>18 months</td><td>Says three or more words; points to show you things</td><td>Walks alone; tries a spoon</td><td>Copies you doing chores</td></tr><tr><td>2 years</td><td>Puts two words together</td><td>Kicks a ball; runs</td><td>Notices when others are hurt or upset</td></tr><tr><td>3 years</td><td>Holds a short back-and-forth conversation</td><td>Draws a circle when shown</td><td>Joins other children to play</td></tr><tr><td>4–5 years</td><td>Tells stories in sentences</td><td>Hops on one foot</td><td>Pretend play; takes turns in games</td></tr></tbody></table></div></div>
<h3>By 6 months</h3>
<ul>
<li>Laughs and makes squealing sounds; takes turns making sounds with you</li>
<li>Knows familiar people; likes to look at themselves in a mirror</li>
<li>Rolls from tummy to back; reaches for and grabs toys</li>
</ul>
<h3>By 12 months</h3>
<ul>
<li>Waves bye-bye; calls a parent “mama”, “dada” or a similar special name</li>
<li>Plays games like peek-a-boo; looks for things they see you hide</li>
<li>Pulls up to stand; walks holding onto furniture</li>
</ul>
<h3>By 18 months</h3>
<ul>
<li>Tries to say three or more words besides “mama” or “dada”</li>
<li>Points to show you something interesting; copies you doing chores</li>
<li>Walks without holding on; tries to use a spoon</li>
</ul>
<h3>By 2 years</h3>
<ul>
<li>Says at least two words together, such as “more milk”</li>
<li>Points to things in a book when you ask; notices when others are hurt or upset</li>
<li>Kicks a ball; runs; plays with more than one toy at once</li>
</ul>
<h3>By 3 years</h3>
<ul>
<li>Talks with you in conversation using at least two back-and-forth exchanges</li>
<li>Notices other children and joins them to play</li>
<li>Draws a circle when shown how; puts on some clothes by themselves</li>
</ul>
<h3>By 4 to 5 years</h3>
<ul>
<li>Tells stories and talks about their day in sentences</li>
<li>Pretends to be something else during play, such as a teacher or a superhero</li>
<li>Follows rules or takes turns in simple games; hops on one foot</li>
</ul>
<h2>Individual variation is normal</h2>
<p>Some children walk early and talk late; others do the opposite. Children who were born early may reach milestones later, and doctors usually use their “corrected” age until about age 2. Children growing up with more than one language may mix languages or say fewer words in each one, but they should reach overall communication milestones on time. Speaking more than one language does not cause speech delay.</p>
<h2>When to ask for an evaluation</h2>
<p>Speak to your paediatrician or a developmental specialist if:</p>
<ul>
<li>Your child is not meeting several milestones for their age</li>
<li>Your child is behind in social communication, such as pointing, sharing attention or responding to their name</li>
<li>Your child is behind in more than one area, such as speech and movement</li>
<li>You have a strong feeling that something is not right, even if you cannot explain why</li>
</ul>
<div class="not-prose fx-block fx-callout fx-callout-info"><p class="fx-callout-title">Speaking more than one language</p><p>Bilingual children may say fewer words in each language, but their total across languages should be on track. Speaking more than one language does not cause speech delay.</p></div>
<h2>Loss of skills: do not wait</h2>
<div class="not-prose fx-block fx-callout fx-callout-warn"><p class="fx-callout-title">Never a normal part of development</p><p>If your child loses words, eye contact, play or walking skills they once had, ask for a prompt medical review.</p></div>
<p>If your child <strong>loses a skill they once had</strong>, such as words, eye contact, play or walking, ask for a prompt medical review. Loss of skills is never a normal part of development. It can occur in autism, but it can also point to hearing problems, seizures or other medical conditions that need investigating.</p>
<h2>Tips for tracking</h2>
<ul>
<li>Use a milestone checklist or app every few months, and keep notes and short videos.</li>
<li>Take your notes to every routine check-up.</li>
<li>Remember that early support, such as speech therapy, can start before any diagnosis is made.</li>
</ul>
<h2>How FXMed can help</h2>
<p>Alongside developmental support, good sleep, nutrition and digestive health help every child do their best. Our <a href="/programs/autism-support">Autism Support program</a> works alongside your child’s paediatrician, therapists and school. It does not aim to cure or change autism. It focuses on the physical health issues, such as digestion, nutrition and sleep, that can make everyday life harder.</p><p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/04-developmental-milestones.webp',
  $p$A toddler stacks wooden blocks while her mother watches and smiles$p$,
  '4 min read',
  'published',
  '2026-10-29 07:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'developmental-milestones-what-to-track-and-when-to-ask-for-an-evaluation'
);

-- 5. Autism Screening vs. Diagnosis: What Parents Can Expect
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$Autism Screening vs. Diagnosis: What Parents Can Expect$p$,
  'autism-screening-vs-diagnosis-what-parents-can-expect',
  $p$Screening and diagnosis are different steps. Learn what screening questionnaires show, what happens in a full assessment, and how to access early support while you wait.$p$,
  $p$<p>Hearing that your child has “screened positive” for autism can feel frightening. It helps to know that screening and diagnosis are two separate steps. A screening tool can tell you whether a closer look is needed. It cannot tell you whether your child is autistic.</p>
<div class="not-prose fx-block"><p class="fx-block-title">Screening vs diagnosis</p><div class="fx-compare"><div class="fx-compare-col "><p class="fx-compare-title">Screening</p><ul><li>A quick questionnaire, often the M-CHAT-R/F</li><li>Usually done at 18 and 24 months, or whenever there is a concern</li><li>Shows whether a closer look is needed</li><li>Cannot tell you if your child is autistic</li></ul></div><div class="fx-compare-col fx-compare-dark"><p class="fx-compare-title">Diagnosis</p><ul><li>A full assessment by a trained specialist</li><li>History, observation, reports from others and other checks</li><li>Can confirm autism or find another explanation</li><li>Leads to a written report and a plan</li></ul></div></div></div>
<h2>What is screening?</h2>
<p>Screening is a quick check, usually a questionnaire, to find children who may need a fuller assessment. Many paediatricians recommend autism screening at routine visits around <strong>18 and 24 months</strong>, and at any time a parent or doctor has concerns.</p>
<p>The most widely used tool for toddlers is the <strong>M-CHAT-R/F</strong> (Modified Checklist for Autism in Toddlers, Revised with Follow-Up). Parents answer 20 simple yes-or-no questions about their child’s everyday behaviour, such as whether they point to show you things or respond to their name. If the score suggests a concern, the doctor asks follow-up questions to clarify the answers.</p>
<h2>What a screening result means</h2>
<ul>
<li><strong>A positive screen</strong> means your child should have a full developmental assessment. Some children who screen positive are not autistic, but many have another developmental need, such as a language delay, that still deserves support.</li>
<li><strong>A negative screen</strong> is reassuring, but it does not rule autism out. If you are still concerned, say so. No screening tool catches every child.</li>
</ul>
<h2>What is a diagnostic assessment?</h2>
<p>A diagnosis is made by a trained specialist, such as a developmental paediatrician, child psychiatrist, clinical psychologist or a team of professionals. A full assessment usually includes:</p>
<ul>
<li><strong>A detailed developmental history.</strong> The specialist will ask about pregnancy, birth, early milestones, play, communication, behaviour, sleep, eating and family history.</li>
<li><strong>Observation and structured play.</strong> Tools such as the ADOS-2 use play and conversation to observe social communication and behaviour in a consistent way.</li>
<li><strong>Information from others.</strong> Reports from nursery, school or therapists show how your child manages in different settings.</li>
<li><strong>Other checks.</strong> A hearing test, and sometimes speech and language, cognitive or motor assessments, help build a full picture and rule out other explanations.</li>
</ul>
<p>Assessments can take place over one long visit or several shorter ones. You may receive the outcome on the day or at a follow-up meeting, along with a written report.</p>
<div class="not-prose fx-block"><p class="fx-block-title">The journey from concern to support</p><div class="fx-steps"><div class="fx-step"><p class="fx-step-title">A concern</p><p class="fx-step-text">You, your doctor or nursery notice something.</p></div><div class="fx-step"><p class="fx-step-title">Screening</p><p class="fx-step-text">A short questionnaire checks whether to look closer.</p></div><div class="fx-step"><p class="fx-step-title">Assessment</p><p class="fx-step-text">A specialist gathers history and observes your child.</p></div><div class="fx-step"><p class="fx-step-title">Outcome</p><p class="fx-step-text">A diagnosis, another explanation, or a plan to review.</p></div><div class="fx-step"><p class="fx-step-title">Support</p><p class="fx-step-text">Therapy and help that fit your child’s needs.</p></div></div></div>
<h2>Possible outcomes</h2>
<ul>
<li>An autism diagnosis, often with a description of your child’s strengths and support needs</li>
<li>A different diagnosis, such as a language disorder, ADHD or global developmental delay</li>
<li>No diagnosis now, with a plan to review your child’s development later</li>
</ul>
<h2>How to prepare</h2>
<ul>
<li>Bring notes about your concerns and any milestone records.</li>
<li>Bring short videos of your child at home, especially of behaviours that worry you.</li>
<li>Bring reports from nursery, school or therapists.</li>
<li>Write down your questions in advance. It is easy to forget them on the day.</li>
</ul>
<h2>Do not wait for a diagnosis to get support</h2>
<div class="not-prose fx-block fx-callout "><p class="fx-callout-title">Support can start now</p><p>Speech and language therapy, occupational therapy and parent coaching can all begin based on your child’s needs, before any diagnosis.</p></div>
<p>Waiting lists for assessments can be long. The good news is that <strong>your child does not need a diagnosis to start getting help</strong>. Speech and language therapy, occupational therapy and parent coaching can all begin based on your child’s needs. Early support helps, whatever the final outcome.</p>
<h2>After a diagnosis</h2>
<p>A diagnosis can bring relief, grief, or both. Take your time. Ask the specialist for a written plan, information about local support and parent groups, and advice on any medical checks that are recommended, such as genetic testing. Your child is the same child they were before the assessment. You now simply have a better map for supporting them.</p>
<h2>How FXMed can help</h2>
<p>Once your child has a diagnosis or is waiting for one, we can help you look after their physical health. Our <a href="/programs/autism-support">Autism Support program</a> works alongside your child’s paediatrician, therapists and school. It does not aim to cure or change autism. It focuses on the physical health issues, such as digestion, nutrition and sleep, that can make everyday life harder.</p><p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/05-screening-and-diagnosis.webp',
  $p$A clinician with a clipboard talks with a mother while a toddler plays with toys nearby$p$,
  '4 min read',
  'published',
  '2026-10-29 06:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'autism-screening-vs-diagnosis-what-parents-can-expect'
);

-- 6. Lab Testing and Autism: What Tests Can—and Cannot—Tell You
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$Lab Testing and Autism: What Tests Can—and Cannot—Tell You$p$,
  'lab-testing-and-autism-what-tests-can-and-cannot-tell-you',
  $p$No blood test can diagnose autism. Learn how genetic testing may inform care, when other lab tests are useful, and which tests to be cautious about.$p$,
  $p$<p>Parents are often surprised to learn that there is no blood, urine or brain scan test that can diagnose autism. Autism is diagnosed by trained specialists who look at a child’s development and behaviour. Lab tests still have an important role, though. They can help explain why a child is autistic in some cases, and they can find other health problems that affect how a child feels.</p>
<div class="not-prose fx-block"><p class="fx-block-title">Lab tests at a glance</p><div class="fx-compare"><div class="fx-compare-col fx-compare-good"><p class="fx-compare-title">What tests can do</p><ul><li>Find a genetic explanation in some children</li><li>Check hearing and vision</li><li>Find low iron, vitamin D and other nutrients</li><li>Investigate digestive symptoms, seizures or poor growth</li></ul></div><div class="fx-compare-col fx-compare-caution"><p class="fx-compare-title">What tests cannot do</p><ul><li>Diagnose or rule out autism</li><li>Measure how autistic a child is</li><li>Point to a single cause for most children</li><li>Justify unproven treatments</li></ul></div></div></div>
<h2>Why no test can diagnose autism</h2>
<p>Autism is defined by patterns of communication, social interaction and behaviour, not by a single biological marker. Many different genes and early-life factors contribute, and they differ from one person to the next. Researchers are studying possible biomarkers, but none is accurate enough to diagnose autism today. Be wary of any service offering a test that claims to diagnose or rule out autism.</p>
<h2>Genetic testing</h2>
<p>After a diagnosis, many specialists recommend genetic testing, especially if a child also has intellectual disability, developmental delay, unusual physical features, seizures or a family history of related conditions. Common tests include:</p>
<ul>
<li><strong>Chromosomal microarray</strong>, which looks for missing or extra pieces of genetic material</li>
<li><strong>Fragile X testing</strong>, for the most common inherited cause of intellectual disability</li>
<li><strong>Exome or genome sequencing</strong>, which reads many genes at once and is increasingly used as a first test</li>
</ul>
<p>These tests find a specific genetic explanation in a minority of autistic children. When they do, it can help families understand related health risks to monitor, such as heart or kidney problems with some conditions, make informed decisions about future pregnancies, and connect with families affected by the same condition. A genetic counsellor can explain results and what they mean for the wider family.</p>
<h2>Tests for other health concerns</h2>
<p>Autistic children have higher rates of some physical health problems, and these can be harder to spot when a child struggles to describe how they feel. Depending on symptoms, a doctor may suggest:</p>
<ul>
<li><strong>Hearing and vision tests</strong> for every child with communication concerns</li>
<li><strong>Blood count and iron levels (ferritin)</strong> if a child eats a very limited diet, seems tired or sleeps restlessly. Low iron is common and can disturb sleep.</li>
<li><strong>Vitamin D and other nutrient levels</strong> when diet is very restricted</li>
<li><strong>Lead testing</strong> if a child often mouths or eats non-food items (pica)</li>
<li><strong>Thyroid tests</strong> if there are signs such as poor growth or constipation with tiredness</li>
<li><strong>Stool tests</strong> to look for infection, inflammation or other causes of ongoing diarrhoea, tummy pain or blood in stools</li>
<li><strong>An EEG</strong> if there are signs of seizures, such as staring spells or sudden loss of skills</li>
<li><strong>Metabolic tests</strong> if there is regression, poor growth, seizures or other features that suggest a rare metabolic condition</li>
</ul>
<p>The aim of these tests is not to explain or treat autism itself. It is to find and treat problems that are making a child uncomfortable or unwell.</p>
<div class="not-prose fx-block"><p class="fx-block-title">Tests for other health concerns</p><div class="fx-table-wrap"><table class="fx-table"><thead><tr><th scope="col">Test</th><th scope="col">When it may help</th></tr></thead><tbody><tr><td>Hearing and vision</td><td>Every child with communication concerns</td></tr><tr><td>Iron (ferritin)</td><td>Limited diet, tiredness or restless sleep</td></tr><tr><td>Vitamin D</td><td>Very restricted diet or little time outdoors</td></tr><tr><td>Lead</td><td>Often mouths or eats non-food items (pica)</td></tr><tr><td>Thyroid</td><td>Poor growth, or constipation with tiredness</td></tr><tr><td>Stool tests</td><td>Ongoing diarrhoea, tummy pain or blood in stools</td></tr><tr><td>EEG</td><td>Staring spells or sudden loss of skills</td></tr></tbody></table></div></div>
<h2>Tests to be cautious about</h2>
<div class="not-prose fx-block"><div class="fx-ratings"><div class="fx-rating fx-rating-red"><p class="fx-rating-label">Not reliable</p><p class="fx-rating-title">Hair mineral analysis</p><p class="fx-rating-text">Does not accurately measure nutrient or toxin levels.</p></div><div class="fx-rating fx-rating-red"><p class="fx-rating-label">Not reliable</p><p class="fx-rating-title">IgG food panels</p><p class="fx-rating-text">Mostly reflect foods eaten recently, not allergies.</p></div><div class="fx-rating fx-rating-dark"><p class="fx-rating-label">Avoid</p><p class="fx-rating-title">Provoked heavy-metal tests</p><p class="fx-rating-text">Often used to justify chelation, which has caused deaths.</p></div></div></div>
<p>Some tests are marketed directly to parents of autistic children but are not supported by good evidence. These include:</p>
<ul>
<li><strong>Hair mineral analysis</strong>, which is not a reliable measure of nutrient or toxin levels</li>
<li><strong>IgG “food sensitivity” panels</strong>, which mostly reflect foods a child has eaten recently, not true allergies or intolerances</li>
<li><strong>“Provoked” urine tests for heavy metals</strong>, which can produce misleading results. These are often used to justify chelation, which has caused serious harm, including deaths.</li>
</ul>
<p>If you are offered a test, ask: what will this result change about my child’s care? If the answer is unclear, the test may not be worth the cost or the needle.</p>
<h2>Questions to ask your doctor</h2>
<ul>
<li>Why are you recommending this test, and what are you looking for?</li>
<li>What will we do differently depending on the result?</li>
<li>Is genetic testing recommended for my child, and can we see a genetic counsellor?</li>
<li>Are there symptoms, such as sleep, bowel or eating problems, that we should investigate?</li>
</ul>
<h2>How FXMed can help</h2>
<p>We use targeted testing, such as nutrient levels and stool analysis, only when a child’s symptoms suggest it, and we explain what every result means for their care. Our <a href="/programs/autism-support">Autism Support program</a> works alongside your child’s paediatrician, therapists and school. It does not aim to cure or change autism. It focuses on the physical health issues, such as digestion, nutrition and sleep, that can make everyday life harder.</p><p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/06-lab-testing.webp',
  $p$Sample tubes and a DNA model on a clinic desk$p$,
  '4 min read',
  'published',
  '2026-10-29 05:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'lab-testing-and-autism-what-tests-can-and-cannot-tell-you'
);

-- 7. Speech Delay or Autism? Understanding Communication Differences
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$Speech Delay or Autism? Understanding Communication Differences$p$,
  'speech-delay-or-autism-understanding-communication-differences',
  $p$Many toddlers talk late, and not all of them are autistic. Learn how speech delay and autism overlap, what sets them apart, and why hearing and developmental checks matter.$p$,
  $p$<p>“He’s not talking yet. Is it autism?” It is one of the most common questions parents ask. Speech delay and autism can look similar at first, and they sometimes occur together. But a speech delay on its own does not mean a child is autistic. Understanding the difference helps you get the right support sooner.</p>
<h2>What is a speech delay?</h2>
<p>A child has a speech or language delay when they are developing words and sentences more slowly than expected for their age. Some children, often called “late talkers”, catch up by themselves by around age 3. Others need speech and language therapy. Speech delay can stand alone or be part of a wider picture, such as hearing loss, a language disorder or autism.</p>
<h2>Where speech delay and autism overlap</h2>
<p>Many autistic children start talking late, and some use few or no spoken words. Both groups may:</p>
<ul>
<li>Say fewer words than other children their age</li>
<li>Get frustrated when they cannot make themselves understood</li>
<li>Find it hard to follow longer instructions</li>
</ul>
<h2>Differences that can help tell them apart</h2>
<figure class="not-prose fx-block fx-figure"><img src="/blog/autism/graphics/speech-delay-vs-autism.svg" alt="Venn diagram. Speech delay alone: points and waves, shows you toys, looks between you and an object, enjoys social games. Autism: fewer gestures, repeats phrases, repetitive play, sensory differences. Both: fewer and later words, frustration, benefits from speech therapy." /><figcaption>Where speech delay and autism overlap, and the social communication differences that often set them apart. These are general patterns, not rules.</figcaption></figure>
<p>The biggest clue is usually <strong>social communication</strong>, meaning the drive and ability to connect and share with others, with or without words.</p>
<ul>
<li><strong>Children with a speech delay alone</strong> usually make up for missing words in other ways. They point to show you things, use gestures like waving and nodding, look back and forth between you and an object, bring you toys to share, and enjoy social games.</li>
<li><strong>Autistic children</strong> more often use fewer gestures and less eye contact, rarely point to share interest, may lead you by the hand to what they want, and may not respond to their name. They may also repeat words or whole phrases from songs or shows (echolalia), and show repetitive behaviours or strong sensory reactions.</li>
</ul>
<p>These are general patterns, not rules. Some autistic children are very affectionate and social, and some children with language disorders have social difficulties too. That is why a professional assessment matters.</p>
<h2>Always check hearing first</h2>
<div class="not-prose fx-block fx-callout fx-callout-warn"><p class="fx-callout-title">Before anything else: a hearing test</p><p>A child who reacts to some sounds can still have hearing loss. Fluid in the middle ear after repeated infections can muffle sound for months.</p></div>
<p>Hearing problems are a common and treatable cause of speech delay. Fluid in the middle ear (glue ear) after repeated ear infections can muffle sound for months. Any child with delayed speech, or who does not respond to their name, should have a <strong>proper hearing test</strong>. A child who reacts to some sounds can still have hearing loss.</p>
<h2>Growing up with more than one language</h2>
<p>Many children in Nigeria hear two or more languages at home. This is a strength, not a cause of delay. Bilingual children may mix languages or know some words in only one language, but their total vocabulary across languages should be on track. If a bilingual child is behind in all their languages, they should be assessed like any other child.</p>
<h2>Who can help</h2>
<ul>
<li><strong>Your paediatrician</strong> can review development, screen for autism and arrange a hearing test.</li>
<li><strong>A speech and language therapist</strong> can assess your child’s understanding, use of language and communication and start therapy.</li>
<li><strong>A developmental paediatrician or psychologist</strong> can carry out a full developmental or autism assessment if needed.</li>
</ul>
<h2>Do not wait and see</h2>
<p>If your child is not using single words by around 16 months or two-word phrases by 24 months, or if they lose words they once used, ask for an assessment. Speech therapy can start right away and helps children whether or not they turn out to be autistic.</p>
<h2>What you can do at home</h2>
<div class="not-prose fx-block"><div class="fx-steps"><div class="fx-step"><p class="fx-step-title">Narrate</p><p class="fx-step-text">Talk about what your child is looking at or doing in short phrases.</p></div><div class="fx-step"><p class="fx-step-title">Wait</p><p class="fx-step-text">Give time to respond, and celebrate every attempt, including gestures.</p></div><div class="fx-step"><p class="fx-step-title">Read daily</p><p class="fx-step-text">Point to and name pictures together.</p></div><div class="fx-step"><p class="fx-step-title">Turn it down</p><p class="fx-step-text">Switch off background TV during play and meals.</p></div></div></div>
<h2>How FXMed can help</h2>
<p>If your child is autistic, we can support the physical side of their health, such as digestion, sleep and nutrition, which affects comfort, mood and readiness to learn. Our <a href="/programs/autism-support">Autism Support program</a> works alongside your child’s paediatrician, therapists and school. It does not aim to cure or change autism. It focuses on the physical health issues, such as digestion, nutrition and sleep, that can make everyday life harder.</p><p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/07-speech-delay.webp',
  $p$A father reads a picture book with his young child as they lie on the floor$p$,
  '4 min read',
  'published',
  '2026-10-29 04:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'speech-delay-or-autism-understanding-communication-differences'
);

-- 8. Speech Therapy for Autistic Children: Supporting Communication in Every Form
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$Speech Therapy for Autistic Children: Supporting Communication in Every Form$p$,
  'speech-therapy-for-autistic-children-supporting-communication',
  $p$Good speech therapy is about communication, not just speech. Learn how therapists set individual goals, use play, and support gestures, pictures and AAC devices.$p$,
  $p$<p>Speech and language therapy is one of the most common supports for autistic children. But the goal is not simply to get a child talking. Good therapy helps a child <strong>communicate</strong>, to make requests, share ideas, refuse things, ask for help and connect with others, in whatever way works best for them.</p>
<h2>What does a speech and language therapist do?</h2>
<p>A speech and language therapist (SLT), also called a speech-language pathologist, assesses how a child understands and uses language, including speech, gestures, facial expression and play. For autistic children, therapy often focuses on:</p>
<ul>
<li>Understanding words, instructions and everyday routines</li>
<li>Expressing needs, choices and feelings</li>
<li>Shared attention, such as looking at and enjoying the same thing as another person</li>
<li>Back-and-forth interaction, turn-taking and play</li>
<li>Social communication, such as starting conversations and understanding others’ points of view</li>
<li>Feeding and swallowing, in some cases</li>
</ul>
<div class="not-prose fx-block"><p class="fx-block-title">What therapy can focus on</p><div class="fx-chips"><span class="fx-chip">Understanding</span><span class="fx-chip">Making requests</span><span class="fx-chip">Sharing attention</span><span class="fx-chip">Turn-taking</span><span class="fx-chip">Starting conversations</span><span class="fx-chip">Feeding and swallowing</span></div></div>
<h2>Goals should fit the individual child</h2>
<p>There is no single programme that suits every autistic child. A good therapist sets goals with you, based on what matters most in your child’s daily life. For one child, that might be asking for a drink without becoming distressed. For another, it might be joining a game at school. Goals should build on your child’s strengths and interests, and they should be reviewed regularly.</p>
<h2>Play-based approaches</h2>
<p>Young children learn best through play. Many effective approaches, sometimes called naturalistic developmental behavioural interventions, use everyday play and routines to build communication. Therapists may:</p>
<ul>
<li>Follow the child’s lead and join in with what interests them</li>
<li>Set up situations that create a reason to communicate, such as placing a favourite toy in sight but out of reach</li>
<li>Model simple words and gestures that match what the child is doing</li>
<li>Pause expectantly to give the child a chance to respond</li>
</ul>
<p>Parents are often coached to use these strategies at home. This matters, because children spend far more time with family than in therapy sessions.</p>
<h2>Gestures, signs and echolalia</h2>
<p>Gestures and signs are valuable stepping stones and can reduce frustration quickly. Many autistic children also use <strong>echolalia</strong>, repeating words or phrases they have heard. This is often a real attempt to communicate. For example, a child who says “Do you want a biscuit?” may mean “I want a biscuit.” Therapists help families understand and build on this, rather than trying to stop it.</p>
<h2>AAC: augmentative and alternative communication</h2>
<p>AAC means any way of communicating that adds to or replaces speech. It includes:</p>
<div class="not-prose fx-block"><p class="fx-block-title">AAC: from no-tech to high-tech</p><div class="fx-steps"><div class="fx-step"><p class="fx-step-title">Gestures and signs</p><p class="fx-step-text">No equipment needed; quick to start.</p></div><div class="fx-step"><p class="fx-step-title">Picture cards and boards</p><p class="fx-step-text">Low-tech: point to or hand over a picture, as in PECS.</p></div><div class="fx-step"><p class="fx-step-title">Tablet apps</p><p class="fx-step-text">High-tech: touch a symbol and the tablet speaks.</p></div><div class="fx-step"><p class="fx-step-title">Speech-generating devices</p><p class="fx-step-text">Dedicated devices built for everyday communication.</p></div></div></div>
<ul>
<li><strong>Low-tech options:</strong> picture cards, communication boards, choice cards and picture exchange systems such as PECS</li>
<li><strong>High-tech options:</strong> tablets with communication apps and dedicated speech-generating devices that speak a word aloud when a picture is touched</li>
</ul>
<p>Many parents worry that AAC will stop their child from learning to talk. Research shows the opposite. <strong>AAC does not hold back speech</strong>, and for many children it supports spoken language. Most importantly, it gives a child a voice right now. Children learn AAC best when the adults around them use it too, by touching the symbols as they talk.</p>
<div class="not-prose fx-block fx-callout fx-callout-info"><p class="fx-callout-title">Does AAC stop children talking?</p><p>No. Research shows AAC does not hold back speech, and for many children it supports spoken language. Most importantly, it gives a child a voice right now.</p></div>
<h2>Signs of good therapy</h2>
<div class="not-prose fx-block fx-takeaways"><p class="fx-block-title">Checklist</p><ul><li>Your child is generally happy and engaged during sessions.</li><li>Goals are clear, meaningful and shared with you in writing.</li><li>The therapist respects all forms of communication, not only speech.</li><li>You receive practical ideas to use at home.</li><li>Progress is reviewed, and goals change as your child grows.</li></ul></div>
<h2>Everyday ideas for home</h2>
<ul>
<li>Get down to your child’s level and join their play.</li>
<li>Use short phrases, one or two words longer than your child uses.</li>
<li>Offer choices: “banana or apple?” with the items in view.</li>
<li>Wait. Count to ten in your head to give your child time to respond.</li>
<li>Celebrate every attempt to communicate, in any form.</li>
</ul>
<h2>How FXMed can help</h2>
<p>Communication is easier when a child is comfortable and well rested. We help families address the tummy troubles, sleep problems and nutrient gaps that can get in the way. Our <a href="/programs/autism-support">Autism Support program</a> works alongside your child’s paediatrician, therapists and school. It does not aim to cure or change autism. It focuses on the physical health issues, such as digestion, nutrition and sleep, that can make everyday life harder.</p><p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/08-speech-therapy.webp',
  $p$A therapist helps a young girl use a picture-based communication app on a tablet$p$,
  '4 min read',
  'published',
  '2026-10-29 03:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'speech-therapy-for-autistic-children-supporting-communication'
);

-- 9. Autism and Nutrition: Selective Eating, Nutrient Needs, and Supplement Claims
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$Autism and Nutrition: Selective Eating, Nutrient Needs, and Supplement Claims$p$,
  'autism-and-nutrition-selective-eating-nutrient-needs-and-supplement-claims',
  $p$Many autistic children eat a very limited range of foods. Learn why, which nutrients to watch, how to widen the diet gently, and what the evidence says about special diets and supplements.$p$,
  $p$<p>Mealtimes can be one of the hardest parts of the day for families of autistic children. Research suggests autistic children are around five times more likely than other children to have feeding challenges, from eating only a handful of foods to refusing whole food groups. Understanding why this happens is the first step to helping.</p>
<h2>Why selective eating is common</h2>
<div class="not-prose fx-block"><p class="fx-block-title">Relative likelihood of feeding challenges</p><div class="fx-bars"><div><p class="fx-bar-label"><span>Other children</span><span class="fx-bar-value">1×</span></p><div class="fx-bar-track"><div class="fx-bar-fill fx-w-20 fx-bar-muted"></div></div></div><div><p class="fx-bar-label"><span>Autistic children</span><span class="fx-bar-value">about 5×</span></p><div class="fx-bar-track"><div class="fx-bar-fill fx-w-100 fx-bar-accent"></div></div></div></div><p class="fx-source">Sharp et al., Journal of Autism and Developmental Disorders, 2013</p></div>
<ul>
<li><strong>Sensory differences.</strong> Taste, texture, smell, temperature and even colour can feel much stronger. A lumpy sauce or a mixed plate can be genuinely unpleasant.</li>
<li><strong>A need for sameness.</strong> Familiar foods feel safe and predictable. A child may only accept one brand, or food served in a particular way.</li>
<li><strong>Digestive discomfort.</strong> Constipation, reflux or tummy pain can make eating unpleasant and narrow the diet further.</li>
<li><strong>Oral motor difficulties.</strong> Some children find chewing certain textures hard work.</li>
<li><strong>Anxiety.</strong> Pressure at mealtimes can make a child more resistant to new foods.</li>
</ul>
<p>When eating is very restricted and affects growth, nutrition or daily life, doctors may diagnose avoidant/restrictive food intake disorder (ARFID), which benefits from specialist feeding support.</p>
<h2>Nutrients to watch</h2>
<p>Children who eat a limited diet can be low in key nutrients, even if they are growing well. The most common concerns are:</p>
<ul>
<li><strong>Iron:</strong> needed for energy, focus and healthy sleep</li>
<li><strong>Vitamin D and calcium:</strong> important for strong bones, especially on dairy-free diets</li>
<li><strong>Fibre and fluids:</strong> low intake often leads to constipation</li>
<li><strong>Zinc:</strong> low levels can affect appetite and taste</li>
<li><strong>Vitamin C:</strong> rare but serious deficiency (scurvy) has been reported in children who eat no fruit or vegetables</li>
<li><strong>Omega-3 fats:</strong> found in oily fish, which many children refuse</li>
</ul>
<p>A blood test can show what is actually low, so supplements can be targeted rather than guessed.</p>
<div class="not-prose fx-block"><p class="fx-block-title">Nutrients to watch</p><div class="fx-chips"><span class="fx-chip fx-chip-strong">Iron</span><span class="fx-chip fx-chip-strong">Vitamin D</span><span class="fx-chip fx-chip-strong">Calcium</span><span class="fx-chip">Fibre</span><span class="fx-chip">Zinc</span><span class="fx-chip">Vitamin C</span><span class="fx-chip">Omega-3</span></div></div>
<h2>Gently widening the diet</h2>
<ul>
<li><strong>Keep mealtimes calm.</strong> Remove pressure, bribes and battles. Your job is to offer food; your child decides how much to eat.</li>
<li><strong>Always include a safe food.</strong> Put one food your child already eats on every plate, next to small amounts of others.</li>
<li><strong>Use food chaining.</strong> Make small steps from accepted foods, for example from one brand of crackers to another, then to a similar crispy food.</li>
<li><strong>Allow exploration.</strong> Touching, smelling, licking and helping to cook all count as progress.</li>
<li><strong>Be patient.</strong> A child may need to see a new food 15 times or more before trying it.</li>
</ul>
<div class="not-prose fx-block"><p class="fx-block-title">Food chaining: one small step at a time</p><div class="fx-steps"><div class="fx-step"><p class="fx-step-title">Safe food</p><p class="fx-step-text">Plain crackers your child already loves.</p></div><div class="fx-step"><p class="fx-step-title">Small change</p><p class="fx-step-text">A different brand of a similar cracker.</p></div><div class="fx-step"><p class="fx-step-title">New flavour</p><p class="fx-step-text">A lightly seasoned cracker or crispbread.</p></div><div class="fx-step"><p class="fx-step-title">New food</p><p class="fx-step-text">A crunchy food with the same feel, such as toast fingers.</p></div></div></div>
<p>A dietitian and a feeding therapist (often an occupational or speech and language therapist) can create a plan that fits your child’s sensory needs.</p>
<h2>Special diets: what the evidence says</h2>
<p>Gluten-free, casein-free (dairy-free) and other restrictive diets are widely promoted for autism. Reviews of the research have not found good evidence that they improve the core features of autism. They also carry risks. Removing dairy without replacing calcium and vitamin D can weaken bones, and cutting out more foods can make an already limited diet even narrower.</p>
<p>That said, some autistic children do have <strong>coeliac disease, food allergies or lactose intolerance</strong>. These should be properly diagnosed and treated. If a child’s symptoms suggest a food problem, a supervised, time-limited trial with a dietitian is much safer than cutting out foods long-term on your own.</p>
<h2>Supplement claims: proceed with care</h2>
<div class="not-prose fx-block"><div class="fx-ratings"><div class="fx-rating fx-rating-green"><p class="fx-rating-label">Worthwhile</p><p class="fx-rating-title">Correcting a proven deficiency</p><p class="fx-rating-text">Such as low iron or vitamin D, confirmed by a blood test.</p></div><div class="fx-rating fx-rating-amber"><p class="fx-rating-label">Being studied</p><p class="fx-rating-title">Omega-3, vitamin D, probiotics</p><p class="fx-rating-text">Results so far are mixed or modest. More research is needed.</p></div><div class="fx-rating fx-rating-red"><p class="fx-rating-label">Can cause harm</p><p class="fx-rating-title">High-dose “protocols”</p><p class="fx-rating-text">Too much vitamin A, vitamin D or zinc can be toxic.</p></div><div class="fx-rating fx-rating-dark"><p class="fx-rating-label">Avoid completely</p><p class="fx-rating-title">Chlorine dioxide (MMS), chelation</p><p class="fx-rating-text">Have caused serious injuries and deaths.</p></div></div></div>
<p>Be wary of any product that promises to cure autism. No diet or supplement does. Always tell your child’s doctor about any supplement you use.</p>
<h2>How FXMed can help</h2>
<p>We test first, start with food, and only supplement what your child actually needs. Our team works with your child’s preferences and sensory needs to build a plan that is realistic for your family. Our <a href="/programs/autism-support">Autism Support program</a> works alongside your child’s paediatrician, therapists and school. It does not aim to cure or change autism. It focuses on the physical health issues, such as digestion, nutrition and sleep, that can make everyday life harder.</p><p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/09-nutrition.webp',
  $p$A mother and son prepare a colourful plate of vegetables together at the kitchen table$p$,
  '4 min read',
  'published',
  '2026-10-29 02:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'autism-and-nutrition-selective-eating-nutrient-needs-and-supplement-claims'
);

-- 10. Autism in Adulthood: Diagnosis, Relationships, Work, and Everyday Support
INSERT INTO public.blog_posts (
  title, slug, excerpt, content, author, category,
  thumbnail_url, thumbnail_alt, read_time, status, created_at
)
SELECT
  $p$Autism in Adulthood: Diagnosis, Relationships, Work, and Everyday Support$p$,
  'autism-in-adulthood-diagnosis-relationships-work-and-support',
  $p$Autistic children grow into autistic adults, and many people are only diagnosed later in life. We look at late diagnosis, self-advocacy, relationships, work and support that fits each person’s goals.$p$,
  $p$<p>Most conversations about autism focus on children. But autistic children grow into autistic adults, and many people are not recognised as autistic until adulthood. Understanding autism in adult life helps families plan ahead, and it helps adults who are only now finding out who they are.</p>
<h2>Diagnosis later in life</h2>
<div class="not-prose fx-block"><div class="fx-compare"><div class="fx-compare-col "><p class="fx-compare-title">Why adults are missed</p><ul><li>Masking: hiding differences to fit in</li><li>Older ideas that autism mostly affects boys</li><li>Anxiety, depression or ADHD diagnosed first</li></ul></div><div class="fx-compare-col fx-compare-good"><p class="fx-compare-title">What a diagnosis can bring</p><ul><li>An explanation for lifelong experiences</li><li>Less self-blame</li><li>Access to the right support and adjustments</li></ul></div></div></div>
<p>Many adults, especially women and people who were described as “quiet” or “bright” at school, were missed as children. Common reasons include:</p>
<ul>
<li><strong>Masking.</strong> Many autistic people learn to hide their differences by copying others, rehearsing conversations or forcing eye contact. This can be exhausting.</li>
<li><strong>Older ideas about autism.</strong> Until recently, autism was mostly recognised in boys with obvious support needs.</li>
<li><strong>Other diagnoses first.</strong> Adults are often diagnosed with anxiety, depression or ADHD before autism is considered.</li>
</ul>
<p>Adults can be assessed by a clinical psychologist or psychiatrist with experience in adult autism. The assessment usually includes a detailed interview about childhood and current life, questionnaires and, where possible, information from someone who knew them as a child.</p>
<p>Many adults describe a diagnosis as a relief. It can explain lifelong experiences, reduce self-blame, and open the door to the right support. Others need time to process it. Both reactions are normal.</p>
<h2>Self-advocacy</h2>
<p>Self-advocacy means understanding your own needs and feeling able to ask for what helps. It might mean telling a colleague you prefer instructions in writing, leaving a noisy event early, or explaining to a doctor that you find it hard to describe pain. Families can build these skills in children early, by involving them in decisions and helping them name what they find easy and hard.</p>
<h2>Relationships</h2>
<p>Autistic adults form friendships, romantic relationships and families like anyone else. Some find the unwritten rules of social life confusing or tiring, and may prefer smaller groups, shared-interest activities or online communication. Clear, honest communication, where both people say what they mean, often helps relationships in both directions. Connecting with other autistic people can also be a great source of understanding and belonging.</p>
<h2>Work</h2>
<p>Autistic adults bring valuable strengths to work, including focus, attention to detail, reliability and deep expertise. Yet many face barriers, often in interviews or busy workplaces rather than in the work itself. Simple, low-cost adjustments can make a big difference:</p>
<div class="not-prose fx-block"><p class="fx-block-title">Workplace adjustments that help</p><div class="fx-steps"><div class="fx-step"><p class="fx-step-title">Written instructions</p><p class="fx-step-text">Clear expectations in writing.</p></div><div class="fx-step"><p class="fx-step-title">Quieter workspace</p><p class="fx-step-text">Headphones, a calm desk or flexible hours.</p></div><div class="fx-step"><p class="fx-step-title">Advance notice</p><p class="fx-step-text">Warning of changes, and agendas before meetings.</p></div><div class="fx-step"><p class="fx-step-title">Fairer interviews</p><p class="fx-step-text">Questions shared in advance, or a practical task.</p></div><div class="fx-step"><p class="fx-step-title">A named contact</p><p class="fx-step-text">One person to go to with questions.</p></div></div></div>
<p>Whether to tell an employer about an autism diagnosis is a personal choice. In Nigeria, the Discrimination Against Persons with Disabilities (Prohibition) Act 2018 sets out protections against discrimination, including in employment.</p>
<h2>Independent living</h2>
<p>Independence looks different for everyone. Some autistic adults live entirely on their own; others live with family or with support. Skills such as cooking, budgeting, travelling and managing appointments can be taught step by step, with visual guides, routines and technology such as reminders and apps. Supported decision-making, where trusted people help an adult understand options while the adult makes the final choice, respects a person’s right to run their own life.</p>
<h2>Health and wellbeing</h2>
<div class="not-prose fx-block fx-callout fx-callout-warn"><p class="fx-callout-title">Autistic burnout</p><p>Deep exhaustion and loss of skills after long-term stress or masking. Rest, reduced demands and understanding support help recovery.</p></div>
<p>Autistic adults have higher rates of anxiety, depression, sleep problems, digestive problems and epilepsy. Many also experience <strong>autistic burnout</strong>, a period of deep exhaustion and loss of skills after long-term stress or masking. Rest, reduced demands and understanding support help recovery. Regular health checks matter too, as autistic adults may find it harder to access healthcare or describe symptoms.</p>
<h2>Support that fits the person</h2>
<div class="not-prose fx-block"><p class="fx-block-title">Goals set by the person, for the person</p><div class="fx-chips"><span class="fx-chip">Finishing a degree</span><span class="fx-chip">The right job</span><span class="fx-chip">Living independently</span><span class="fx-chip">Building friendships</span><span class="fx-chip fx-chip-strong">More good days</span></div></div>
<p>The best support starts with the individual’s own goals, not someone else’s idea of what they should achieve. That might be finishing a degree, finding the right job, living independently, building friendships or simply having more good days than hard ones.</p>
<h2>How FXMed can help</h2>
<p>Our team supports autistic teenagers and adults with physical health concerns such as digestion, sleep, energy and nutrition, with appointments that move at your pace. <a href="/health-assessment">Book a health assessment</a> to get started.</p><p><em>This article is for general education and does not replace advice from your own doctor or care team. If you are worried about your child’s development or health, please speak to a qualified professional.</em></p>$p$,
  'FXMed Team',
  'Autism',
  '/blog/autism/10-autism-adulthood.webp',
  $p$A young woman works on a laptop at a calm, plant-filled desk with headphones beside her$p$,
  '4 min read',
  'published',
  '2026-10-29 01:00:00+01'
WHERE NOT EXISTS (
  SELECT 1 FROM public.blog_posts WHERE slug = 'autism-in-adulthood-diagnosis-relationships-work-and-support'
);
