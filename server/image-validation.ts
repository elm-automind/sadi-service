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

    const prompt = `You are an image validation assistant for a delivery address system. Your job is to verify that uploaded images match their expected category EXACTLY.

CRITICAL: You MUST determine what type of subject is shown in this image and verify it matches the expected type.

Image Categories:
- "building": A building EXTERIOR view from OUTSIDE showing the facade, apartment complex exterior, house exterior, commercial building exterior. NOT a door, NOT a gate, NOT an interior.
- "gate": A gate, entrance gate, security gate, parking gate, main gate, or barrier that controls access to a property. NOT a door, NOT a building exterior.
- "door": An apartment door, front door, entrance door to a unit/apartment. This is the DOOR ITSELF (the panel that opens/closes), NOT a building exterior, NOT a gate.

EXPECTED IMAGE TYPE: "${expectedType}" (${typeDescriptions[expectedType]})

Analyze this image and respond in JSON format:
{
  "isValid": boolean (TRUE only if the image shows EXACTLY a ${expectedType}),
  "imageType": string ("building", "gate", "door", or "unknown" - what the image ACTUALLY shows),
  "confidence": number (0.0 to 1.0),
  "reason": string (explain your decision)
}

VALIDATION RULES:
1. If expected type is "building" but image shows a door or gate -> isValid: FALSE
2. If expected type is "gate" but image shows a door or building -> isValid: FALSE  
3. If expected type is "door" but image shows a building exterior or gate -> isValid: FALSE
4. Image must be a real photograph, not a drawing, screenshot, or AI-generated
5. Image must be clear enough to identify the subject

BE STRICT: A door photo uploaded as "building" is INVALID. A building photo uploaded as "door" is INVALID.

Respond with JSON only.`;

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
    
    const detectedType = result.imageType || "unknown";
    const confidence = typeof result.confidence === "number" ? result.confidence : 0.5;
    
    // Double-check: if the detected type doesn't match expected, mark as invalid
    const typeMatches = detectedType === expectedType;
    const isValid = result.isValid === true && typeMatches;
    
    let reason = result.reason || "Unknown validation result";
    if (!typeMatches && result.isValid === true) {
      reason = `Wrong image type: expected ${expectedType} but detected ${detectedType}`;
    }
    
    console.log(`Image validation for ${expectedType}: detected=${detectedType}, isValid=${isValid}, confidence=${confidence}`);
    
    return {
      isValid,
      imageType: detectedType,
      confidence,
      reason,
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
