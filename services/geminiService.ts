
// @google/genai Coding Guidelines followed: Using named parameter for API Key and correct model aliases.
import { GoogleGenAI, Modality } from "@google/genai";
import { Message, Role } from "../types";

// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export class GeminiService {
  /**
   * Generates content with optional Maps and Search Grounding.
   */
  static async *streamChat(
    history: Message[], 
    userInput: string, 
    userImage?: string, 
    deepThink: boolean = false,
    location?: { latitude: number, longitude: number },
    modelOverride?: string
  ) {
    const ai = getAI();
    
    // Determine the base model
    const isLocationQuery = /near|location|restaurant|place|where|map|address/i.test(userInput);
    // Basic Text Tasks: 'gemini-3-flash-preview'
    let model = 'gemini-3-flash-preview';
    
    if (modelOverride) {
      model = modelOverride;
    } else if (isLocationQuery) {
      // gemini lite or flash lite: 'gemini-flash-lite-latest'
      model = 'gemini-flash-lite-latest';
    } else if (deepThink) {
      // Complex Text Tasks: 'gemini-3-pro-preview'
      model = 'gemini-3-pro-preview';
    }
    
    const currentParts: any[] = [];
    if (userInput.trim()) currentParts.push({ text: userInput.trim() });

    if (userImage) {
      const [mimeInfo, base64Data] = userImage.split(';base64,');
      currentParts.push({
        inlineData: {
          mimeType: mimeInfo.split(':')[1] || 'image/png',
          data: base64Data,
        },
      });
    }

    const contents = history.map(msg => ({
      role: msg.role === Role.ASSISTANT ? 'model' : 'user',
      parts: [
        { text: msg.content || " " },
        ...(msg.image ? [{
          inlineData: {
            mimeType: 'image/png',
            data: msg.image.includes('base64,') ? msg.image.split('base64,')[1] : msg.image
          }
        }] : [])
      ]
    }));

    contents.push({ role: 'user', parts: currentParts });

    try {
      const responseStream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: "You are Lumina, a premium AI. Use markdown. If search or maps grounding is used, emphasize the findings and provide context.",
          // Thinking budget set correctly for supported models.
          thinkingConfig: (model.includes('pro') || deepThink) && !isLocationQuery ? { thinkingBudget: 16000 } : undefined,
          // googleMaps may be used with googleSearch as per guidelines.
          tools: isLocationQuery ? [{ googleMaps: {} }, { googleSearch: {} }] : [{ googleSearch: {} }],
          toolConfig: (isLocationQuery && location) ? {
            retrievalConfig: {
              latLng: { latitude: location.latitude, longitude: location.longitude }
            }
          } : undefined
        }
      });

      for await (const chunk of responseStream) {
        // Accessing .text as a property, not a method.
        if (chunk.text) yield { text: chunk.text, grounding: chunk.candidates?.[0]?.groundingMetadata };
      }
    } catch (error: any) {
      console.error("Gemini Error:", error);
      yield { text: "I've encountered a disruption. Please check your connection." };
    }
  }

  /**
   * Edits an existing image based on a text prompt.
   */
  static async editImage(image: string, prompt: string): Promise<string | null> {
    const ai = getAI();
    try {
      const [mimeInfo, base64Data] = image.split(';base64,');
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeInfo.split(':')[1] } },
            { text: prompt }
          ]
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
      return null;
    } catch (error: any) {
      console.error("Image Edit Error:", error);
      return null;
    }
  }

  /**
   * Generates a video using Veo 3.1.
   */
  static async generateVideo(image: string, prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string | null> {
    const ai = getAI();
    try {
      const [mimeInfo, base64Data] = image.split(';base64,');
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: {
          imageBytes: base64Data,
          mimeType: mimeInfo.split(':')[1] || 'image/png',
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) return null;
      
      // Append API key when fetching from the download link.
      const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error: any) {
      console.error("Veo Error:", error);
      return null;
    }
  }

  /**
   * Generates a new image based on a prompt.
   */
  static async generateImage(prompt: string): Promise<string | null> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: [{ parts: [{ text: prompt }] }],
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
      return null;
    } catch (error) { return null; }
  }

  /**
   * Generates raw PCM audio from text using Gemini TTS.
   */
  static async generateAudio(text: string): Promise<Uint8Array | null> {
    const ai = getAI();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        },
      });
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Implementation of base64 to Uint8Array as per guidelines.
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }
      return null;
    } catch (error) { return null; }
  }

  /**
   * Decodes raw PCM audio bytes to an AudioBuffer.
   */
  static async decodeAudio(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }
}
