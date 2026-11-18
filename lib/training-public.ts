import { getTrainingDatabase, toPreview, type TrainingPreview, type TrainingProgram } from './training'

// Server-only reads for the public course pages. Only the preview (outline,
// never lesson content or quiz answers) leaves the server.

export async function getPublicCourses(): Promise<TrainingPreview[]> {
  const database = getTrainingDatabase()
  if (!database) return []
  const { data, error } = await database.from('training_programs').select('*')
    .eq('status', 'published').in('visibility', ['public', 'both']).not('slug', 'is', null)
    .order('updated_at', { ascending: false })
  if (error) { console.error('Could not load public courses:', error.message); return [] }
  return (data as TrainingProgram[]).map(toPreview)
}

export async function getPublicCourse(slug: string): Promise<TrainingPreview | null> {
  const database = getTrainingDatabase()
  if (!database || !/^[a-z0-9-]{1,120}$/.test(slug)) return null
  const { data, error } = await database.from('training_programs').select('*')
    .eq('slug', slug).eq('status', 'published').in('visibility', ['public', 'both']).maybeSingle()
  if (error) { console.error('Could not load course:', error.message); return null }
  return data ? toPreview(data as TrainingProgram) : null
}
