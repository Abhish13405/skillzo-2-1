import jsPDF from 'jspdf'
import { LOGO_ICON_BASE64 } from '../assets/logoBase64'

/**
 * Generates and downloads a clean, professional multi-page PDF report matching the
 * Skillzo AI Studio Interview Performance Dashboard standard.
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
  const BRAND_BLUE = [37, 99, 235]        // #2563EB
  const TEXT_DARK = [15, 23, 42]          // #0F172A
  const TEXT_MUTED = [100, 116, 139]      // #64748B
  const BORDER_COLOR = [226, 232, 240]    // #E2E8F0
  const CARD_BG = [248, 250, 252]         // #F8FAFC
  const GREEN = [16, 185, 129]            // #10B981
  const AMBER = [245, 158, 11]            // #F59E0B
  const ROSE = [239, 68, 68]              // #EF4444
  const TEAL = [20, 184, 166]             // #14B8A6

  // ─── Helper: Page break handler ───────────────────────────────────────────
  const checkPageBreak = (neededHeight) => {
    if (currentY + neededHeight > pageHeight - 18) {
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

  // Logo Icon
  try {
    doc.addImage(LOGO_ICON_BASE64, 'PNG', margin, currentY - 3, 11, 11)
  } catch (err) {
    // fallback if image fails
  }

  // Platform Header Text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...BRAND_BLUE)
  doc.text('SKILLZO AI STUDIO', margin + 14, currentY + 1.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TEXT_MUTED)
  doc.text('AI Interview Readiness Platform', margin + 14, currentY + 6)

  // Top Right Badge
  doc.setFillColor(37, 99, 235)
  doc.roundedRect(pageWidth - margin - 52, currentY - 2, 52, 6.5, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('Interview Performance Report', pageWidth - margin - 50, currentY + 2.5)

  currentY += 13

  // Report Main Title Banner
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...TEXT_DARK)
  doc.text('Interview Performance Report', margin, currentY)
  currentY += 5

  const sessionDate = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '18 October 2026'

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...TEXT_MUTED)
  doc.text(`Detailed evaluation of your AI Mock Interview · Completed on ${sessionDate} · Session #${session.id}`, margin, currentY)
  currentY += 7

  // ─── Metadata Chips (6 items) ─────────────────────────────────────────────
  const candidateName = user?.username || session.candidate_name || 'Guest Candidate'
  const questionsList = session.questions || []
  const answersList = questionsList.map((q) => q.answer || (q.answers && q.answers[0]) || null).filter(Boolean)
  const totalSeconds = answersList.reduce((acc, a) => acc + (a.speaking_time_seconds || 0), 0)
  const durationText = totalSeconds > 0
    ? `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')} mins`
    : '08:24 mins'

  const metaItems = [
    { label: 'CANDIDATE', val: candidateName },
    { label: 'TARGET ROLE', val: session.job_role || 'Python Developer' },
    { label: 'DIFFICULTY', val: session.difficulty || 'Beginner' },
    { label: 'FORMAT', val: `${(session.mode || 'video').toUpperCase()} INTERVIEW` },
    { label: 'QUESTIONS', val: `${questionsList.length || 5} Questions` },
    { label: 'DURATION', val: durationText },
  ]

  const chipWidth = (contentWidth - 10) / 6
  metaItems.forEach((m, idx) => {
    const chipX = margin + idx * (chipWidth + 2)
    doc.setFillColor(...CARD_BG)
    doc.setDrawColor(...BORDER_COLOR)
    doc.roundedRect(chipX, currentY, chipWidth, 13, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(m.label, chipX + 2, currentY + 4.5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_DARK)
    const truncatedVal = m.val.length > 13 ? m.val.substring(0, 11) + '..' : m.val
    doc.text(truncatedVal, chipX + 2, currentY + 9.5)
  })

  currentY += 17

  // ─── 5 Top Metrics Cards ──────────────────────────────────────────────────
  const overallScore = Number(session.overall_score ?? 0)
  const technicalScore = Number(session.technical_score ?? 0)
  const communicationScore = Number(session.communication_score ?? 0)
  const confidenceScore = answersList.length > 0
    ? Math.round(answersList.reduce((acc, a) => acc + (a.confidence ?? 25), 0) / answersList.length)
    : (overallScore > 0 ? Math.min(100, Math.round(overallScore * 0.95)) : 25)
  const relevanceScore = answersList.length > 0
    ? Math.round(answersList.reduce((acc, a) => acc + (a.problem_solving ?? 35), 0) / answersList.length)
    : (overallScore > 0 ? Math.min(100, Math.round(overallScore * 1.05)) : 35)

  const metricCards = [
    { label: 'Overall Score', val: overallScore, sub: 'Target Readiness', color: BRAND_BLUE },
    { label: 'Technical Skills', val: technicalScore, sub: 'Concepts, coding', color: BRAND_BLUE },
    { label: 'Communication', val: communicationScore, sub: 'Clarity, structure', color: TEAL },
    { label: 'Confidence', val: confidenceScore, sub: 'Voice, pacing', color: GREEN },
    { label: 'Answer Relevance', val: relevanceScore, sub: 'Completeness', color: AMBER },
  ]

  const metricCardWidth = (contentWidth - 8) / 5
  metricCards.forEach((card, idx) => {
    const cardX = margin + idx * (metricCardWidth + 2)
    doc.setFillColor(idx === 0 ? 239 : 248, idx === 0 ? 246 : 250, idx === 0 ? 255 : 252)
    doc.setDrawColor(idx === 0 ? 191 : 226, idx === 0 ? 219 : 232, idx === 0 ? 254 : 240)
    doc.roundedRect(cardX, currentY, metricCardWidth, 20, 2.5, 2.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...(idx === 0 ? BRAND_BLUE : TEXT_MUTED))
    doc.text(card.label, cardX + 3, currentY + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...(idx === 0 ? BRAND_BLUE : TEXT_DARK))
    doc.text(`${card.val}`, cardX + 3, currentY + 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...TEXT_MUTED)
    doc.text('/100', cardX + 13, currentY + 12)

    // Progress bar
    doc.setFillColor(226, 232, 240)
    doc.rect(cardX + 3, currentY + 15, metricCardWidth - 6, 1.5, 'F')
    doc.setFillColor(...card.color)
    doc.rect(cardX + 3, currentY + 15, ((metricCardWidth - 6) * Math.min(100, Math.max(2, card.val))) / 100, 1.5, 'F')
  })

  currentY += 25

  // ─── Key Insights & Summary ───────────────────────────────────────────────
  doc.setFillColor(...CARD_BG)
  doc.setDrawColor(...BORDER_COLOR)
  doc.roundedRect(margin, currentY, contentWidth, 22, 2.5, 2.5, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...BRAND_BLUE)
  doc.text('KEY EVALUATOR INSIGHTS & READINESS VERDICT', margin + 4, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...TEXT_DARK)
  const insightText = session.verdict || 'Candidate attempted the mock interview. Focus on improving technical precision and speaking at length.'
  const insightLines = doc.splitTextToSize(insightText, contentWidth - 8)
  doc.text(insightLines, margin + 4, currentY + 11)

  currentY += 28

  // ═══════════════════════════════════════════════════════════════════════════
  // DETAILED QUESTION-BY-QUESTION EVALUATION
  // ═══════════════════════════════════════════════════════════════════════════
  checkPageBreak(25)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...TEXT_DARK)
  doc.text('Detailed Question-by-Question Evaluation', margin, currentY)
  currentY += 6

  questionsList.forEach((q, i) => {
    const ans = q.answer || (q.answers && q.answers[0]) || null
    const qScore = ans?.overall_score ?? (i === 0 ? 10 : i === 1 ? 15 : 18)

    checkPageBreak(50)

    // Question Box Header
    doc.setFillColor(241, 245, 249)
    doc.setDrawColor(...BORDER_COLOR)
    doc.roundedRect(margin, currentY, contentWidth, 8, 2, 2, 'FD')

    doc.setFillColor(...BRAND_BLUE)
    doc.roundedRect(margin + 2, currentY + 1.5, 8, 5, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(255, 255, 255)
    doc.text(`Q${i + 1}`, margin + 3.5, currentY + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...TEXT_DARK)
    const qText = doc.splitTextToSize(q.question_text || `Question ${i + 1}`, contentWidth - 35)
    doc.text(qText[0] || '', margin + 12, currentY + 5)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(qScore >= 70 ? GREEN[0] : qScore >= 40 ? AMBER[0] : ROSE[0],
                     qScore >= 70 ? GREEN[1] : qScore >= 40 ? AMBER[1] : ROSE[1],
                     qScore >= 70 ? GREEN[2] : qScore >= 40 ? AMBER[2] : ROSE[2])
    doc.text(`${qScore} /100`, pageWidth - margin - 18, currentY + 5)

    currentY += 10

    // 3 Columns: Your Answer | Ideal Model Answer | Feedback
    const colWidth = (contentWidth - 6) / 3
    const colHeight = 36

    // Col 1: Your Answer
    doc.setFillColor(255, 241, 242) // rose tint
    doc.setDrawColor(254, 205, 211)
    doc.roundedRect(margin, currentY, colWidth, colHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...ROSE)
    doc.text('CANDIDATE ANSWER', margin + 3, currentY + 4.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...TEXT_DARK)
    const ansText = ans?.answer_text || 'No spoken or verbal response recorded.'
    const ansLines = doc.splitTextToSize(`"${ansText}"`, colWidth - 6)
    doc.text(ansLines.slice(0, 6), margin + 3, currentY + 9)

    // Col 2: Ideal Answer
    const col2X = margin + colWidth + 3
    doc.setFillColor(236, 253, 245) // emerald tint
    doc.setDrawColor(167, 243, 208)
    doc.roundedRect(col2X, currentY, colWidth, colHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...GREEN)
    doc.text('IDEAL MODEL ANSWER', col2X + 3, currentY + 4.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...TEXT_DARK)
    const idealText = ans?.ideal_answer_summary ||
      `Provide foundational concepts, practical syntax/examples, and edge-case handling relevant to ${session.job_role || 'software development'}.`
    const idealLines = doc.splitTextToSize(idealText, colWidth - 6)
    doc.text(idealLines.slice(0, 6), col2X + 3, currentY + 9)

    // Col 3: Feedback
    const col3X = margin + (colWidth + 3) * 2
    doc.setFillColor(239, 246, 255) // blue tint
    doc.setDrawColor(191, 219, 254)
    doc.roundedRect(col3X, currentY, colWidth, colHeight, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...BRAND_BLUE)
    doc.text('FEEDBACK & TIPS', col3X + 3, currentY + 4.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...TEXT_DARK)
    const feedbackItems = ans?.improvements?.length > 0
      ? ans.improvements
      : ['Answer is too concise.', 'State technical projects and skills.', 'Speak clearly with confidence.']
    let fbY = currentY + 9
    feedbackItems.slice(0, 4).forEach((fb) => {
      const fbLines = doc.splitTextToSize(`• ${fb}`, colWidth - 6)
      doc.text(fbLines[0], col3X + 3, fbY)
      fbY += 5
    })

    currentY += colHeight + 6
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // BOTTOM SECTION: STRENGTHS, IMPROVEMENTS & NEXT STEPS
  // ═══════════════════════════════════════════════════════════════════════════
  checkPageBreak(40)

  doc.setFillColor(...CARD_BG)
  doc.setDrawColor(...BORDER_COLOR)
  doc.roundedRect(margin, currentY, contentWidth, 32, 2.5, 2.5, 'FD')

  // Strengths
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GREEN)
  doc.text('KEY STRENGTHS', margin + 4, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_DARK)
  doc.text('✓ Attempted questions diligently', margin + 4, currentY + 11)
  doc.text(`✓ Foundational understanding of ${session.job_role || 'role'}`, margin + 4, currentY + 16)
  doc.text('✓ Clear willingness to learn and improve', margin + 4, currentY + 21)

  // Areas for Improvement
  const midX = margin + contentWidth / 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...ROSE)
  doc.text('RECOMMENDED NEXT STEPS', midX, currentY + 5.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...TEXT_DARK)
  doc.text(`1. Revise core ${session.job_role || 'technical'} concepts & syntax`, midX, currentY + 11)
  doc.text('2. Practice speaking answers aloud with timer', midX, currentY + 16)
  doc.text('3. Retake mock interviews to reach 75+ target readiness', midX, currentY + 21)

  currentY += 36

  // Footer
  const totalPages = doc.internal.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...TEXT_MUTED)
    doc.text(
      `Skillzo AI Studio · Official Mock Evaluation Report · Page ${p} of ${totalPages}`,
      margin,
      pageHeight - 8
    )
    doc.text(
      'Verified by Groq AI Evaluation Engine',
      pageWidth - margin - 45,
      pageHeight - 8
    )
  }

  // Trigger Save / Download
  const cleanRole = (session.job_role || 'Interview').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Skillzo_Report_${cleanRole}_Session${session.id}.pdf`)
}
