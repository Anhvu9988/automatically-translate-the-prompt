import * as vscode from 'vscode';
import { Problem } from './types';
import { generateVietnameseMarkdown } from './workspaceManager';

export class ProblemViewPanel {
  public static currentPanel: ProblemViewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _problem: Problem;

  public static createOrShow(extensionUri: vscode.Uri, problem: Problem) {
    const column = vscode.window.activeTextEditor
      ? vscode.ViewColumn.Beside
      : vscode.ViewColumn.One;

    if (ProblemViewPanel.currentPanel) {
      ProblemViewPanel.currentPanel._problem = problem;
      ProblemViewPanel.currentPanel._update();
      ProblemViewPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'codeforcesProblemView',
      `CF ${problem.code}: ${problem.title}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    ProblemViewPanel.currentPanel = new ProblemViewPanel(panel, problem);
  }

  private constructor(panel: vscode.WebviewPanel, problem: Problem) {
    this._panel = panel;
    this._problem = problem;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'copy':
            vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage('Đã sao chép vào bộ nhớ tạm!');
            break;
          case 'copyMarkdown':
            const md = generateVietnameseMarkdown(this._problem);
            vscode.env.clipboard.writeText(md);
            vscode.window.showInformationMessage('Đã sao chép nội dung Markdown tiếng Việt vào bộ nhớ tạm!');
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    ProblemViewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    this._panel.title = `CF ${this._problem.code}: ${this._problem.title}`;
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview(): string {
    const p = this._problem;
    const viStatement = p.translatedStatement || p.statement;
    const viInput = p.translatedInputSpecification || p.inputSpecification;
    const viOutput = p.translatedOutputSpecification || p.outputSpecification;
    const viNote = p.translatedNote || p.note;

    const sampleTestsHtml = p.sampleTests.map((t, idx) => `
      <div class="test-card">
        <div class="test-header">
          <span>Ví dụ #${idx + 1}</span>
          <button class="copy-btn" onclick="copyText(${idx})">📋 Copy Input</button>
        </div>
        <div class="test-body">
          <div class="test-col">
            <label>Đầu vào (Input):</label>
            <pre id="test-input-${idx}">${escapeHtml(t.input.trim())}</pre>
          </div>
          <div class="test-col">
            <label>Đầu ra mẫu (Output):</label>
            <pre>${escapeHtml(t.output.trim())}</pre>
          </div>
        </div>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(p.title)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
  <style>
    body {
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: var(--vscode-font-size, 14px);
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      line-height: 1.6;
      padding: 20px 28px;
      margin: 0;
    }
    .header {
      border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.25));
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 1.6em;
      color: var(--vscode-editor-foreground);
    }
    .meta-badges {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      font-size: 0.9em;
      margin-top: 8px;
    }
    .badge {
      background: var(--vscode-badge-background, #3a3d41);
      color: var(--vscode-badge-foreground, #ffffff);
      padding: 3px 8px;
      border-radius: 4px;
    }
    .top-actions {
      margin-left: auto;
      display: flex;
      gap: 10px;
    }
    .btn-action {
      background: var(--vscode-button-secondaryBackground, #3a3d41);
      color: var(--vscode-button-secondaryForeground, #ffffff);
      border: none;
      padding: 5px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .btn-action:hover {
      background: var(--vscode-button-secondaryHoverBackground, rgba(128,128,128,0.3));
    }
    .tabs {
      display: flex;
      gap: 8px;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
      margin-bottom: 16px;
    }
    .tab {
      padding: 8px 16px;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      font-weight: 500;
    }
    .tab.active {
      border-bottom-color: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-background, #0e639c);
    }
    .section-title {
      font-size: 1.15em;
      font-weight: bold;
      margin-top: 24px;
      margin-bottom: 8px;
      color: var(--vscode-textPreformat-foreground, #4ec9b0);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .content-box {
      margin-bottom: 20px;
      white-space: pre-wrap;
    }
    .content-box p {
      margin: 8px 0;
    }
    .test-card {
      background: var(--vscode-editorWidget-background, rgba(128,128,128,0.08));
      border: 1px solid var(--vscode-panel-border, rgba(128,128,128,0.2));
      border-radius: 6px;
      margin-bottom: 14px;
      overflow: hidden;
    }
    .test-header {
      background: var(--vscode-editorGroupHeader-tabsBackground, rgba(128,128,128,0.15));
      padding: 6px 12px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .test-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 12px;
    }
    @media (max-width: 600px) {
      .test-body {
        grid-template-columns: 1fr;
      }
    }
    .test-col label {
      display: block;
      font-weight: 500;
      font-size: 0.85em;
      margin-bottom: 4px;
      opacity: 0.8;
    }
    pre {
      background: var(--vscode-textCodeBlock-background, rgba(0,0,0,0.2));
      padding: 8px 10px;
      border-radius: 4px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 0.9em;
      margin: 0;
      overflow-x: auto;
    }
    .copy-btn {
      background: transparent;
      border: 1px solid var(--vscode-button-secondaryBackground, #555);
      color: var(--vscode-editor-foreground);
      padding: 2px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.8em;
    }
    .copy-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, rgba(128,128,128,0.2));
    }
    .katex {
      font-size: 1.05em;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(p.title)}</h1>
    <div class="meta-badges">
      <span class="badge">Mã bài: ${p.code}</span>
      <span class="badge">⏱️ ${p.timeLimit}</span>
      <span class="badge">💾 ${p.memoryLimit}</span>
      <div class="top-actions">
        <button class="btn-action" onclick="vscode.postMessage({ command: 'copyMarkdown' })">
          📋 Sao chép Markdown
        </button>
        <a class="btn-action" href="${p.url}" target="_blank">
          🌐 Xem trên Codeforces ↗
        </a>
      </div>
    </div>
  </div>

  <div class="tabs">
    <div id="tab-vi" class="tab active" onclick="switchLang('vi')">🇻🇳 Tiếng Việt (Bảo toàn toán học)</div>
    <div id="tab-en" class="tab" onclick="switchLang('en')">🇬🇧 Tiếng Anh gốc</div>
  </div>

  <!-- Vietnamese View -->
  <div id="view-vi">
    <div class="section-title">📖 Đề bài</div>
    <div class="content-box math-render">${formatMarkdownContent(viStatement)}</div>

    <div class="section-title">📥 Quy cách Dữ liệu vào (Input)</div>
    <div class="content-box math-render">${formatMarkdownContent(viInput)}</div>

    <div class="section-title">📤 Quy cách Dữ liệu ra (Output)</div>
    <div class="content-box math-render">${formatMarkdownContent(viOutput)}</div>

    <div class="section-title">🧪 Ví dụ mẫu (Sample Tests)</div>
    <div>${sampleTestsHtml}</div>

    ${viNote ? `
      <div class="section-title">💡 Ghi chú (Note)</div>
      <div class="content-box math-render">${formatMarkdownContent(viNote)}</div>
    ` : ''}
  </div>

  <!-- English View -->
  <div id="view-en" style="display: none;">
    <div class="section-title">📖 Statement</div>
    <div class="content-box math-render">${formatMarkdownContent(p.statement)}</div>

    <div class="section-title">📥 Input Specification</div>
    <div class="content-box math-render">${formatMarkdownContent(p.inputSpecification)}</div>

    <div class="section-title">📤 Output Specification</div>
    <div class="content-box math-render">${formatMarkdownContent(p.outputSpecification)}</div>

    <div class="section-title">🧪 Examples</div>
    <div>${sampleTestsHtml}</div>

    ${p.note ? `
      <div class="section-title">💡 Note</div>
      <div class="content-box math-render">${formatMarkdownContent(p.note)}</div>
    ` : ''}
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function switchLang(lang) {
      document.getElementById('view-vi').style.display = lang === 'vi' ? 'block' : 'none';
      document.getElementById('view-en').style.display = lang === 'en' ? 'block' : 'none';
      document.getElementById('tab-vi').className = lang === 'vi' ? 'tab active' : 'tab';
      document.getElementById('tab-en').className = lang === 'en' ? 'tab active' : 'tab';
      renderMath();
    }

    function copyText(idx) {
      const el = document.getElementById('test-input-' + idx);
      if (el) {
        vscode.postMessage({ command: 'copy', text: el.innerText });
      }
    }

    function renderMath() {
      if (typeof renderMathInElement !== 'undefined') {
        renderMathInElement(document.body, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false }
          ],
          throwOnError: false
        });
      }
    }

    window.addEventListener('DOMContentLoaded', () => {
      renderMath();
    });
  </script>
</body>
</html>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdownContent(text: string): string {
  return text
    .split('\n\n')
    .map(p => `<p>${p.trim()}</p>`)
    .join('');
}
