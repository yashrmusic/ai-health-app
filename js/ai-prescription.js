// AI Prescription Analysis using Gemini
export async function analyzePrescription(imageFile, apiKey) {
    if (!apiKey) {
        throw new Error('Gemini API key not configured');
    }

    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

    const systemPrompt = "You are a helpful medical assistant. Analyze the provided prescription image and extract the list of medicines. For each medicine, provide its name, a simple one-sentence explanation of its purpose, and the dosage instructions. Also provide a brief overall summary of the prescription. Respond ONLY with the requested JSON object.";

    const schema = {
        type: "OBJECT",
        properties: {
            "summary": { "type": "STRING" },
            "medicines": {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        "name": { "type": "STRING" },
                        "purpose": { "type": "STRING" },
                        "dosage": { "type": "STRING" }
                    },
                    required: ["name", "purpose", "dosage"]
                }
            }
        },
        required: ["summary", "medicines"]
    };

    const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: "Analyze this prescription and return the JSON." },
                {
                    inlineData: {
                        mimeType: imageFile.type,
                        data: base64Image
                    }
                }
            ]
        }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const result = await response.json();
        const candidate = result.candidates?.[0];
        
        if (candidate && candidate.content?.parts?.[0]?.text) {
            const jsonText = candidate.content.parts[0].text;
            return JSON.parse(jsonText);
        } else {
            throw new Error("Invalid response structure from AI.");
        }
    } catch (error) {
        console.error("Error analyzing prescription:", error);
        throw error;
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

