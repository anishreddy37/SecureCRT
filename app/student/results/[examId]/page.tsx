'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface Result {
  id: string
  total_marks: number
  marks_obtained: number
  percentage: number
  is_passed: boolean
  correct_answers: number
  total_questions: number
  time_taken_seconds: number
  submitted_at: string
}

interface Exam {
  id: string
  title: string
  total_marks: number
  passing_percentage: number
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const examId = params.examId as string
  const [result, setResult] = useState<Result | null>(null)
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (!user?.id) return

        // Fetch exam info
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('id, title, total_marks, passing_percentage')
          .eq('id', examId)
          .single()

        if (examError) throw examError
        setExam(examData)

        // Fetch result
        const { data: enrollmentData, error: enrollmentError } = await supabase
          .from('exam_enrollments')
          .select('id')
          .eq('exam_id', examId)
          .eq('student_id', user.id)
          .single()

        if (enrollmentError) throw enrollmentError

        const { data: resultData, error: resultError } = await supabase
          .from('exam_results')
          .select('*')
          .eq('enrollment_id', enrollmentData.id)
          .single()

        if (resultError) throw resultError
        setResult(resultData)
      } catch (error) {
        console.error('Error fetching results:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchResults()
    }
  }, [examId, user?.id])

  if (loading) {
    return <div>Loading results...</div>
  }

  if (!result || !exam) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-slate-600 mb-4">Results not found</p>
            <Link href="/student/exams">
              <Button>Back to Exams</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const percentageColor =
    result.percentage >= exam.passing_percentage ? 'text-green-600' : 'text-red-600'

  const data = [
    {
      name: 'Score',
      obtained: result.marks_obtained,
      total: result.total_marks,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{exam.title}</h1>
        <p className="text-slate-600 mt-2">
          Submitted on {new Date(result.submitted_at).toLocaleString()}
        </p>
      </div>

      {/* Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className={`text-4xl font-bold ${percentageColor}`}>
                {result.percentage.toFixed(1)}%
              </p>
              <p className="text-slate-600 mt-2">
                {result.marks_obtained} / {result.total_marks} marks
              </p>
            </div>
            <Progress value={result.percentage} className="h-3" />
            <Badge
              className="w-full justify-center py-2"
              variant={result.is_passed ? 'default' : 'destructive'}
            >
              {result.is_passed ? 'PASSED' : 'FAILED'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">
                {result.total_questions > 0
                  ? ((result.correct_answers / result.total_questions) * 100).toFixed(1)
                  : 0}
                %
              </p>
              <p className="text-slate-600 mt-2">
                {result.correct_answers} / {result.total_questions} correct
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time Taken</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">
                {Math.floor(result.time_taken_seconds / 60)}:{(result.time_taken_seconds % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-slate-600 mt-2">Minutes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="obtained" fill="#3b82f6" name="Marks Obtained" />
              <Bar dataKey="total" fill="#e5e7eb" name="Total Marks" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Link href="/student/exams" className="flex-1">
          <Button variant="outline" className="w-full">
            Back to Exams
          </Button>
        </Link>
        <Link href="/student/results" className="flex-1">
          <Button className="w-full">View All Results</Button>
        </Link>
      </div>
    </div>
  )
}
