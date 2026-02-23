'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { useExamMonitor } from '@/hooks/use-exam-monitor'
import { WebcamMonitor } from '@/components/webcam-monitor'

interface Question {
  id: string
  question_type: string
  question_text: string
  marks: number
  question_order: number
  mcq_options: Array<{ id: string; text: string }>
  mcq_correct_answer_id: string
}

interface ExamInterfaceProps {
  examId: string
  enrollmentId: string
  onExamEnd: () => void
}

export function ExamInterface({ examId, enrollmentId, onExamEnd }: ExamInterfaceProps) {
  const supabase = createClient()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Map<string, string>>(new Map())
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [enableWebcam, setEnableWebcam] = useState(false)

  // Initialize anti-cheating monitor
  useExamMonitor(enrollmentId, true)

  useEffect(() => {
    const fetchExamData = async () => {
      try {
        // Fetch exam duration and settings
        const { data: exam, error: examError } = await supabase
          .from('exams')
          .select('duration_minutes, enable_webcam')
          .eq('id', examId)
          .single()

        if (examError) throw examError

        setTimeLeft(exam.duration_minutes * 60)
        setEnableWebcam(exam.enable_webcam)

        // Fetch questions
        const { data: questionsData, error: questionsError } = await supabase
          .from('exam_questions')
          .select('*')
          .eq('exam_id', examId)
          .eq('question_type', 'mcq')
          .order('question_order', { ascending: true })

        if (questionsError) throw questionsError
        setQuestions(questionsData || [])
      } catch (error) {
        console.error('Error fetching exam data:', error)
        toast.error('Failed to load exam')
      } finally {
        setLoading(false)
      }
    }

    fetchExamData()
  }, [examId])

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleSubmitExam()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const handleAnswerSelect = (questionId: string, answerId: string) => {
    const newAnswers = new Map(answers)
    newAnswers.set(questionId, answerId)
    setAnswers(newAnswers)
  }

  const handleSubmitExam = useCallback(async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      let totalMarks = 0
      let obtainedMarks = 0
      let correctAnswers = 0

      // Calculate scores
      for (const question of questions) {
        totalMarks += question.marks
        const selectedAnswer = answers.get(question.id)

        if (selectedAnswer === question.mcq_correct_answer_id) {
          obtainedMarks += question.marks
          correctAnswers += 1
        }

        // Save submission
        await supabase.from('exam_submissions').insert({
          enrollment_id: enrollmentId,
          question_id: question.id,
          answer: selectedAnswer,
          is_correct: selectedAnswer === question.mcq_correct_answer_id,
          marks_obtained: selectedAnswer === question.mcq_correct_answer_id ? question.marks : 0,
        })
      }

      // Calculate percentage
      const percentage = (obtainedMarks / totalMarks) * 100

      // Get passing percentage
      const { data: exam } = await supabase
        .from('exams')
        .select('passing_percentage')
        .eq('id', examId)
        .single()

      const isPassed = percentage >= (exam?.passing_percentage || 40)

      // Save result
      await supabase.from('exam_results').insert({
        enrollment_id: enrollmentId,
        total_marks: totalMarks,
        marks_obtained: obtainedMarks,
        percentage: percentage.toFixed(2),
        is_passed: isPassed,
        correct_answers: correctAnswers,
        total_questions: questions.length,
        time_taken_seconds: (questions[0] ? (questions[0].id ? 0 : 0) : 0),
        submitted_at: new Date().toISOString(),
      })

      // Update enrollment status
      await supabase
        .from('exam_enrollments')
        .update({ status: 'submitted', is_submitted: true, end_time: new Date().toISOString() })
        .eq('id', enrollmentId)

      toast.success('Exam submitted successfully')
      onExamEnd()
    } catch (error) {
      console.error('Error submitting exam:', error)
      toast.error('Failed to submit exam')
    } finally {
      setSubmitting(false)
    }
  }, [examId, enrollmentId, questions, answers, onExamEnd])

  if (loading) {
    return <div>Loading exam...</div>
  }

  if (questions.length === 0) {
    return <div>No questions found for this exam</div>
  }

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className="space-y-6">
      {/* Webcam Monitor */}
      <WebcamMonitor enrollmentId={enrollmentId} enabled={enableWebcam} />

      {/* Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
              <Progress value={progress} className="mt-2 w-48" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </p>
              <p className="text-sm text-slate-600">Time left</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentQuestion.question_text}
            <span className="ml-2 text-sm font-normal text-slate-600">({currentQuestion.marks} marks)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={answers.get(currentQuestion.id) || ''} onValueChange={(value) => handleAnswerSelect(currentQuestion.id, value)}>
            <div className="space-y-3">
              {currentQuestion.mcq_options?.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="cursor-pointer flex-1">
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-2 justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex < questions.length - 1 && (
            <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
              Next
            </Button>
          )}
          {currentQuestionIndex === questions.length - 1 && (
            <Button onClick={handleSubmitExam} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </Button>
          )}
        </div>
      </div>

      {/* Question Navigator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question Navigator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-8 h-8 rounded text-sm font-medium ${
                  index === currentQuestionIndex
                    ? 'bg-blue-600 text-white'
                    : answers.has(q.id)
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
