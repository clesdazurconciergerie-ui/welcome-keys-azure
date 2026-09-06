import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
      return new Response(JSON.stringify({ error: 'Google Maps connector not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let body: { address?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const address = (body.address ?? '').trim()
    if (address.length < 5 || address.length > 300) {
      return new Response(JSON.stringify({ error: 'Address must be between 5 and 300 characters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch(
      `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(address)}&language=fr&region=fr`,
      {
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'X-Connection-Api-Key': GOOGLE_MAPS_API_KEY,
        },
      },
    )

    if (response.status === 403) {
      const details: Array<{ reason?: string }> = (await response.json())?.error?.details ?? []
      const reason = details.find((d) => d.reason)?.reason
      if (reason === 'API_KEY_HTTP_REFERRER_BLOCKED') {
        throw new Error('Google Maps server key is referrer-restricted. Set its application restrictions to "None" or "IP addresses" in Google Cloud Console.')
      }
      if (reason === 'API_KEY_SERVICE_BLOCKED') {
        throw new Error('Google Maps server key does not allow the Geocoding API. Add it to the key allowed-APIs list in Google Cloud Console.')
      }
      throw new Error('Google Maps request was denied (403). Check the server key restrictions.')
    }
    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Geocode gateway failed [${response.status}]: ${errorBody}`)
      return new Response(JSON.stringify({ error: 'Geocoding request failed', status: response.status }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json()
    const result = data.results?.[0]
    if (!result) {
      return new Response(JSON.stringify({ found: false }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const components: Array<{ long_name: string; types: string[] }> = result.address_components ?? []
    const pick = (type: string) => components.find((c) => c.types.includes(type))?.long_name ?? null

    return new Response(JSON.stringify({
      found: true,
      lat: result.geometry?.location?.lat ?? null,
      lng: result.geometry?.location?.lng ?? null,
      formatted_address: result.formatted_address ?? null,
      city: pick('locality') ?? pick('postal_town') ?? pick('administrative_area_level_2'),
      postal_code: pick('postal_code'),
      district: pick('sublocality_level_1') ?? pick('neighborhood'),
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('geocode-address error:', e)
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
