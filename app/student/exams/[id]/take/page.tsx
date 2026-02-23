'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { ExamInterface } from '@/components/exam-interface'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function TakeExamPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const examId = params.id as string
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null)
  const [examTitle, setExamTitle] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const setupExam = async () => {
      try {
        if (!user?.id) return

        // Get or create enrollment
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('exam_enrollments')
          .select('id, status')
          .eq('exam_id', examId)
          .eq('student_id', user.id)
          .single()

        if (!enrollment) {
          // Create new enrollment
          const { data: newEnrollment, error: createError } = await supabase
            .from('exam_enrollments')
            .insert({
              exam_id: examId,
              student_id: user.id,
              status: 'in_progress',
              start_time: new Date().toISOString(),
            })
            .select()
            .single()

          if (createError) throw createError
          setEnrollmentId(newEnrollment.id)
        } else {
          setEnrollmentId(enrollment.id)
        }

        // Get exam title
        const { data: exam, error: examError } = await supabase
          .from('exams')
          .select('title')
          .eq('id', examId)
          .single()

        if (examError) throw examError
        setExamTitle(exam.title)
      } catch (error) {
        console.error('Error setting up exam:', error)
      } finally {
        setLoading(false)
      }
    }

    setupExam()
  }, [examId, user?.id])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading exam...</div>
  }

  if (!enrollmentId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-slate-600 mb-4">Unable to load exam</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{examTitle}</h1>
        <p className="text-slate-600 mt-2">Answer all questions and submit when complete</p>
      </div>

      <ExamInterface
        examId={examId}
        enrollmentId={enrollmentId}
        onExamEnd={() => router.push(`/student/results/${examId}`)}
      />
    </div>
  )
}
