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
  enable_mcq: boolean
  enable_coding: boolean
  created_at: string
}

interface EnrollmentStatus {
  examId: string
  status: 'enrolled' | 'in_progress' | 'submitted' | 'graded'
}

export default function StudentExamsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [exams, setExams] = useState<Exam[]>([])
  const [enrollments, setEnrollments] = useState<Map<string, EnrollmentStatus>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch published exams
        const { data: examsData, error: examsError } = await supabase
          .from('exams')
          .select('*')
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        if (examsError) throw examsError

        // Fetch student's enrollments
        if (user?.id) {
          const { data: enrollmentsData } = await supabase
            .from('exam_enrollments')
            .select('exam_id, status')
            .eq('student_id', user.id)

          const enrollmentMap = new Map(
            enrollmentsData?.map((e) => [
              e.exam_id,
              {
                examId: e.exam_id,
                status: e.status,
              },
            ]) || []
          )
          setEnrollments(enrollmentMap)
        }

        setExams(examsData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchData()
    }
  }, [user?.id])

  const handleStartExam = async (examId: string) => {
    if (!user?.id) return

    try {
      // Check if already enrolled
      const enrollment = enrollments.get(examId)

      if (!enrollment) {
        // Create new enrollment
        const { data, error } = await supabase
          .from('exam_enrollments')
          .insert({
            exam_id: examId,
            student_id: user.id,
            status: 'in_progress',
            start_time: new Date().toISOString(),
          })
          .select()

        if (error) throw error
      }

      // Redirect to exam
      window.location.href = `/student/exams/${examId}/take`
    } catch (error) {
      console.error('Error starting exam:', error)
    }
  }

  if (loading) {
    return <div>Loading exams...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Available Exams</h1>
        <p className="text-slate-600 mt-2">Take an exam to test your knowledge</p>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-slate-600">No exams available at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam) => {
            const enrollment = enrollments.get(exam.id)
            const canStart = !enrollment || enrollment.status === 'submitted' || enrollment.status === 'graded'

            return (
              <Card key={exam.id}>
                <CardHeader>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle>{exam.title}</CardTitle>
                      <CardDescription className="mt-1">{exam.description}</CardDescription>
                    </div>
                    {enrollment && (
                      <Badge
                        variant={
                          enrollment.status === 'graded'
                            ? 'default'
                            : enrollment.status === 'submitted'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    )}
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
                    {enrollment?.status === 'graded' && (
                      <Link href={`/student/results/${enrollment.examId}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          View Result
                        </Button>
                      </Link>
                    )}
                    {canStart && (
                      <Button className="flex-1" onClick={() => handleStartExam(exam.id)}>
                        {enrollment && enrollment.status !== 'in_progress' ? 'Retake Exam' : 'Start Exam'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
