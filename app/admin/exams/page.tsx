'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import { Badge } from '@/components/ui/badge'

interface Exam {
  id: string
  title: string
  description: string
  duration_minutes: number
  total_marks: number
  status: string
  enable_mcq: boolean
  enable_coding: boolean
  created_at: string
}

export default function ExamsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const { data, error } = await supabase
          .from('exams')
          .select('*')
          .eq('created_by', user?.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setExams(data || [])
      } catch (error) {
        console.error('Error fetching exams:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchExams()
    }
  }, [user?.id])

  if (loading) {
    return <div>Loading exams...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Exams</h1>
          <p className="text-slate-600 mt-1">Manage your exams and questions</p>
        </div>
        <Link href="/admin/exams/new">
          <Button>Create New Exam</Button>
        </Link>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-slate-600 mb-4">No exams yet. Create your first exam to get started.</p>
            <Link href="/admin/exams/new">
              <Button>Create Exam</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((exam) => (
            <Card key={exam.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <CardTitle>{exam.title}</CardTitle>
                    <CardDescription className="mt-1">{exam.description}</CardDescription>
                  </div>
                  <Badge variant={exam.status === 'published' ? 'default' : 'secondary'}>
                    {exam.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <p className="text-slate-600">
                    <span className="font-medium">Duration:</span> {exam.duration_minutes} minutes
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Total Marks:</span> {exam.total_marks}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {exam.enable_mcq && <Badge variant="outline">MCQ</Badge>}
                    {exam.enable_coding && <Badge variant="outline">Coding</Badge>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link href={`/admin/exams/${exam.id}/edit`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/admin/exams/${exam.id}/questions`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      Questions
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
