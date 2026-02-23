import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface CheatingEvent {
  eventType: 'tab_switch' | 'fullscreen_exit' | 'no_face_detected' | 'multiple_faces' | 'face_swap' | 'camera_off'
  severity: 'info' | 'warning' | 'critical'
}

export function useExamMonitor(enrollmentId: string, isExamActive: boolean) {
  const loggingRef = useRef(false)
  const eventCountRef = useRef<Map<string, number>>(new Map())
  const supabase = createClient()

  // Tab switch detection
  useEffect(() => {
    if (!isExamActive) return

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        await logCheatingEvent({
          eventType: 'tab_switch',
          severity: 'warning',
        })
        toast.warning('Warning: Tab switching detected during exam')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isExamActive, enrollmentId])

  // Fullscreen detection
  useEffect(() => {
    if (!isExamActive) return

    const handleFullscreenChange = async () => {
      if (!document.fullscreenElement) {
        await logCheatingEvent({
          eventType: 'fullscreen_exit',
          severity: 'critical',
        })
        toast.error('Error: You must remain in fullscreen during the exam')
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isExamActive, enrollmentId])

  // Right-click disable
  useEffect(() => {
    if (!isExamActive) return

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      toast.warning('Right-click is disabled during the exam')
      return false
    }

    document.addEventListener('contextmenu', handleContextMenu)
    return () => document.removeEventListener('contextmenu', handleContextMenu)
  }, [isExamActive])

  // Keyboard shortcuts disable
  useEffect(() => {
    if (!isExamActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.shiftKey && e.key === 'C')
      ) {
        e.preventDefault()
        toast.warning('Developer tools are disabled during the exam')
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isExamActive])

  const logCheatingEvent = async (event: CheatingEvent) => {
    if (loggingRef.current) return

    loggingRef.current = true

    try {
      const eventKey = event.eventType
      const count = (eventCountRef.current.get(eventKey) || 0) + 1
      eventCountRef.current.set(eventKey, count)

      await supabase.from('cheating_logs').insert({
        enrollment_id: enrollmentId,
        event_type: event.eventType,
        event_count: count,
        severity: event.severity,
        details: {
          timestamp: new Date().toISOString(),
        },
      })
    } catch (error) {
      console.error('Error logging cheating event:', error)
    } finally {
      loggingRef.current = false
    }
  }

  // Request fullscreen on mount
  useEffect(() => {
    if (!isExamActive) return

    const requestFullscreen = async () => {
      try {
        const element = document.documentElement
        if (!document.fullscreenElement) {
          await element.requestFullscreen()
        }
      } catch (error) {
        console.warn('Could not enter fullscreen:', error)
      }
    }

    requestFullscreen()
  }, [isExamActive])
}
