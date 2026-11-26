import * as fs from 'fs';
import * as path from 'path';
import { Problem } from './types';

export function generateVietnameseMarkdown(problem: Problem): string {
  const parts: string[] = [];

  parts.push(`# ${problem.title} (Bản dịch Tiếng Việt)`);
  parts.push(`- **Mã bài**: [${problem.code}](${problem.url})`);
  parts.push(`- **Thời gian chạy tối đa**: \`${problem.timeLimit}\``);
  parts.push(`- **Giới hạn bộ nhớ**: \`${problem.memoryLimit}\``);
  parts.push(`\n---\n`);

  parts.push(`## Đề bài\n`);
  parts.push(problem.translatedStatement || problem.statement);
  parts.push(`\n`);

  parts.push(`## Quy cách dữ liệu vào (Input)\n`);
  parts.push(problem.translatedInputSpecification || problem.inputSpecification);
  parts.push(`\n`);

  parts.push(`## Quy cách dữ liệu ra (Output)\n`);
  parts.push(problem.translatedOutputSpecification || problem.outputSpecification);
  parts.push(`\n`);

  if (problem.sampleTests.length > 0) {
    parts.push(`## Ví dụ (Examples)\n`);
    for (let i = 0; i < problem.sampleTests.length; i++) {
      const test = problem.sampleTests[i];
      parts.push(`### Test #${i + 1}`);
      parts.push(`**Đầu vào (Input):**\n\`\`\`text\n${test.input.trim()}\n\`\`\`\n`);
      parts.push(`**Đầu ra mẫu (Output):**\n\`\`\`text\n${test.output.trim()}\n\`\`\`\n`);
    }
  }

  if (problem.translatedNote || problem.note) {
    parts.push(`## Ghi chú (Note)\n`);
    parts.push(problem.translatedNote || problem.note || '');
    parts.push(`\n`);
  }

  return parts.join('\n');
}

export function generateEnglishMarkdown(problem: Problem): string {
  const parts: string[] = [];

  parts.push(`# ${problem.title}`);
  parts.push(`- **Problem Code**: [${problem.code}](${problem.url})`);
  parts.push(`- **Time Limit**: \`${problem.timeLimit}\``);
  parts.push(`- **Memory Limit**: \`${problem.memoryLimit}\``);
  parts.push(`\n---\n`);

  parts.push(`## Statement\n`);
  parts.push(problem.statement);
  parts.push(`\n`);

  parts.push(`## Input\n`);
  parts.push(problem.inputSpecification);
  parts.push(`\n`);

  parts.push(`## Output\n`);
  parts.push(problem.outputSpecification);
  parts.push(`\n`);

  if (problem.sampleTests.length > 0) {
    parts.push(`## Examples\n`);
    for (let i = 0; i < problem.sampleTests.length; i++) {
      const test = problem.sampleTests[i];
      parts.push(`### Test #${i + 1}`);
      parts.push(`**Input:**\n\`\`\`text\n${test.input.trim()}\n\`\`\`\n`);
      parts.push(`**Output:**\n\`\`\`text\n${test.output.trim()}\n\`\`\`\n`);
    }
  }

  if (problem.note) {
    parts.push(`## Note\n`);
    parts.push(problem.note);
    parts.push(`\n`);
  }

  return parts.join('\n');
}

export function saveProblemMarkdown(
  workspaceRoot: string,
  problem: Problem,
  subDir: string = ''
): { mdViFile: string; mdEnFile: string } {
  const targetDir = subDir && subDir.trim().length > 0
    ? path.join(workspaceRoot, subDir, problem.code)
    : path.join(workspaceRoot, problem.code);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. problem_vi.md
  const mdViFile = path.join(targetDir, 'problem_vi.md');
  fs.writeFileSync(mdViFile, generateVietnameseMarkdown(problem), 'utf8');

  // 2. problem_en.md
  const mdEnFile = path.join(targetDir, 'problem_en.md');
  fs.writeFileSync(mdEnFile, generateEnglishMarkdown(problem), 'utf8');

  return { mdViFile, mdEnFile };
}
