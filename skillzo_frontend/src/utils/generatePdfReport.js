import jsPDF from 'jspdf'

/**
 * Generates and downloads a clean, professional multi-page PDF report for an interview session.
 * 
 * @param {Object} params
 * @param {Object} params.session - Interview session data with questions, scores, verdict, suggestions
 * @param {Object} params.user - Current user object
 */
export const downloadInterviewReportPdf = ({ session, user }) => {
  if (!session) return

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm
  const margin = 14
  const contentWidth = pageWidth - margin * 2 // 182mm
  let currentY = 16

  // ─── Colors ───────────────────────────────────────────────────────────────
  const BRAND_BLUE = [37, 99, 235]       // #2563EB
  const BRAND_BLUE_LIGHT = [239, 246, 255] // #EFF6FF
  const TEXT_DARK = [15, 23, 42]          // #0F172A
  const TEXT_MUTED = [100, 116, 139]     // #64748B
  const BORDER_COLOR = [226, 232, 240]    // #E2E8F0
  const CARD_BG = [248, 250, 252]        // #F8FAFC
  const GREEN = [16, 185, 129]
  const AMBER = [245, 158, 11]

  // ─── Helper: Page break handler ───────────────────────────────────────────
  const checkPageBreak = (neededHeight) => {
    if (currentY + neededHeight > pageHeight - 20) {
      doc.addPage()
      currentY = 16
      // Draw top bar decoration on subsequent pages
      doc.setFillColor(...BRAND_BLUE)
      doc.rect(margin, 8, contentWidth, 1.5, 'F')
      return true
    }
    return false
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1: HEADER & OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  // Top Accent Bar
  doc.setFillColor(...BRAND_BLUE)
  doc.rect(margin, 8, contentWidth, 2, 'F')

  // Platform Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND_BLUE)
  doc.text('SKILLZO AI STUDIO · INTERVIEW READINESS PLATFORM', margin, currentY)
  currentY += 6

  // Report Main Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...TEXT_DARK)
  doc.text('Interview Performance Report', margin, currentY)
  currentY += 5.5

  // Subtitle / Date
  const sessionDate = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Official AI Mock Evaluation · Completed on ${sessionDate} · Session #${session.id}`, margin, currentY)
  currentY += 8

  // ─── Metadata Info Card ───────────────────────────────────────────────────
  const infoCardHeight = session.verdict ? 34 : 26
  doc.setFillColor(...CARD_BG)
  doc.setDrawColor(...BORDER_COLOR)
  doc.roundedRect(margin, currentY, contentWidth, infoCardHeight, 3, 3, 'FD')

  doc.setFontSize(8.5)
  // Row 1
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_MUTED)
  doc.text('CANDIDATE:', margin + 4, currentY + 6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_DARK)
  doc.text(String(user?.username || 'Candidate'), margin + 28, currentY + 6)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_MUTED)
  doc.text('TARGET ROLE:', margin + 95, currentY + 6)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...BRAND_BLUE)
  doc.text(String(session.job_role || 'Mock Role'), margin + 120, currentY + 6)

  // Row 2
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_MUTED)
  doc.text('DIFFICULTY:', margin + 4, currentY + 13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_DARK)
  doc.text(String(session.difficulty || 'Practice'), margin + 28, currentY + 13)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_MUTED)
  doc.text('FORMAT:', margin + 95, currentY + 13)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_DARK)
  doc.text(`${(session.mode || 'video').toUpperCase()} INTERVIEW`, margin + 120, currentY + 13)

  // Row 3
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_MUTED)
  doc.text('CONFIDENCE:', margin + 4, currentY + 20)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...BRAND_BLUE)
  doc.text(String(session.confidence_trend || 'Steady Focus'), margin + 28, currentY + 20)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...TEXT_MUTED)
  doc.text('QUESTIONS:', margin + 95, currentY + 20)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...TEXT_DARK)
  doc.text(`${session.questions?.length || 0} Questions Evaluated`, margin + 120, currentY + 20)

  if (session.verdict) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(30, 58, 138)
    const verdictLines = doc.splitTextToSize(`"${session.verdict}"`, contentWidth - 10)
    doc.text(verdictLines, margin + 4, currentY + 27)
  }

  currentY += infoCardHeight + 8

  // ─── Score Metrics Row (3 Boxes) ──────────────────────────────────────────
  const scoreCardWidth = (contentWidth - 8) / 3
  const scoreCardHeight = 22

  const scores = [
    { label: 'OVERALL SCORE', val: session.overall_score || 0, sub: 'Target Readiness' },
    { label: 'TECHNICAL', val: session.technical_score || 0, sub: 'Domain & Concepts' },
    { label: 'COMMUNICATION', val: session.communication_score || 0, sub: 'Clarity & Delivery' },
  ]

  scores.forEach((s, idx) => {
    const boxX = margin + idx * (scoreCardWidth + 4)
    doc.setFillColor(idx === 0 ? 239 : 248, idx === 0 ? 246 : 250, idx === 0 ? 255 : 252)
    doc.setDrawColor(idx === 0 ? 191 : 226, idx === 0 ? 219 : 232, idx === 0 ? 254 : 240)
    doc.roundedRect(boxX, currentY, scoreCardWidth, scoreCardHeight, 2.5, 2.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...(idx === 0 ? BRAND_BLUE : TEXT_MUTED))
    doc.text(s.label, boxX + 4, currentY + 5.5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...(idx === 0 ? BRAND_BLUE : TEXT_DARK))
    doc.text(`${s.val}`, boxX + 4, currentY + 13.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(`/100 · ${s.sub}`, boxX + 17, currentY + 13.5)

    // Progress line
    const barWidth = scoreCardWidth - 8
    doc.setFillColor(226, 232, 240)
    doc.rect(boxX + 4, currentY + 17, barWidth, 1.5, 'F')
    doc.setFillColor(s.val >= 75 ? GREEN[0] : s.val >= 40 ? AMBER[0] : BRAND_BLUE[0],
                     s.val >= 75 ? GREEN[1] : s.val >= 40 ? AMBER[1] : BRAND_BLUE[1],
                     s.val >= 75 ? GREEN[2] : s.val >= 40 ? AMBER[2] : BRAND_BLUE[2])
    doc.rect(boxX + 4, currentY + 17, (barWidth * Math.min(100, Math.max(0, s.val))) / 100, 1.5, 'F')
  })

  currentY += scoreCardHeight + 9

  // ─── AI Recommendations Section ───────────────────────────────────────────
  if (session.ai_suggestions && session.ai_suggestions.length > 0) {
    checkPageBreak(30)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...TEXT_DARK)
    doc.text('Key AI Recommendations & Growth Plan', margin, currentY)
    currentY += 5

    session.ai_suggestions.forEach((sug) => {
      const bulletText = `✦  ${sug}`
      const lines = doc.splitTextToSize(bulletText, contentWidth - 4)
      const blockHeight = lines.length * 4.5 + 2

      checkPageBreak(blockHeight)

      doc.setFillColor(...CARD_BG)
      doc.setDrawColor(...BORDER_COLOR)
      doc.roundedRect(margin, currentY, contentWidth, blockHeight, 2, 2, 'FD')

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...TEXT_DARK)
      doc.text(lines, margin + 3.5, currentY + 4)

      currentY += blockHeight + 2.5
    })

    currentY += 4
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUESTION-BY-QUESTION DETAILED EVALUATION
  // ═══════════════════════════════════════════════════════════════════════════
  const questions = session.questions || []
  if (questions.length > 0) {
    checkPageBreak(25)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...TEXT_DARK)
    doc.text('Detailed Question-by-Question Evaluation', margin, currentY)
    currentY += 6

    questions.forEach((q, index) => {
      // 1. Question Title & text
      const qNumText = `Q${index + 1}.`
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      const qTextLines = doc.splitTextToSize(q.question_text || 'Interview Question', contentWidth - 12)
      const qHeaderHeight = Math.max(8, qTextLines.length * 4.5 + 4)

      // Estimate total question card height
      const ansText = q.answer?.answer_text || 'Passed without verbal response.'
      const idealText = q.answer?.ideal_answer_summary || ''
      const ansLines = doc.splitTextToSize(ansText, contentWidth - 8)
      const idealLines = idealText ? doc.splitTextToSize(idealText, contentWidth - 8) : []

      const totalNeeded = qHeaderHeight + 8 + ansLines.length * 4 + (idealText ? idealLines.length * 4 + 8 : 0) + 12

      checkPageBreak(Math.min(totalNeeded, 70))

      // Question header bar
      doc.setFillColor(241, 245, 249)
      doc.roundedRect(margin, currentY, contentWidth, qHeaderHeight, 2, 2, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...BRAND_BLUE)
      doc.text(qNumText, margin + 3, currentY + 5)

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...TEXT_DARK)
      doc.text(qTextLines, margin + 11, currentY + 5)

      currentY += qHeaderHeight + 2

      // Scores if answer exists
      if (q.answer) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...TEXT_MUTED)
        const scoresText = `Score: Overall ${q.answer.overall_score || 0}/100  ·  Technical: ${q.answer.technical_knowledge || 0}/100  ·  Communication: ${q.answer.communication || 0}/100`
        doc.text(scoresText, margin + 4, currentY + 3.5)
        currentY += 6

        // Candidate Answer Box
        checkPageBreak(ansLines.length * 4 + 8)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(...TEXT_MUTED)
        doc.text('YOUR RESPONSE:', margin + 4, currentY + 3.5)
        currentY += 5

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...TEXT_DARK)
        doc.text(ansLines, margin + 4, currentY + 3)
        currentY += ansLines.length * 4 + 2

        // Ideal Answer Box
        if (idealText) {
          checkPageBreak(idealLines.length * 4 + 8)
          doc.setFillColor(...BRAND_BLUE_LIGHT)
          doc.setDrawColor(191, 219, 254)
          const idealBoxHeight = idealLines.length * 4 + 7
          doc.roundedRect(margin + 2, currentY, contentWidth - 4, idealBoxHeight, 2, 2, 'FD')

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7.5)
          doc.setTextColor(...BRAND_BLUE)
          doc.text('IDEAL ANSWER STRUCTURE:', margin + 5, currentY + 4.5)

          doc.setFont('helvetica', 'normal')
          doc.setFontSize(8)
          doc.setTextColor(...TEXT_DARK)
          doc.text(idealLines, margin + 5, currentY + 8.5)

          currentY += idealBoxHeight + 3
        }
      } else {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(8)
        doc.setTextColor(...TEXT_MUTED)
        doc.text('Question skipped or left blank.', margin + 4, currentY + 4)
        currentY += 8
      }

      // Separator Line
      doc.setDrawColor(241, 245, 249)
      doc.line(margin, currentY, margin + contentWidth, currentY)
      currentY += 4
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER ON ALL PAGES
  // ═══════════════════════════════════════════════════════════════════════════
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...BORDER_COLOR)
    doc.line(margin, pageHeight - 12, margin + contentWidth, pageHeight - 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...TEXT_MUTED)
    doc.text('Skillzo AI Studio · Official AI Mock Interview Report', margin, pageHeight - 7.5)
    doc.text(`Page ${i} of ${totalPages}`, margin + contentWidth - 18, pageHeight - 7.5)
  }

  // ─── Trigger Download ─────────────────────────────────────────────────────
  const safeRole = String(session.job_role || 'Interview')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
  const dateStr = new Date().toISOString().slice(0, 10)
  const filename = `Skillzo_Interview_Report_${safeRole}_${dateStr}.pdf`

  doc.save(filename)
}
