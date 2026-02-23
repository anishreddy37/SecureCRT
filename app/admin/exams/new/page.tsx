'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'

export default function CreateExamPage() {
  const router = useRouter()
  const { user } = useAuth()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 60,
    total_marks: 100,
    passing_percentage: 40,
    enable_mcq: true,
    enable_coding: false,
    enable_screen_recording: true,
    enable_webcam: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.from('exams').insert({
        ...formData,
        created_by: user?.id,
      })

      if (error) throw error

      toast.success('Exam created successfully')
      router.push('/admin/exams')
    } catch (error) {
      console.error('Error creating exam:', error)
      toast.error('Failed to create exam')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('_') && name !== 'enable_mcq' && name !== 'enable_coding' && name !== 'enable_screen_recording' && name !== 'enable_webcam'
        ? parseInt(value)
        : value,
    }))
  }

  const handleCheckChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Create New Exam</h1>
        <p className="text-slate-600 mt-2">Set up a new exam with questions and settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exam Details</CardTitle>
          <CardDescription>Basic information about your exam</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Exam Title</label>
              <Input
                name="title"
                placeholder="e.g., Python Basics Quiz"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                name="description"
                placeholder="Describe what this exam is about"
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (minutes)</label>
                <Input
                  name="duration_minutes"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  min={1}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Total Marks</label>
                <Input
                  name="total_marks"
                  type="number"
                  value={formData.total_marks}
                  onChange={handleChange}
                  min={1}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Passing Percentage (%)</label>
              <Input
                name="passing_percentage"
                type="number"
                value={formData.passing_percentage}
                onChange={handleChange}
                min={0}
                max={100}
                disabled={loading}
              />
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="font-medium">Features</h3>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable_mcq"
                  checked={formData.enable_mcq}
                  onCheckedChange={(checked) => handleCheckChange('enable_mcq', Boolean(checked))}
                />
                <label htmlFor="enable_mcq" className="text-sm cursor-pointer">
                  Enable Multiple Choice Questions
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable_coding"
                  checked={formData.enable_coding}
                  onCheckedChange={(checked) => handleCheckChange('enable_coding', Boolean(checked))}
                />
                <label htmlFor="enable_coding" className="text-sm cursor-pointer">
                  Enable Coding Questions
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable_screen_recording"
                  checked={formData.enable_screen_recording}
                  onCheckedChange={(checked) => handleCheckChange('enable_screen_recording', Boolean(checked))}
                />
                <label htmlFor="enable_screen_recording" className="text-sm cursor-pointer">
                  Enable Screen Recording
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="enable_webcam"
                  checked={formData.enable_webcam}
                  onCheckedChange={(checked) => handleCheckChange('enable_webcam', Boolean(checked))}
                />
                <label htmlFor="enable_webcam" className="text-sm cursor-pointer">
                  Enable Webcam Monitoring
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Exam'}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
