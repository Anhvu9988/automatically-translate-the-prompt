import * as vscode from 'vscode';
import { parseProblemId, fetchProblem } from './fetcher';
import { translateProblem } from './translator';
import { saveProblemMarkdown } from './workspaceManager';
import { ProblemViewPanel } from './webview';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  // Register main translate command
  const translateCmd = vscode.commands.registerCommand('codeforces.translateProblem', () => handleTranslateProblem(context));
  
  // Backward compatibility alias
  const fetchCmd = vscode.commands.registerCommand('codeforces.fetchProblem', () => handleTranslateProblem(context));

  context.subscriptions.push(translateCmd, fetchCmd);

  // Status Bar item
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'codeforces.translateProblem';
  statusBarItem.text = '$(book) CF: Dịch đề bài';
  statusBarItem.tooltip = 'Nhập mã bài Codeforces để tải và tự động dịch sang Tiếng Việt (bảo toàn toán học)';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

export function deactivate() {}

/**
 * Main command: Fetch problem and auto-translate into Vietnamese.
 */
async function handleTranslateProblem(context: vscode.ExtensionContext) {
  const input = await vscode.window.showInputBox({
    prompt: 'Nhập mã bài tập Codeforces (ví dụ: 2044A, 1900B, 4A hoặc đường dẫn bài tập)',
    placeHolder: '2044A hoặc https://codeforces.com/contest/2044/problem/A',
    ignoreFocusOut: true
  });

  if (!input || input.trim().length === 0) {
    return;
  }

  const parsed = parseProblemId(input);
  if (!parsed) {
    vscode.window.showErrorMessage(`Mã bài "${input}" không hợp lệ. Vui lòng nhập định dạng như 2044A, 1900B, 4A hoặc dán URL.`);
    return;
  }

  const config = vscode.workspace.getConfiguration('codeforces');
  const geminiApiKey = config.get<string>('geminiApiKey', '');
  const saveMd = config.get<boolean>('saveMarkdownFiles', true);
  const subDir = config.get<string>('problemsDirectory', 'problems');

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Codeforces: Đang xử lý bài ${parsed.contestId}${parsed.index}`,
      cancellable: false
    },
    async (progress) => {
      try {
        // 1. Fetch
        progress.report({ message: 'Đang tải đề bài từ Codeforces...' });
        const rawProblem = await fetchProblem(parsed.contestId, parsed.index);

        // 2. Translate with math protection
        progress.report({ message: 'Đang dịch đề sang tiếng Việt (giữ nguyên công thức toán)...' });
        const translatedProblem = await translateProblem(rawProblem, geminiApiKey);

        // 3. Save markdown to workspace if opened and configured
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (saveMd && workspaceFolders && workspaceFolders.length > 0) {
          progress.report({ message: 'Đang lưu tệp đề bài Markdown...' });
          const workspaceRoot = workspaceFolders[0].uri.fsPath;
          saveProblemMarkdown(workspaceRoot, translatedProblem, subDir);
        }

        // 4. Open Webview reader
        ProblemViewPanel.createOrShow(context.extensionUri, translatedProblem);

        vscode.window.showInformationMessage(
          `✅ Đã tải và dịch thành công bài ${translatedProblem.code}: ${translatedProblem.title}!`
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(`Lỗi: ${err.message || err}`);
      }
    }
  );
}
