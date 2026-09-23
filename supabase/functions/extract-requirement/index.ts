// Follow Deno and Supabase Edge Function standards
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type CategoryContext = {
  id: string
  name: string
  slug: string
}

type SubcategoryContext = {
  id: string
  name: string
  slug: string
}

type RequestPayload = {
  text?: string
  categories?: CategoryContext[]
  subcategories?: SubcategoryContext[]
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // 1. Validate OpenAI API key in server-side environment secrets
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey || apiKey.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: 'OPENAI_API_KEY is not configured in Supabase environment secrets',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // 2. Parse and validate request body
    const body = (await req.json().catch(() => null)) as RequestPayload | null
    const text = body?.text?.trim()
    if (!text || typeof text !== 'string' || text.length < 5) {
      return new Response(
        JSON.stringify({
          error: 'A valid requirement text of at least 5 characters is required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const categories = Array.isArray(body?.categories) ? body.categories : []
    const subcategories = Array.isArray(body?.subcategories) ? body.subcategories : []

    const categoryNames = categories.map((c) => c.name).join(', ')
    const subcategoryNames = subcategories.map((s) => s.name).join(', ')

    // 3. Construct prompt
    const systemPrompt = `You are an AI assistant for SuperHosur, a local commerce and industrial marketplace in Hosur, India.
Analyze the user requirement text and extract structured information.
Available categories: ${categoryNames || 'None specified'}.
Available subcategories: ${subcategoryNames || 'None specified'}.

Return a valid JSON object with:
- title: string (concise, clear requirement title)
- category: string or null (matching one of the available category names exactly, or null if unclear)
- subcategory: string or null (matching one of the available subcategory names exactly, or null if unclear)
- budget_min: number or null (INR numeric minimum budget or null)
- budget_max: number or null (INR numeric maximum budget or null)
- required_date: string or null (YYYY-MM-DD target deadline or null)
- duration: string or null (timeframe description like "Within 2 weeks", "Immediate", or null)
- location: string or null (Hosur locality like "SIPCOT Phase 2", "Bagalur Road", etc. or null)
- tags: array of strings (relevant domain keywords)
- confidence: number (float between 0.0 and 1.0 indicating confidence score)`

    // 4. Secure server-to-server call to OpenAI
    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    })

    if (!openAiResponse.ok) {
      console.error('OpenAI API error status:', openAiResponse.status)
      return new Response(
        JSON.stringify({ error: 'OpenAI API request failed on the server' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const openAiData = await openAiResponse.json()
    const rawContent = openAiData.choices?.[0]?.message?.content
    if (!rawContent) {
      return new Response(
        JSON.stringify({ error: 'Empty response received from OpenAI' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const parsed = JSON.parse(rawContent) as {
      title?: string
      category?: string
      subcategory?: string
      budget_min?: number
      budget_max?: number
      required_date?: string
      duration?: string
      location?: string
      tags?: string[]
      confidence?: number
    }

    // Match category and subcategory against provided IDs
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === (parsed.category || '').toLowerCase(),
    )
    const matchedSubcategory = subcategories.find(
      (s) => s.name.toLowerCase() === (parsed.subcategory || '').toLowerCase(),
    )

    const result = {
      suggestedTitle: parsed.title || null,
      suggestedCategoryId: matchedCategory?.id || null,
      suggestedCategoryName: matchedCategory?.name || null,
      suggestedSubcategoryId: matchedSubcategory?.id || null,
      suggestedSubcategoryName: matchedSubcategory?.name || null,
      budgetMin: typeof parsed.budget_min === 'number' ? parsed.budget_min : null,
      budgetMax: typeof parsed.budget_max === 'number' ? parsed.budget_max : null,
      currency: 'INR',
      requiredDate: parsed.required_date || null,
      duration: parsed.duration || null,
      location: parsed.location || null,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      attributes: {
        raw_prompt: text,
        model: 'gpt-4o-mini',
        extracted_at: new Date().toISOString(),
        source: 'supabase-edge-function',
      },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
      provider: 'openai',
    }

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge Function unhandled error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error processing extraction' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
