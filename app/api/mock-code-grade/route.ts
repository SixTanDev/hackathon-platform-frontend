import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';

interface MockGradeResponse {
  passed: boolean;
  reason: string;
}

function runPythonGrader(sourceCode: string): Promise<MockGradeResponse> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'mock_code_grader.py');
    const child = spawn('python', [scriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', reject);

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python grader exited with code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout) as MockGradeResponse);
      } catch (error) {
        reject(error);
      }
    });

    child.stdin.write(JSON.stringify({ source_code: sourceCode }));
    child.stdin.end();
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sourceCode = String(body?.source_code ?? '');

    if (!sourceCode.trim()) {
      return NextResponse.json(
        { passed: false, reason: 'No escribiste una solucion todavia.' },
        { status: 200 }
      );
    }

    const result = await runPythonGrader(sourceCode);
    return NextResponse.json(result);
  } catch (error) {
    console.error('mock-code-grade error', error);
    return NextResponse.json(
      {
        passed: false,
        reason: 'No se pudo validar el codigo del reto demo.',
      },
      { status: 500 }
    );
  }
}
