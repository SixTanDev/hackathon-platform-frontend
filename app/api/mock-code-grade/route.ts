import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';

interface MockGradeResponse {
  passed: boolean;
  reason: string;
}

function runPythonGrader(sourceCode: string): Promise<MockGradeResponse> {
  const TIMEOUT_MS = 5000;

  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'mock_code_grader.py');
    const child = spawn('python', [scriptPath], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('TIMEOUT: La ejecucion de la solucion demo tomo mas tiempo de lo permitido (5s).'));
    }, TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
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

    // Proteccion de entorno demo: Limite de 10,000 caracteres para evitar saturacion.
    const MAX_LENGTH = 10000;
    if (sourceCode.length > MAX_LENGTH) {
      return NextResponse.json(
        { 
          passed: false, 
          reason: `El codigo excede el limite de seguridad del entorno demo (${MAX_LENGTH} caracteres).` 
        },
        { status: 200 }
      );
    }

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
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'No se pudo validar el codigo del reto demo.';
    return NextResponse.json(
      {
        passed: false,
        reason: message,
      },
      { status: 200 }
    );
  }
}
