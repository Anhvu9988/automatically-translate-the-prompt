import { execFile } from 'child_process';
import * as https from 'https';
import * as cheerio from 'cheerio';
import { Problem, TestCase } from './types';

/**
 * Parses problem code input into contestId and problemIndex.
 * Supports: "2044A", "2044/A", "2044-A", "https://codeforces.com/contest/2044/problem/A", etc.
 */
export function parseProblemId(input: string): { contestId: string; index: string } | null {
  const trimmed = input.trim();

  // Try URL patterns
  const urlMatch = trimmed.match(/(?:contest|problemset\/problem|gym)\/(\d+)(?:\/problem)?\/([a-zA-Z0-9]+)/i);
  if (urlMatch) {
    return {
      contestId: urlMatch[1],
      index: urlMatch[2].toUpperCase()
    };
  }

  // Try "2044A", "2044/A", "2044-A", "2044 A"
  const codeMatch = trimmed.match(/^(\d+)[\s\/\-_]?([a-zA-Z][a-zA-Z0-9]*)$/i);
  if (codeMatch) {
    return {
      contestId: codeMatch[1],
      index: codeMatch[2].toUpperCase()
    };
  }

  return null;
}

/**
 * Fetches HTML using system curl (bypasses Cloudflare JA3 checks reliably)
 * with fallback to Node.js https.
 */
