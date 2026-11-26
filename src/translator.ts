import { translate } from 'google-translate-api-x';
import * as https from 'https';
import { Problem } from './types';

/**
 * Protects LaTeX math formulas ($...$ and $$...$$) by replacing them with safe tokens.
 */
function protectMath(text: string): { protectedText: string; tokens: string[] } {
  const tokens: string[] = [];

  // Protect display math first ($$...$$)
  let result = text.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
    const id = tokens.length;
    tokens.push(match);
    return ` __MATH_${id}__ `;
  });

  // Protect inline math ($...$)
  result = result.replace(/\$([^\$\n]+?)\$/g, (match) => {
    const id = tokens.length;
    tokens.push(match);
    return ` __MATH_${id}__ `;
  });

  return { protectedText: result, tokens };
}

/**
 * Restores math tokens back into the translated text.
 */
function restoreMath(translatedText: string, tokens: string[]): string {
  // Matches __MATH_0__, __ MATH_0 __, [[MATH_0]], [MATH_0], etc.
  return translatedText.replace(/(?:__|\[\[|\[)\s*MATH_?(\d+)\s*(?:__|\]\]|\])/gi, (match, idStr) => {
    const id = parseInt(idStr, 10);
    if (id >= 0 && id < tokens.length) {
      return tokens[id];
    }
    return match;
  });
}

/**
 * Translates text to Vietnamese using free Google Translate (with MyMemory fallback).
 */
async function translateWithGoogle(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  const { protectedText, tokens } = protectMath(text);

  try {
    const res = await translate(protectedText, { from: 'en', to: 'vi' });
    return restoreMath(res.text, tokens);
  } catch (err) {
    console.warn('Google Translate API failed, attempting fallback to MyMemory:', err);
    try {
      const fallback = await translateWithMyMemory(protectedText);
      return restoreMath(fallback, tokens);
    } catch (fallbackErr) {
      console.error('All translation providers failed, returning original text with math:', fallbackErr);
      return restoreMath(protectedText, tokens);
    }
  }
}

/**
 * Fallback translation using MyMemory API.
 */
async function translateWithMyMemory(text: string): Promise<string> {
  const chunks = text.split('\n\n');
  const translatedChunks: string[] = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) {
      translatedChunks.push(chunk);
      continue;
    }

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|vi`;
    const resText = await new Promise<string>((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 6000 }, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.responseData && json.responseData.translatedText) {
              resolve(json.responseData.translatedText);
            } else {
              resolve(chunk);
            }
          } catch {
            resolve(chunk);
          }
        });
      }).on('error', reject);
    });

    translatedChunks.push(resText);
  }

  return translatedChunks.join('\n\n');
}

/**
 * Translates text using Gemini API if key is provided.
 */
async function translateWithGemini(apiKey: string, prompt: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const body = JSON.stringify({
      contents: [{
        parts: [{
          text: `Bạn là chuyên gia lập trình thi đấu (Competitive Programming). Hãy dịch văn bản đề bài Codeforces sau sang Tiếng Việt thật tự nhiên, chính xác theo văn phong CP Việt Nam (VNOI/ICPC).\nQUAN TRỌNG NHẤT: GIỮ NGUYÊN 100% tất cả các ký tự toán học, công thức LaTeX ($...$, $$...$$), tên biến, hằng số, số học, điều kiện, không thay đổi hay dịch nhầm bất kỳ ký hiệu toán nào.\n\nĐề bài gốc:\n${prompt}`
        }]
      }]
    });

    const req = https.request({
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      },
      timeout: 15000
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const candidate = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidate) {
            resolve(candidate.trim());
          } else {
            reject(new Error('Invalid Gemini API response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Translates the entire Problem object into Vietnamese, preserving all math formulas.
 */
export async function translateProblem(problem: Problem, geminiApiKey?: string): Promise<Problem> {
  const result: Problem = { ...problem };

  if (geminiApiKey && geminiApiKey.trim().length > 0) {
    try {
      const fullPrompt = `Tiêu đề: ${problem.title}\n\nĐề bài:\n${problem.statement}\n\nĐầu vào (Input):\n${problem.inputSpecification}\n\nĐầu ra (Output):\n${problem.outputSpecification}${problem.note ? `\n\nGhi chú (Note):\n${problem.note}` : ''}`;
      
      const fullTranslation = await translateWithGemini(geminiApiKey.trim(), fullPrompt);
      result.translatedStatement = fullTranslation;
      result.translatedTitle = `[Dịch] ${problem.title}`;
      return result;
    } catch (err) {
      console.warn('Gemini translation failed, falling back to Google Translate:', err);
    }
  }

  // Translate each section with Google Translate + Math Protection
  const [statementVi, inputVi, outputVi, noteVi] = await Promise.all([
    translateWithGoogle(problem.statement),
    translateWithGoogle(problem.inputSpecification),
    translateWithGoogle(problem.outputSpecification),
    problem.note ? translateWithGoogle(problem.note) : Promise.resolve(undefined)
  ]);

  result.translatedTitle = `[Dịch] ${problem.title}`;
  result.translatedStatement = statementVi;
  result.translatedInputSpecification = inputVi;
  result.translatedOutputSpecification = outputVi;
  result.translatedNote = noteVi;

  return result;
}
