'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ExamStats {
  examId: string
  examTitle: string
  totalStudents: number
  averageScore: number
  passedCount: number
  failedCount: number
  averageTime: number
}

interface CheatingIncident {
  enrollmentId: string
  eventType: string
  severity: string
  count: number
  timestamp: string
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [stats, setStats] = useState<ExamStats[]>([])
  const [incidents, setIncidents] = useState<CheatingIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [totalStudents, setTotalStudents] = useState(0)
  const [averagePassRate, setAveragePassRate] = useState(0)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (!user?.id) return

        // Get all exams created by this admin
        const { data: exams, error: examsError } = await supabase
          .from('exams')
          .select('id, title')
          .eq('created_by', user.id)

        if (examsError) throw examsError

        // Get results for each exam
        const examStats: ExamStats[] = []
        let totalPassedCount = 0
        let totalResultsCount = 0

        for (const exam of exams || []) {
          const { data: results, error: resultsError } = await supabase
            .from('exam_results')
            .select('marks_obtained, total_marks, is_passed, time_taken_seconds')
            .eq('enrollment_id', (
              await supabase
                .from('exam_enrollments')
                .select('id')
                .eq('exam_id', exam.id)
            ).data?.[0]?.id || '')

          if (!resultsError && results) {
            const passedCount = results.filter((r) => r.is_passed).length
            const averageScore =
              results.length > 0
                ? results.reduce((sum, r) => sum + (r.marks_obtained / r.total_marks) * 100, 0) /
                  results.length
                : 0
            const averageTime =
              results.length > 0
                ? results.reduce((sum, r) => sum + (r.time_taken_seconds || 0), 0) / results.length
                : 0

            examStats.push({
              examId: exam.id,
              examTitle: exam.title,
              totalStudents: results.length,
              averageScore: averageScore,
              passedCount,
              failedCount: results.length - passedCount,
              averageTime,
            })

            totalPassedCount += passedCount
            totalResultsCount += results.length
          }
        }

        setStats(examStats)
        setTotalStudents(totalResultsCount)
        setAveragePassRate(
          totalResultsCount > 0 ? (totalPassedCount / totalResultsCount) * 100 : 0
        )

        // Get cheating incidents
        const { data: cheatingData, error: cheatingError } = await supabase
          .from('cheating_logs')
          .select('enrollment_id, event_type, severity, logged_at')
          .in(
            'enrollment_id',
            (
              await supabase
                .from('exam_enrollments')
                .select('id')
                .in(
                  'exam_id',
                  exams?.map((e) => e.id) || []
                )
            ).data?.map((e) => e.id) || []
          )

        if (!cheatingError) {
          setIncidents(cheatingData || [])
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user?.id) {
      fetchAnalytics()
    }
  }, [user?.id])

  if (loading) {
    return <div>Loading analytics...</div>
  }

  // Prepare chart data
  const performanceData = stats.map((stat) => ({
    name: stat.examTitle.substring(0, 15),
    'Avg Score': stat.averageScore.toFixed(1),
    'Pass Rate': ((stat.passedCount / (stat.passedCount + stat.failedCount)) * 100).toFixed(1),
  }))

  const passFailData = [
    { name: 'Passed', value: stats.reduce((sum, s) => sum + s.passedCount, 0) },
    { name: 'Failed', value: stats.reduce((sum, s) => sum + s.failedCount, 0) },
  ]

  const COLORS = ['#10b981', '#ef4444']

  // Group cheating incidents by type
  const cheatingByType = incidents.reduce(
    (acc, incident) => {
      const existing = acc.find((item) => item.type === incident.event_type)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({ type: incident.event_type, count: 1 })
      }
      return acc
    },
    [] as Array<{ type: string; count: number }>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
        <p className="text-slate-600 mt-2">Overview of your exams and student performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Total Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalStudents}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Average Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {averagePassRate.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cheating Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{incidents.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Exam Performance</CardTitle>
            <CardDescription>Average scores and pass rates by exam</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Avg Score" fill="#3b82f6" />
                <Bar dataKey="Pass Rate" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pass/Fail Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={passFailData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {COLORS.map((color, index) => (
                    <Cell key={`cell-${index}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Exam Details Table */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>Detailed statistics for each exam</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Passed</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Avg Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((stat) => (
                  <TableRow key={stat.examId}>
                    <TableCell className="font-medium">{stat.examTitle}</TableCell>
                    <TableCell>{stat.totalStudents}</TableCell>
                    <TableCell>{stat.averageScore.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50">
                        {stat.passedCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-red-50">
                        {stat.failedCount}
                      </Badge>
                    </TableCell>
                    <TableCell>{(stat.averageTime / 60).toFixed(0)} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Cheating Incidents */}
      {cheatingByType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cheating Incidents</CardTitle>
            <CardDescription>Summary of cheating detection events</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cheatingByType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