export async function fetchHtml(url: string, cookie?: string): Promise<string> {
  const headers = [
    '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    '-H', 'Accept-Language: en-US,en;q=0.9,vi;q=0.8'
  ];

  if (cookie) {
    headers.push('-H', `Cookie: ${cookie}`);
  }

  // Primary: curl
  try {
    const html = await new Promise<string>((resolve, reject) => {
      execFile('curl', ['-s', '-L', url, ...headers], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          return reject(err);
        }
        resolve(stdout);
      });
    });

    if (html && html.includes('problem-statement')) {
      return html;
    }
  } catch (err) {
    console.warn('Curl fetch failed or not found, falling back to HTTPS request:', err);
  }

  // Fallback: Node.js https
  return new Promise<string>((resolve, reject) => {
    const reqHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    };
    if (cookie) {
      reqHeaders['Cookie'] = cookie;
    }

    https.get(url, { headers: reqHeaders }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location, cookie).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Converts a Cheerio element's HTML to markdown with math preserved.
 */
function elementToMarkdown($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
  // Convert older .tex-span into math
  el.find('.tex-span').each((_, span) => {
    const text = $(span).text().trim();
    $(span).replaceWith(`$${text}$`);
  });

  // Convert Codeforces $$$formula$$$ into $formula$
  // and $$$$formula$$$$ into $$formula$$
  let html = el.html() || '';
  
  // Replace <p>...</p> with paragraphs
  const temp = cheerio.load(`<div>${html}</div>`);
  
  const paragraphs: string[] = [];
  temp('div').children().each((_, child) => {
    const tagName = (child as any).tagName?.toLowerCase();
    const $child = temp(child);

    if (tagName === 'p') {
      paragraphs.push(cleanText($child.text()));
    } else if (tagName === 'ul') {
      const items: string[] = [];
      $child.find('li').each((_, li) => {
        items.push(`- ${cleanText(temp(li).text())}`);
      });
      if (items.length > 0) {
        paragraphs.push(items.join('\n'));
      }
    } else if (tagName === 'ol') {
      const items: string[] = [];
      $child.find('li').each((idx, li) => {
        items.push(`${idx + 1}. ${cleanText(temp(li).text())}`);
      });
      if (items.length > 0) {
        paragraphs.push(items.join('\n'));
      }
    } else {
      const txt = cleanText($child.text());
      if (txt) {
        paragraphs.push(txt);
      }
    }
  });

  if (paragraphs.length === 0) {
    return cleanText(el.text());
  }

  return paragraphs.join('\n\n');
}

function cleanText(text: string): string {
  return text
    // Replace quadruple dollars with double dollars ($$display math$$)
    .replace(/\$\$\$\$([\s\S]*?)\$\$\$\$/g, '$$$1$$')
    // Replace triple dollars with single dollar ($inline math$)
    .replace(/\$\$\$([\s\S]*?)\$\$\$/g, '$$$1$$')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Extracts sample test cases from .sample-test container.
 */
function extractSampleTests($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>): TestCase[] {
  const tests: TestCase[] = [];
  
  container.find('.sample-test').each((_, sample) => {
    const inputs: string[] = [];
    const outputs: string[] = [];

    $(sample).find('.input').each((_, inEl) => {
      const pre = $(inEl).find('pre');
      // In newer Codeforces, pre may have <div class="test-example-line">
      const lines: string[] = [];
      const testLines = pre.find('.test-example-line');
      if (testLines.length > 0) {
        testLines.each((_, line) => {
          lines.push($(line).text());
        });
        inputs.push(lines.join('\n').trim());
      } else {
        // Handle <br> tags properly
        pre.find('br').replaceWith('\n');
        inputs.push(pre.text().trim());
      }
    });

    $(sample).find('.output').each((_, outEl) => {
      const pre = $(outEl).find('pre');
      pre.find('br').replaceWith('\n');
      outputs.push(pre.text().trim());
    });

    for (let i = 0; i < Math.min(inputs.length, outputs.length); i++) {
      tests.push({
        input: inputs[i] + '\n',
        output: outputs[i] + '\n'
      });
    }
  });

  return tests;
}

/**
 * Main fetch function: scrapes and parses Codeforces problem into structured Problem object.
 */
export async function fetchProblem(contestId: string, index: string, cookie?: string): Promise<Problem> {
  const urls = [
    `https://codeforces.com/problemset/problem/${contestId}/${index}`,
    `https://codeforces.com/contest/${contestId}/problem/${index}`
  ];

  let html = '';
  let finalUrl = urls[0];

  for (const url of urls) {
    try {
      const res = await fetchHtml(url, cookie);
      if (res.includes('problem-statement')) {
        html = res;
        finalUrl = url;
        break;
      }
    } catch {
      // try next
    }
  }

  if (!html || !html.includes('problem-statement')) {
    throw new Error(`Không thể tìm thấy đề bài Codeforces ${contestId}${index}. Vui lòng kiểm tra lại mã bài hoặc kết nối mạng.`);
  }

  const $ = cheerio.load(html);
  const root = $('.problem-statement');

  const title = root.find('.header .title').text().trim() || `${index}. Problem ${contestId}${index}`;
  const timeLimit = root.find('.header .time-limit').clone().children().remove().end().text().trim() || '1 second';
  const memoryLimit = root.find('.header .memory-limit').clone().children().remove().end().text().trim() || '256 megabytes';

  // Statement body is the div immediately following the header
  const statementEl = root.find('.header').next('div');
  const statement = elementToMarkdown($, statementEl);

  // Input specification
  const inputEl = root.find('.input-specification');
  inputEl.find('.section-title').remove();
  const inputSpecification = elementToMarkdown($, inputEl);

  // Output specification
  const outputEl = root.find('.output-specification');
  outputEl.find('.section-title').remove();
  const outputSpecification = elementToMarkdown($, outputEl);

  // Sample tests
  const sampleTests = extractSampleTests($, root.find('.sample-tests'));

  // Note
  const noteEl = root.find('.note');
  let note: string | undefined = undefined;
  if (noteEl.length > 0) {
    noteEl.find('.section-title').remove();
    note = elementToMarkdown($, noteEl);
  }

  return {
    contestId,
    index,
    code: `${contestId}${index}`,
    title,
    timeLimit,
    memoryLimit,
    statement,
    inputSpecification,
    outputSpecification,
    sampleTests,
    note,
    url: finalUrl
  };
}
