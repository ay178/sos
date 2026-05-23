import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const client = new Anthropic()

const INFERENCE_URL = process.env.INFERENCE_SERVER_URL || 'http://localhost:8001'

const schema = z.object({
  accident_type:  z.string().optional().default('Unknown'),
  victim_count:   z.string().optional().default('Unknown'),
  description:    z.string().optional().default(''),
  image_base64:   z.string().optional(),   // base64 photo from phone camera
  photo_captured: z.boolean().optional().default(false),
  lat:            z.number(),
  lng:            z.number(),
  road_type:      z.string().optional().default('unknown road'),
  time_of_day:    z.string().optional(),
})

// ── Call your trained Keras model ──────────────────────────────────────────
async function runModelInference(image_base64: string): Promise<{
  severity: string; score: number; confidence: number;
  probabilities: Record<string, number>; stub: boolean
} | null> {
  try {
    const res = await fetch(`${INFERENCE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64 }),
      signal: AbortSignal.timeout(8000),  // 8s timeout
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    console.warn('[analyze] Inference server unreachable — skipping CV')
    return null
  }
}

// ── Call Claude for NLP + location + final reasoning ──────────────────────
async function runClaudeAnalysis(data: z.infer<typeof schema>, cvResult: {
  severity: string; score: number; confidence: number;
  probabilities: Record<string, number>; stub: boolean
} | null): Promise<object> {
  const hour = new Date().getHours()
  const timeLabel = data.time_of_day ||
    (hour >= 22 || hour <= 5 ? 'night' : hour >= 6 && hour <= 9 ? 'morning rush' : 'daytime')

  // Build CV context for Claude
  const cvContext = cvResult
    ? `Computer vision model result:
  - Model severity: ${cvResult.severity} (confidence ${cvResult.confidence}%)
  - Class probabilities: ${JSON.stringify(cvResult.probabilities)}
  - Model score: ${cvResult.score}/10
  - Note: ${cvResult.stub ? 'Model not loaded — this is a stub result' : 'Trained MobileNetV2 model output'}`
    : 'Computer vision: No image provided — skip CV analysis'

  const prompt = `You are the RoadSoS AI severity analysis engine for road accident emergency response in India.

Your job is to fuse THREE signals into one severity assessment:
1. Computer vision model output (MobileNetV2 trained on accident images)
2. NLP analysis of reporter text
3. Location / environmental context

${cvContext}

Reporter inputs:
- Accident type: ${data.accident_type}
- Victims visible: ${data.victim_count}
- Description: ${data.description || 'Not provided'}
- Photo captured: ${data.photo_captured}
- GPS: ${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}
- Road context: ${data.road_type}
- Time: ${timeLabel}

Fusion rules:
- If CV model confidence > 80%: weight CV result heavily (50%)
- If CV model confidence 60-80%: balanced fusion
- If CV confidence < 60% or no image: rely more on NLP + location
- Always escalate to Critical if ANY signal strongly suggests it
- Never downgrade below the CV model's output unless NLP clearly contradicts

Respond ONLY with valid JSON, no markdown:
{
  "severity": "Critical" | "Serious" | "Minor",
  "score": <1-10>,
  "confidence": <70-99>,
  "summary": "<2 clinical sentences, max 50 words>",
  "cv_finding": "<max 10 words — CV model interpretation>",
  "nlp_finding": "<max 10 words — key signal from text>",
  "location_finding": "<max 10 words — location risk factor>",
  "recommendation": "<max 15 words — hospital capability required>",
  "cv_weight_used": <0.0-1.0>,
  "fusion_note": "<one sentence on how signals were combined>"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')
    .replace(/```json|```/g, '')
    .trim()

  return JSON.parse(raw)
}

// ── Main handler ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Run model inference + Claude in parallel when image is available
    const [cvResult, claudeBase] = await Promise.allSettled([
      data.image_base64
        ? runModelInference(data.image_base64)
        : Promise.resolve(null),
      // Claude starts immediately with what we have; we'll enrich if CV finishes
      Promise.resolve(null),
    ])

    const cv = cvResult.status === 'fulfilled' ? cvResult.value : null

    // Now run Claude with CV result baked in
    let analysis: Record<string, unknown>
    try {
      analysis = await runClaudeAnalysis(data, cv) as Record<string, unknown>
    } catch (e) {
      console.error('[analyze] Claude failed:', e)
      // If Claude fails but we have CV, use CV result directly
      if (cv && !cv.stub) {
        analysis = {
          severity:         cv.severity,
          score:            cv.score,
          confidence:       cv.confidence,
          summary:          `Model-only analysis: ${cv.severity} severity detected with ${cv.confidence}% confidence.`,
          cv_finding:       `MobileNetV2: ${cv.severity} @ ${cv.confidence}%`,
          nlp_finding:      'Claude unavailable',
          location_finding: 'Location analysis skipped',
          recommendation:   cv.severity === 'Critical' ? 'Level 1 trauma center required' : 'Emergency care required',
          cv_weight_used:   1.0,
          fusion_note:      'Claude unavailable — using CV model output only',
        }
      } else {
        // Full fallback
        analysis = {
          severity: 'Serious', score: 6, confidence: 70,
          summary: 'Analysis engine temporarily unavailable. Defaulting to Serious for safety.',
          cv_finding: 'CV unavailable', nlp_finding: 'NLP unavailable',
          location_finding: 'Location pending', recommendation: 'Trauma center with ICU required',
          cv_weight_used: 0, fusion_note: 'Full fallback — manual assessment recommended',
        }
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      model_used: cv !== null && !cv.stub,
      cv_raw: cv,
    })

  } catch (e) {
    console.error('/api/analyze error:', e)
    return NextResponse.json({
      success: true,
      analysis: {
        severity: 'Serious', score: 6, confidence: 72,
        summary: 'Analysis unavailable. Defaulting to Serious severity for safety. Manual assessment required.',
        cv_finding: 'Model unavailable',
        nlp_finding: 'NLP unavailable',
        location_finding: 'Location context pending',
        recommendation: 'Trauma center with ICU capability required',
        cv_weight_used: 0,
        fusion_note: 'Full system fallback',
      },
      model_used: false,
      cv_raw: null,
    })
  }
}
