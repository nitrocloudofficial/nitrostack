import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { NextResponse } from "next/server"
import { z } from "zod"
import { chatRequestSchema } from "@/lib/validations"
import {
  buildRateLimitHeaders,
  consumeRateLimit,
  getRequestIdentifier,
} from "@/lib/server/rate-limit"
import { getSyncedEngine, persistFactory } from "@/lib/server/synced-engine"
import { requireAuthenticatedUser } from "@/lib/server/auth"

const COIMBATORE_CENTER = {
  lat: 11.0168,
  lng: 76.9558,
}

const registerFactorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  industryType: z.string().trim().min(2).max(100),
  address: z.string().trim().min(5).max(200),
  productionCapacity: z.string().trim().min(1).max(120),
  rawMaterials: z.array(z.string().trim().min(1)).max(25).default([]),
  declaredWastes: z.array(z.string().trim().min(1)).max(25).default([]),
})

function deterministicOffset(seed: string, range: number) {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000
  }
  return ((hash / 100000) - 0.5) * range
}

export async function POST(req: Request) {
  const rateLimit = consumeRateLimit({
    key: `chat:${getRequestIdentifier(req)}`,
    limit: 20,
    windowMs: 5 * 60 * 1000,
  })
  const rateLimitHeaders = buildRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many chat requests. Please wait a few minutes and try again." },
      { status: 429, headers: rateLimitHeaders }
    )
  }

  try {
    await requireAuthenticatedUser()
    const { messages } = chatRequestSchema.parse(await req.json())

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured." },
        { status: 503, headers: rateLimitHeaders }
      )
    }

    const engine = await getSyncedEngine()
    const clusterState = engine.getState()

    const factoryList = clusterState.factories
      .map((factory) => `- ${factory.name} [${factory.id}] (${factory.industryType}) - wastes: ${factory.declaredWastes.join(", ")}`)
      .join("\n")
    const matchList = clusterState.matches
      .slice(0, 10)
      .map((match) => `- ${match.wasteStreamName}: ${match.sourceFactoryName} -> ${match.targetFactoryName} (score: ${match.compatibilityScore}%)`)
      .join("\n")
    const productList = clusterState.products
      .slice(0, 5)
      .map((product) => `- ${product.name} - ${product.description} (feasibility: ${product.feasibilityScore}%)`)
      .join("\n")

    const systemPrompt = `You are the SymBioForge AI Assistant embedded inside the SymBioForge industrial symbiosis platform.
You help users manage their industrial symbiosis network.

CAPABILITIES:
- You can answer questions about factories, waste streams, matches, carbon metrics, and the platform.
- When users ask to create or register a factory, ask them for missing details, then output a JSON block that the system can parse:

\`\`\`REGISTER_FACTORY
{
  "name": "Factory Name",
  "industryType": "Chemical",
  "address": "Location",
  "productionCapacity": "500 tons/month",
  "rawMaterials": ["Material 1", "Material 2"],
  "declaredWastes": ["Waste 1", "Waste 2"]
}
\`\`\`

Valid waste names: Textile Sludge, Fly Ash, Chemical Effluent, Metal Slag, Plastic Scrap, Paper Pulp Waste, Organic Waste, E-Waste Dust, Packaging Offcuts, Pharma Sludge

CURRENT STATE:
- Swarm Active: ${clusterState.swarmActive}
- Total Factories: ${clusterState.factories.length}
- Total Matches: ${clusterState.matches.length}
- Total Products: ${clusterState.products.length}
- CO2 Avoided: ${clusterState.totalCo2Avoided} Tons
- Landfill Diverted: ${clusterState.totalLandfillDiverted} Tons
- Financial Value: INR ${clusterState.totalFinancialValue}

REGISTERED FACTORIES:
${factoryList}

TOP MATCHES:
${matchList}

PRODUCTS:
${productList}

Be concise, helpful, and professional. Use the data above for factual answers.`

    const groq = createGroq({
      apiKey: process.env.GROQ_API_KEY,
    })

    const result = await generateText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages,
    })

    let responseText = result.text
    const factoryBlocks = Array.from(responseText.matchAll(/```REGISTER_FACTORY\s*([\s\S]*?)```/g))

    for (const block of factoryBlocks) {
      try {
        const data = registerFactorySchema.parse(JSON.parse(block[1].trim()))
        const coordinateSeed = `${data.name}:${data.address}`
        const factory = engine.registerFactory({
          name: data.name,
          industryType: data.industryType,
          location: {
            lat: COIMBATORE_CENTER.lat + deterministicOffset(coordinateSeed, 0.08),
            lng: COIMBATORE_CENTER.lng + deterministicOffset(coordinateSeed.split("").reverse().join(""), 0.08),
            address: data.address,
          },
          productionCapacity: data.productionCapacity,
          rawMaterials: data.rawMaterials,
          declaredWastes: data.declaredWastes,
        })

        await persistFactory(factory)

        responseText = responseText.replace(
          block[0],
          `Factory "${factory.name}" registered successfully. (ID: ${factory.id})\n` +
            `- ${factory.wasteStreams?.length ?? 0} waste streams created\n` +
            `- Matchmaking re-run; ${engine.getMatches().length} total matches now\n` +
            "- Refresh the Factories page to see it."
        )
      } catch {
        responseText = responseText.replace(block[0], "Failed to register factory due to invalid data format.")
      }
    }

    return new Response(responseText, {
      headers: { ...rateLimitHeaders, "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (error: unknown) {
    const message =
      error instanceof z.ZodError
        ? error.issues[0]?.message ?? "Invalid chat request."
        : error instanceof Error
          ? error.message
          : String(error)

    console.error("AI Chat Error:", message)
    return NextResponse.json(
      { error: message },
      { status: error instanceof z.ZodError ? 400 : 500, headers: rateLimitHeaders }
    )
  }
}
