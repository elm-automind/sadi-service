interface ImageValidationResult {
  isValid: boolean;
  imageType: "building" | "gate" | "door" | "unknown";
  confidence: number;
  reason: string;
}

export async function validateImage(
  base64Image: string,
  expectedType: "building" | "gate" | "door"
): Promise<ImageValidationResult> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("OpenAI API key not configured, skipping image validation");
    return {
      isValid: true,
      imageType: expectedType,
      confidence: 1.0,
      reason: "Validation skipped - API key not configured",
    };
  }

  try {
    const typeDescriptions = {
      building: "a building exterior, apartment complex, house, or residential/commercial building from outside",
      gate: "a gate, entrance gate, main gate, security gate, or entrance barrier of a property",
      door: "an apartment door, front door, entrance door, or door to a residential unit",
    };

    const prompt = `You are an image validation assistant for a delivery address system. Analyze this image and determine if it's a genuine photograph of ${typeDescriptions[expectedType]}.

Respond in JSON format with these fields:
- isValid: boolean (true if the image is a genuine photo of the expected type)
- imageType: string (one of "building", "gate", "door", or "unknown")
- confidence: number (0.0 to 1.0, how confident you are)
- reason: string (brief explanation of your decision)

Criteria for INVALID images:
- Not a photograph (drawings, sketches, diagrams, icons)
- Screenshot of a map or other application
- Random unrelated images (people, food, animals, etc.)
- Digitally generated or AI-generated fake images
- Extremely blurry or unrecognizable images
- Images with text overlays that obscure the subject
- Stock photos with watermarks

Criteria for VALID images:
- Clear photograph of the expected subject
- Can be slightly blurry but still recognizable
- Taken from various angles
- Can include people or vehicles if the main subject is still visible

Expected image type: ${expectedType}

Analyze the image and respond with JSON only.`;

    const imageUrl = base64Image.startsWith("data:") 
      ? base64Image 
      : `data:image/jpeg;base64,${base64Image}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                  detail: "low",
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{
        message: {
          content: string;
        };
      }>;
    };
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);
    
    return {
      isValid: result.isValid === true,
      imageType: result.imageType || "unknown",
      confidence: typeof result.confidence === "number" ? result.confidence : 0.5,
      reason: result.reason || "Unknown validation result",
    };
  } catch (error) {
    console.error("Image validation error:", error);
    
    return {
      isValid: true,
      imageType: expectedType,
      confidence: 0.5,
      reason: "Validation service temporarily unavailable",
    };
  }
}

export async function validateAllImages(
  images: {
    building?: string;
    gate?: string;
    door?: string;
  }
): Promise<{
  isValid: boolean;
  errors: { field: string; message: string }[];
  details: Record<string, ImageValidationResult>;
}> {
  const errors: { field: string; message: string }[] = [];
  const details: Record<string, ImageValidationResult> = {};

  const validations: Promise<void>[] = [];

  if (images.building) {
    validations.push(
      validateImage(images.building, "building").then((result) => {
        details.building = result;
        if (!result.isValid) {
          errors.push({
            field: "photoBuilding",
            message: `Building photo validation failed: ${result.reason}`,
          });
        }
      })
    );
  }

  if (images.gate) {
    validations.push(
      validateImage(images.gate, "gate").then((result) => {
        details.gate = result;
        if (!result.isValid) {
          errors.push({
            field: "photoGate",
            message: `Gate photo validation failed: ${result.reason}`,
          });
        }
      })
    );
  }

  if (images.door) {
    validations.push(
      validateImage(images.door, "door").then((result) => {
        details.door = result;
        if (!result.isValid) {
          errors.push({
            field: "photoDoor",
            message: `Door photo validation failed: ${result.reason}`,
          });
        }
      })
    );
  }

  await Promise.all(validations);

  return {
    isValid: errors.length === 0,
    errors,
    details,
  };
}
